from django.core.management.base import BaseCommand
from accounts.models import TitleReservation


class Command(BaseCommand):
    help = "Deletes ALL title reservations submitted by students. Does NOT touch users, logs, or documents."

    def handle(self, *args, **options):
        count = TitleReservation.objects.count()
        TitleReservation.objects.all().delete()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {count} title reservation(s). All student attempt limits are now reset.")
        )