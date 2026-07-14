from django.urls import path
from .views import (
    approval_queue,
    google_login,
    manual_admin_login,
    review_reservation,
    secure_logout,
    student_reservations,
)

urlpatterns = [
    # Endpoint for Student Google Login
    path('google/', google_login, name='google_login'),
    
    # Endpoint for Manual Admin/Superadmin Login
    path('admin-login/', manual_admin_login, name='admin_login'),
    path('logout/', secure_logout, name='secure_logout'),
    path('reservations/', student_reservations, name='student_reservations'),
    path('reservations/approval-queue/', approval_queue, name='approval_queue'),
    path('reservations/<int:reservation_id>/review/', review_reservation, name='review_reservation'),
]
