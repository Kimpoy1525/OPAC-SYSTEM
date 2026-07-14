import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import login, authenticate, get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests
from django.utils import timezone
from .models import AccessLog, TitleReservation

# Get our Custom User model
User = get_user_model()

GOOGLE_CLIENT_ID = "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com"
ALLOWED_STUDENT_DOMAIN = "@student.fatima.edu.ph"
ALLOWED_TEACHER_DOMAIN = "@fatima.edu.ph"

# Optimized for Railway/Cloud Proxies
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# --- GOOGLE LOGIN (For Students/Viewers) ---
@csrf_exempt
def google_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        token = data.get("token")
        
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
            return JsonResponse({"error": "Email not verified"}, status=403)

        # Determine role based on email domain
        email_lower = email.lower()
        if email_lower.endswith(ALLOWED_STUDENT_DOMAIN):
            assigned_role = User.Role.USER
        elif email_lower.endswith(ALLOWED_TEACHER_DOMAIN) and not email_lower.endswith(ALLOWED_STUDENT_DOMAIN):
            assigned_role = User.Role.TEACHER
        else:
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

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=401)


# --- MANUAL LOGIN (For Admins) ---
@csrf_exempt
def manual_admin_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")

        user = authenticate(username=username, password=password)

        if user is not None:
            # Check for Admin or Superadmin role
            if user.role in [User.Role.ADMIN, User.Role.SUPERADMIN]:
                login(request, user)

                # --- LOG THE ACCESS ---
                AccessLog.objects.create(user=user, ip_address=get_client_ip(request))

                return JsonResponse({
                    "message": "Admin login successful",
                    "user": {
                        "username": user.username,
                        "email": user.email,
                        "role": user.role
                    }
                })
            return JsonResponse({"error": "Access denied: User is not an admin"}, status=403)
        
        return JsonResponse({"error": "Invalid username or password"}, status=401)

    except Exception as e:
        return JsonResponse({"error": "Server error"}, status=500)


def _reservation_json(reservation):
    student_name = reservation.student.get_full_name() or reservation.student.username
    return {
        "id": reservation.id,
        "student_id": reservation.student_id,
        "student_name": student_name,
        "student_email": reservation.student.email,
        "title": reservation.title,
        "overview": reservation.overview,
        "group_members": reservation.group_members,
        "course": reservation.course,
        "course_label": reservation.get_course_display(),
        "section": reservation.section,
        "status": reservation.status,
        "status_label": reservation.get_status_display(),
        "created_at": reservation.created_at.isoformat(),
        "reviewed_at": reservation.reviewed_at.isoformat() if reservation.reviewed_at else None,
    }


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

    if request.user.title_reservations.count() >= 3:
        return JsonResponse({"error": "All three title reservation attempts have been used"}, status=400)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    title = str(data.get("title", "")).strip()
    overview = str(data.get("overview", "")).strip()
    group_members = str(data.get("group_members", "")).strip()
    course = str(data.get("course", "")).strip().upper()
    section = str(data.get("section", "")).strip()
    if not all([title, overview, group_members, course, section]):
        return JsonResponse({"error": "All proposal fields are required"}, status=400)
    if course not in TitleReservation.Course.values:
        return JsonResponse({"error": "Select a valid course"}, status=400)

    reservation = TitleReservation.objects.create(
        student=request.user,
        title=title,
        overview=overview,
        group_members=group_members,
        course=course,
        section=section,
    )
    return JsonResponse({"reservation": _reservation_json(reservation)}, status=201)


@csrf_exempt
def approval_queue(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    if request.user.role != User.Role.SUPERADMIN:
        return JsonResponse({"error": "Superadmin access required"}, status=403)
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
    if request.user.role != User.Role.SUPERADMIN:
        return JsonResponse({"error": "Superadmin access required"}, status=403)
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
