import json
import re
import secrets
import pyotp
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.conf import settings
from django.core.cache import cache
from google.oauth2 import id_token
from google.auth.transport import requests
from django.utils import timezone
from .models import AccessLog, TitleReservation, TwoFactorDevice
from .totp import (
    build_otpauth_url,
    decrypt_secret,
    encrypt_secret,
    generate_backup_codes,
    hash_code,
    render_qr_svg,
    verify_and_consume_backup_code,
)

# Get our Custom User model
User = get_user_model()

GOOGLE_CLIENT_ID = "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com"
ALLOWED_STUDENT_DOMAIN = "@student.fatima.edu.ph"
ALLOWED_TEACHER_DOMAIN = "@fatima.edu.ph"
LOGIN_ATTEMPT_LIMIT = 5
LOGIN_LOCKOUT_SECONDS = 15 * 60
MAX_TITLE_ATTEMPTS = 3

# Optimized for Railway/Cloud Proxies
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def _login_rate_key(request, login_type):
    return f"login-attempts:{login_type}:{get_client_ip(request)}"


def _is_rate_limited(request, login_type):
    return cache.get(_login_rate_key(request, login_type), 0) >= LOGIN_ATTEMPT_LIMIT


def _record_failed_login(request, login_type):
    key = _login_rate_key(request, login_type)
    attempts = cache.get(key, 0) + 1
    cache.set(key, attempts, LOGIN_LOCKOUT_SECONDS)


def _clear_failed_logins(request, login_type):
    cache.delete(_login_rate_key(request, login_type))


def _origin_is_allowed(request):
    origin = request.headers.get("Origin")
    return not origin or origin in settings.CORS_ALLOWED_ORIGINS


def _rate_limit_response():
    response = JsonResponse(
        {"error": "Too many login attempts. Please try again in 15 minutes."},
        status=429,
    )
    response["Retry-After"] = str(LOGIN_LOCKOUT_SECONDS)
    return response

# --- GOOGLE LOGIN (For Students/Viewers) ---
@csrf_exempt
def google_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "google"):
        return _rate_limit_response()

    try:
        data = json.loads(request.body)
        token = str(data.get("token", ""))
        if not token or len(token) > 10000:
            _record_failed_login(request, "google")
            return JsonResponse({"error": "Invalid sign-in request"}, status=400)
        
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo.get("email")
        email_verified = idinfo.get("email_verified")
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        picture = idinfo.get("picture", "")

        if not email_verified:
            _record_failed_login(request, "google")
            return JsonResponse({"error": "Email not verified"}, status=403)

        # Determine role based on email domain
        email_lower = email.lower()
        if email_lower.endswith(ALLOWED_STUDENT_DOMAIN):
            assigned_role = User.Role.USER
        elif email_lower.endswith(ALLOWED_TEACHER_DOMAIN) and not email_lower.endswith(ALLOWED_STUDENT_DOMAIN):
            assigned_role = User.Role.TEACHER
        else:
            _record_failed_login(request, "google")
            return JsonResponse({"error": "Use your institute Google account"}, status=403)

        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": assigned_role,
                "picture": picture,
            }
        )

        if not created:
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.picture = picture or user.picture 
            user.save()

        login(request, user)
        request.session.cycle_key()
        _clear_failed_logins(request, "google")

        # --- LOG THE ACCESS ---
        AccessLog.objects.create(user=user, ip_address=get_client_ip(request))

        return JsonResponse({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "role": user.role,
                "picture": user.picture,
            }
        })

    except (json.JSONDecodeError, ValueError):
        _record_failed_login(request, "google")
        return JsonResponse({"error": "Google sign-in could not be verified"}, status=401)
    except Exception:
        _record_failed_login(request, "google")
        return JsonResponse({"error": "Sign-in is temporarily unavailable"}, status=503)


