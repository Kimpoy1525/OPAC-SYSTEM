import json

from django.test import TestCase
from django.urls import reverse

from .models import TitleReservation, User


class TitleReservationWorkflowTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username="student", role=User.Role.USER)
        self.superadmin = User.objects.create_user(username="superadmin", role=User.Role.SUPERADMIN)
        self.admin = User.objects.create_user(username="admin", role=User.Role.ADMIN)

    def submit(self, number=1):
        return self.client.post(
            reverse("student_reservations"),
            data=json.dumps({
                "title": f"Proposal {number}",
                "overview": "A detailed proposal overview",
                "group_members": "Student One, Student Two",
                "course": "BSIT",
                "section": "4Y1-1",
            }),
            content_type="application/json",
        )

    def test_student_can_submit_and_read_own_reservation(self):
        self.client.force_login(self.student)
        response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(TitleReservation.objects.count(), 1)

        response = self.client.get(reverse("student_reservations"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["reservations"]), 1)

    def test_student_cannot_submit_more_than_three_reservations(self):
        self.client.force_login(self.student)
        for number in range(1, 4):
            self.assertEqual(self.submit(number).status_code, 201)
        self.assertEqual(self.submit(4).status_code, 400)

    def test_only_superadmin_can_access_queue_and_review(self):
        reservation = TitleReservation.objects.create(
            student=self.student,
            title="Proposal",
            overview="Overview",
            group_members="Student One",
            course="BSCS",
            section="4Y1-1",
        )

        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse("approval_queue")).status_code, 403)

        self.client.force_login(self.superadmin)
        self.assertEqual(self.client.get(reverse("approval_queue")).status_code, 200)
        response = self.client.patch(
            reverse("review_reservation", args=[reservation.id]),
            data=json.dumps({"status": "APPROVED"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, TitleReservation.Status.APPROVED)
        self.assertEqual(reservation.reviewed_by, self.superadmin)

# Create your tests here.
