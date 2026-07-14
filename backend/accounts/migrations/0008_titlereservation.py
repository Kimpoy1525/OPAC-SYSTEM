from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_alter_user_role"),
    ]

    operations = [
        migrations.CreateModel(
            name="TitleReservation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("overview", models.TextField()),
                ("group_members", models.TextField()),
                ("status", models.CharField(choices=[("PENDING", "Pending Review"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")], default="PENDING", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_title_reservations", to=settings.AUTH_USER_MODEL)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="title_reservations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
