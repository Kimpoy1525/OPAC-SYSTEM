from django.urls import path
from .views import (
    approval_queue,
    google_login,
    manual_admin_login,
    reservation_history,
    review_reservation,
    secure_logout,
    session_status,
    student_reservations,
    change_password,
    two_factor_add_device,
    two_factor_confirm,
    two_factor_disable,
    two_factor_remove_device,
    two_factor_setup,
    two_factor_status,
    two_factor_verify,
)

urlpatterns = [
    # Endpoint for Student Google Login
    path('google/', google_login, name='google_login'),
    
    # Endpoint for Manual Admin/Superadmin Login
    path('admin-login/', manual_admin_login, name='admin_login'),
    path('logout/', secure_logout, name='secure_logout'),
    path('session/', session_status, name='session_status'),
    path('change-password/', change_password, name='change_password'),
    path('2fa/status/', two_factor_status, name='two_factor_status'),
    path('2fa/setup/', two_factor_setup, name='two_factor_setup'),
    path('2fa/confirm/', two_factor_confirm, name='two_factor_confirm'),
    path('2fa/verify/', two_factor_verify, name='two_factor_verify'),
    path('2fa/device/add/', two_factor_add_device, name='two_factor_add_device'),
    path('2fa/device/remove/', two_factor_remove_device, name='two_factor_remove_device'),
    path('2fa/disable/', two_factor_disable, name='two_factor_disable'),
    path('reservations/', student_reservations, name='student_reservations'),
    path('reservations/approval-queue/', approval_queue, name='approval_queue'),
    path('reservations/history/', reservation_history, name='reservation_history'),
    path('reservations/<int:reservation_id>/review/', review_reservation, name='review_reservation'),
]