# --- MANUAL LOGIN (For Admins) ---
@csrf_exempt
def manual_admin_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "admin"):
        return _rate_limit_response()

    try:
        data = json.loads(request.body)
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        if not username or not password or len(username) > 150 or len(password) > 256:
            _record_failed_login(request, "admin")
            return JsonResponse({"error": "Invalid username or password"}, status=401)

        user = authenticate(username=username, password=password)

        if user is not None:
            # Check for Content Manager or Superadmin role
            if user.role in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
                # Portal login is two-factor: the password above is step 1.
                # Step 2 is the authenticator code; first-time users are sent
                # through enrollment instead (no paired device yet).
                _clear_failed_logins(request, "admin")
                if has_usable_device(user):
                    return JsonResponse({
                        "requires_2fa": True,
                        "tmp_token": _issue_pending("2fa", user),
                    })
                return JsonResponse({
                    "requires_setup": True,
                    "tmp_token": _issue_pending("setup", user),
                })
            _record_failed_login(request, "admin")
            return JsonResponse({"error": "Invalid username or password"}, status=401)
        
        _record_failed_login(request, "admin")
        return JsonResponse({"error": "Invalid username or password"}, status=401)

    except (json.JSONDecodeError, TypeError):
        _record_failed_login(request, "admin")
        return JsonResponse({"error": "Invalid username or password"}, status=401)
    except Exception:
        return JsonResponse({"error": "Server error"}, status=500)


