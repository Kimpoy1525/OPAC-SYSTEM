from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0008_titlereservation"),
    ]

    operations = [
        migrations.AddField(
            model_name="titlereservation",
            name="course",
            field=models.CharField(
                choices=[
                    ("BSCS", "BS Computer Science"),
                    ("BSIT", "BS Information Technology"),
                    ("BSEMC", "BS Entertainment and Multimedia Computing"),
                ],
                default="BSIT",
                max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="titlereservation",
            name="section",
            field=models.CharField(default="Not specified", max_length=50),
            preserve_default=False,
        ),
    ]
