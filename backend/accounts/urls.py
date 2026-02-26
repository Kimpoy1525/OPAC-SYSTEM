from django.urls import path
from .views import google_login, manual_admin_login

urlpatterns = [
    # Endpoint for Student Google Login
    path('google/', google_login, name='google_login'),
    
    # Endpoint for Manual Admin/Superadmin Login
    path('admin-login/', manual_admin_login, name='admin_login'),
]