@csrf_exempt
def secure_logout(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    logout(request)
    response = JsonResponse({"message": "Logout successful"})
    response["Cache-Control"] = "no-store"
    # Explicitly destroy the session cookie too, so the very next visit MUST
    # sign in again (Google sign-in or content-manager password).
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    return response


@csrf_exempt
def session_status(request):
    """Return the currently authenticated user, or 401 if the session is invalid/expired."""
    if request.method != "GET":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    return JsonResponse({
        "user": {
            "id": request.user.id,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "role": request.user.role,
            "picture": request.user.picture,
        }
    })


def _reservation_json(reservation):
    student_name = reservation.student.get_full_name() or reservation.student.username
    reviewer_name = ""
    if reservation.reviewed_by_id:
        reviewer_name = reservation.reviewed_by.get_full_name() or reservation.reviewed_by.username
    return {
        "id": reservation.id,
        "student_id": reservation.student_id,
        "student_name": student_name,
        "student_email": reservation.student.email,
        "title": reservation.title,
        "overview": reservation.overview,
        "keywords": reservation.keywords,
        "group_members": reservation.group_members,
        "course": reservation.course,
        "course_label": reservation.get_course_display(),
        "section": reservation.section,
        "status": reservation.status,
        "status_label": reservation.get_status_display(),
        "created_at": reservation.created_at.isoformat(),
        "reviewed_at": reservation.reviewed_at.isoformat() if reservation.reviewed_at else None,
        "reviewed_by_name": reviewer_name,
    }


TITLE_STOPWORDS = {"a", "an", "the", "of", "for", "and", "or", "to", "in", "on", "with", "using", "via"}


def _title_words(title):
    """Normalized word set for a title (lowercase, punctuation stripped)."""
    normalized = re.sub(r"[^a-z0-9\s]", " ", (title or "").lower())
    return {word for word in normalized.split() if word and word not in TITLE_STOPWORDS}


def find_similar_title(title):
    """Return a dict describing a duplicate/near-duplicate title, else None.

    Word-by-word comparison against repository documents and title
    reservations (pending + approved; rejected titles may be retried).
    A clash is declared when the normalized word sets are identical, when
    the shared words cover at least 75% of the smaller title, or when the
    Jaccard overlap of distinct words is at least 60%.

    The returned dict carries the matching title and where it lives:
    {"title": ..., "source": "repository" | "pending" | "approved"}.
    """
    from documents.models import Document

    incoming = _title_words(title)
    if not incoming:
        return None
    candidates = [
        (doc.title, "repository")
        for doc in Document.objects.only("title").iterator()
    ]
    candidates += [
        (
            reservation.title,
            "pending" if reservation.status == TitleReservation.Status.PENDING else "approved",
        )
        for reservation in TitleReservation.objects.exclude(
            status=TitleReservation.Status.REJECTED
        ).only("title", "status").iterator()
    ]
    for existing, source in candidates:
        words = _title_words(existing)
        if not words:
            continue
        if words == incoming:
            return {"title": existing, "source": source}
        shared = len(incoming & words)
        containment = shared / min(len(incoming), len(words))
        jaccard = shared / len(incoming | words)
        if containment >= 0.75 or jaccard >= 0.6:
            return {"title": existing, "source": source}
    return None


@csrf_exempt
def student_reservations(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    if request.method == "GET":
        reservations = request.user.title_reservations.select_related("student")
        return JsonResponse({"reservations": [_reservation_json(item) for item in reservations]})

    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    if request.user.role != User.Role.USER:
        return JsonResponse({"error": "Only student accounts can submit proposals"}, status=403)

    existing_reservations = request.user.title_reservations.all()
    # Only PENDING and APPROVED reservations consume an attempt.
    # REJECTED reservations are excluded, effectively refunding that attempt.
    used_attempts = existing_reservations.exclude(
        status=TitleReservation.Status.REJECTED
    ).count()
    if used_attempts >= MAX_TITLE_ATTEMPTS:
        return JsonResponse({
            "error": f"You have used all {MAX_TITLE_ATTEMPTS} title reservation attempts"
        }, status=400)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    title = str(data.get("title", "")).strip()
    overview = str(data.get("overview", "")).strip()
    keywords = str(data.get("keywords", "")).strip()
    group_members = str(data.get("group_members", "")).strip()
    course = str(data.get("course", "")).strip().upper()
    section = str(data.get("section", "")).strip()
    if not all([title, overview, keywords, group_members, course, section]):
        return JsonResponse({"error": "All proposal fields are required"}, status=400)
    if course not in TitleReservation.Course.values:
        return JsonResponse({"error": "Select a valid course"}, status=400)
    members = [member.strip() for member in group_members.split(",") if member.strip()]
    if not members:
        return JsonResponse({"error": "Enter at least one group member"}, status=400)
    if len(members) > 4:
        return JsonResponse({"error": "A group can have a maximum of four members, separated by commas"}, status=400)
    group_members = ", ".join(members)

    # Duplicate protection (TITLE only): word-by-word check against the
    # repository and against pending/approved reservations.
    similar = find_similar_title(title)
    if similar:
        return JsonResponse({
            "error": (
                "This title is too similar to an existing submission: "
                f'"{similar["title"]}". Titles must be original - please '
                "revise your title and submit again."
            ),
            "similar_title": similar["title"],
            "similar_source": similar["source"],
        }, status=409)

    reservation = TitleReservation.objects.create(
        student=request.user,
        title=title,
        overview=overview,
        keywords=keywords,
        group_members=group_members,
        course=course,
        section=section,
    )
    return JsonResponse({"reservation": _reservation_json(reservation)}, status=201)


@csrf_exempt
def approval_queue(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    if request.method != "GET":
        return JsonResponse({"error": "Invalid method"}, status=405)

    reservations = TitleReservation.objects.select_related("student").filter(
        status=TitleReservation.Status.PENDING
    )
    return JsonResponse({"reservations": [_reservation_json(item) for item in reservations]})


@csrf_exempt
def review_reservation(request, reservation_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    if request.method != "PATCH":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        status = str(data.get("status", "")).upper()
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if status not in [TitleReservation.Status.APPROVED, TitleReservation.Status.REJECTED]:
        return JsonResponse({"error": "Status must be APPROVED or REJECTED"}, status=400)

    try:
        reservation = TitleReservation.objects.select_related("student").get(pk=reservation_id)
    except TitleReservation.DoesNotExist:
        return JsonResponse({"error": "Reservation not found"}, status=404)

    reservation.status = status
    reservation.reviewed_by = request.user
    reservation.reviewed_at = timezone.now()
    reservation.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    return JsonResponse({"reservation": _reservation_json(reservation)})


@csrf_exempt
def reservation_history(request):
    """Admin-only endpoint returning ALL submissions (pending, approved, rejected)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    if request.method != "GET":
        return JsonResponse({"error": "Invalid method"}, status=405)

    reservations = TitleReservation.objects.select_related("student", "reviewed_by")
    return JsonResponse({
        "reservations": [_reservation_json(item) for item in reservations],
        "total": reservations.count(),
    })

# --- TWO-FACTOR AUTHENTICATION (portal accounts only) ---
# Login becomes: password (step 1) -> authenticator code (step 2).
# First-time users are forced through enrollment (QR pairing) before entry.
PENDING_TTL_SECONDS = 300
TOTP_DEVICE_LIMIT = 3


def _issue_pending(kind, user):
    token = secrets.token_urlsafe(32)
    cache.set(f"2fa-pending:{token}", {"kind": kind, "user_id": user.id}, PENDING_TTL_SECONDS)
    return token


def _peek_pending(token, kind):
    data = cache.get(f"2fa-pending:{token}") if token else None
    if not data or data.get("kind") != kind:
        return None
    return data


def _finalize_portal_login(request, user):
    """Create the real session (used by 2FA verify / enrollment confirm)."""
    login(request, user)
    request.session.cycle_key()
    AccessLog.objects.create(user=user, ip_address=get_client_ip(request))
    return {"username": user.username, "email": user.email, "role": user.role}


def _verify_code(user, code):
    """Verify a 6-digit TOTP code from ANY paired device, or a backup code."""
    normalized = (code or "").strip()
    if len(normalized) == 6 and normalized.isdigit():
        for device in user.totp_devices.all():
            try:
                secret = decrypt_secret(device.secret)
            except Exception:
                continue
            if pyotp.TOTP(secret).verify(normalized, valid_window=1):
                return True
        return False
    return verify_and_consume_backup_code(user, normalized)


def has_usable_device(user):
    """True when at least one paired device has a decryptable secret.

    Secrets encrypted under a different encryption key (for example when
    SECRET_KEY differed between environments) cannot be read; accounts in
    that state are sent through re-enrollment instead of looping on
    'invalid code'.
    """
    for device in user.totp_devices.all():
        try:
            decrypt_secret(device.secret)
            return True
        except Exception:
            continue
    return False


def _portal_role_required(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    return None


@csrf_exempt
def two_factor_setup(request):
    """Enrollment step 1: return a fresh QR/secret for the login-time setup."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    try:
        data = json.loads(request.body)
        tmp_token = str(data.get("tmp_token", ""))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    pending = _peek_pending(tmp_token, "setup")
    if not pending:
        return JsonResponse({"error": "Setup session expired. Please log in again."}, status=401)
    user = User.objects.filter(pk=pending["user_id"]).first()
    if not user:
        return JsonResponse({"error": "Account not found"}, status=404)
    secret = pyotp.random_base32()
    cache.set(f"2fa-setup:{tmp_token}", {"secret": secret}, PENDING_TTL_SECONDS)
    otpauth_url = build_otpauth_url(secret, user.email or user.username)
    return JsonResponse({
        "qr_svg": render_qr_svg(otpauth_url),
        "secret": secret,
        "default_name": "My phone",
    })


@csrf_exempt
def two_factor_confirm(request):
    """Enrollment step 2: verify first code, create device, issue backup codes, log in."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        tmp_token = str(data.get("tmp_token", ""))
        code = str(data.get("code", "")).strip()
        device_name = str(data.get("device_name", "")).strip()[:50] or "My phone"
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    pending = _peek_pending(tmp_token, "setup")
    setup = cache.get(f"2fa-setup:{tmp_token}") if pending else None
    if not pending or not setup:
        return JsonResponse({"error": "Setup session expired. Please log in again."}, status=401)
    user = User.objects.filter(pk=pending["user_id"]).first()
    if not user:
        return JsonResponse({"error": "Account not found"}, status=404)
    valid = len(code) == 6 and code.isdigit() and pyotp.TOTP(setup["secret"]).verify(code, valid_window=1)
    if not valid:
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid code. Please try again."}, status=401)
    # Remove stale devices whose secrets can no longer be decrypted (for
    # example, encrypted under an older encryption key) so re-enrollment
    # starts from a clean slate and never counts toward the device limit.
    for device in user.totp_devices.all():
        try:
            decrypt_secret(device.secret)
        except Exception:
            device.delete()
    if user.totp_devices.count() >= TOTP_DEVICE_LIMIT:
        return JsonResponse({"error": "Device limit reached."}, status=400)
    TwoFactorDevice.objects.create(user=user, name=device_name, secret=encrypt_secret(setup["secret"]))
    backup_codes = generate_backup_codes()
    user.backup_codes = [hash_code(c) for c in backup_codes]
    user.save(update_fields=["backup_codes"])
    cache.delete(f"2fa-setup:{tmp_token}")
    cache.delete(f"2fa-pending:{tmp_token}")
    _clear_failed_logins(request, "2fa")
    user_json = _finalize_portal_login(request, user)
    return JsonResponse({
        "message": "Two-factor authentication enabled",
        "user": user_json,
        "backup_codes": backup_codes,
    })


@csrf_exempt
def two_factor_verify(request):
    """Login step 2: accept the 6-digit code (or a backup code) for a pending login."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        tmp_token = str(data.get("tmp_token", ""))
        code = str(data.get("code", "")).strip()
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    pending = _peek_pending(tmp_token, "2fa")
    if not pending:
        return JsonResponse({"error": "Verification session expired. Please log in again."}, status=401)
    user = User.objects.filter(pk=pending["user_id"]).first()
    if not user:
        return JsonResponse({"error": "Account not found"}, status=404)
    if not _verify_code(user, code):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid code. Please try again."}, status=401)
    cache.delete(f"2fa-pending:{tmp_token}")
    _clear_failed_logins(request, "2fa")
    user_json = _finalize_portal_login(request, user)
    return JsonResponse({"message": "Login successful", "user": user_json})


@csrf_exempt
def two_factor_status(request):
    """Portal accounts: current 2FA state and the paired-device list."""
    denied = _portal_role_required(request)
    if denied:
        return denied
    if request.method != "GET":
        return JsonResponse({"error": "Invalid method"}, status=405)
    devices = [
        {"id": d.id, "name": d.name, "created_at": d.created_at.isoformat()}
        for d in request.user.totp_devices.all()
    ]
    return JsonResponse({
        "enabled": bool(devices),
        "devices": devices,
        "has_backup_codes": bool(request.user.backup_codes),
    })


@csrf_exempt
def two_factor_add_device(request):
    """Pair an additional authenticator app (password + current code required)."""
    denied = _portal_role_required(request)
    if denied:
        return denied
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        password = str(data.get("password", ""))
        code = str(data.get("code", "")).strip()
        name = str(data.get("name", "")).strip()[:50] or "Authenticator"
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    user = request.user
    if not user.check_password(password):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid password"}, status=401)
    if not _verify_code(user, code):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid code"}, status=401)
    if user.totp_devices.count() >= TOTP_DEVICE_LIMIT:
        return JsonResponse({"error": "You can pair at most 3 authenticator devices."}, status=400)
    secret = pyotp.random_base32()
    device = TwoFactorDevice.objects.create(user=user, name=name, secret=encrypt_secret(secret))
    _clear_failed_logins(request, "2fa")
    otpauth_url = build_otpauth_url(secret, user.email or user.username)
    return JsonResponse({
        "message": "Scan the QR code with your new device",
        "device": {"id": device.id, "name": device.name},
        "qr_svg": render_qr_svg(otpauth_url),
        "secret": secret,
    })


@csrf_exempt
def two_factor_remove_device(request):
    """Remove one paired device (a valid authenticator code is required)."""
    denied = _portal_role_required(request)
    if denied:
        return denied
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        device_id = data.get("device_id")
        code = str(data.get("code", "")).strip()
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    user = request.user
    if not _verify_code(user, code):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid code"}, status=401)
    device = user.totp_devices.filter(pk=device_id).first()
    if not device:
        return JsonResponse({"error": "Device not found"}, status=404)
    device_name = device.name
    device.delete()
    _clear_failed_logins(request, "2fa")
    remaining = user.totp_devices.count()
    if remaining == 0:
        # Last device removed - two-factor protection is now off.
        user.backup_codes = []
        user.save(update_fields=["backup_codes"])
    return JsonResponse({"message": f"Device removed", "remaining": remaining})


@csrf_exempt
def two_factor_disable(request):
    """Turn 2FA off entirely (password + code required)."""
    denied = _portal_role_required(request)
    if denied:
        return denied
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        password = str(data.get("password", ""))
        code = str(data.get("code", "")).strip()
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)
    user = request.user
    if not user.check_password(password):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid password"}, status=401)
    if not _verify_code(user, code):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid code"}, status=401)
    user.totp_devices.all().delete()
    user.backup_codes = []
    user.save(update_fields=["backup_codes"])
    _clear_failed_logins(request, "2fa")
    return JsonResponse({"message": "Two-factor authentication disabled"})


def _end_other_sessions(user, current_key):
    from django.contrib.sessions.models import Session

    for session in Session.objects.filter(expire_date__gte=timezone.now()):
        try:
            data = session.get_decoded()
        except Exception:
            continue
        if str(data.get("_auth_user_id")) == str(user.pk) and session.session_key != current_key:
            session.delete()


@csrf_exempt
def change_password(request):
    """Portal accounts: change password (current password + 2FA code required)."""
    denied = _portal_role_required(request)
    if denied:
        return denied
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    if not _origin_is_allowed(request):
        return JsonResponse({"error": "Request origin is not allowed"}, status=403)
    if _is_rate_limited(request, "2fa"):
        return _rate_limit_response()
    try:
        data = json.loads(request.body)
        current_password = str(data.get("current_password", ""))
        new_password = str(data.get("new_password", ""))
        confirm_password = str(data.get("confirm_password", ""))
        code = str(data.get("code", "")).strip()
        logout_others = bool(data.get("logout_others", False))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid request"}, status=400)

    user = request.user
    if not user.check_password(current_password):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Current password is incorrect"}, status=401)
    # Report new-password format problems before checking the 2FA code.
    if len(new_password) < 8:
        return JsonResponse({"error": "New password must be at least 8 characters"}, status=400)
    if new_password != confirm_password:
        return JsonResponse({"error": "New passwords do not match"}, status=400)
    if new_password == current_password:
        return JsonResponse({"error": "New password must differ from the current password"}, status=400)
    if user.totp_devices.exists() and not _verify_code(user, code):
        _record_failed_login(request, "2fa")
        return JsonResponse({"error": "Invalid authenticator code"}, status=401)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    if logout_others:
        _end_other_sessions(user, request.session.session_key)
    _clear_failed_logins(request, "2fa")
    return JsonResponse({
        "message": "Password changed successfully",
        "other_sessions_ended": bool(logout_others),
    })


@csrf_exempt
def delete_reservation(request, reservation_id):
    """Content managers: delete an APPROVED/REJECTED submission (logged)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        reservation = TitleReservation.objects.select_related("student").get(pk=reservation_id)
    except TitleReservation.DoesNotExist:
        return JsonResponse({"error": "Submission not found"}, status=404)

    if reservation.status not in [TitleReservation.Status.APPROVED, TitleReservation.Status.REJECTED]:
        return JsonResponse({
            "error": "Only approved or rejected submissions can be deleted from the history"
        }, status=400)

    reservation.delete()
    return JsonResponse({"message": "Submission deleted", "deleted_id": reservation_id})


@csrf_exempt
def clear_reviewed_reservations(request):
    """Content managers: permanently delete ALL approved + rejected submissions."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role not in [User.Role.CONTENT_MANAGER, User.Role.SUPERADMIN]:
        return JsonResponse({"error": "Content Manager access required"}, status=403)
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    deleted_count, _details = TitleReservation.objects.filter(
        status__in=[TitleReservation.Status.APPROVED, TitleReservation.Status.REJECTED]
    ).delete()
    return JsonResponse({
        "message": f"Deleted {deleted_count} reviewed submission(s)",
        "deleted": deleted_count,
    })
