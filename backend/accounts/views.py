import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, authenticate, get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests

# Get our Custom User model
User = get_user_model()

GOOGLE_CLIENT_ID = "937933959495-68b9nk1vdsvitocjj4hpco107esdovlq.apps.googleusercontent.com"
ALLOWED_DOMAIN = "@student.fatima.edu.ph"

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

        if not email.lower().endswith(ALLOWED_DOMAIN):
            return JsonResponse({"error": "Use your institute Google account"}, status=403)

        # Ensure Google sign-ups are ALWAYS created with the USER role
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": User.Role.USER ,
                "picture": picture,
            }
        )

        if not created:
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.picture = picture or user.picture # This ensures picture is updated
            user.save()

        login(request, user)

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


# --- MANUAL LOGIN (For Admins created via terminal/database) ---
@csrf_exempt
def manual_admin_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")

        # authenticate checks the username and HASHED password in PostgreSQL
        user = authenticate(username=username, password=password)

        if user is not None:
            # Check if they have the Admin or Superadmin role
            if user.role in [User.Role.ADMIN, User.Role.SUPERADMIN]:
                login(request, user)
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
    
    