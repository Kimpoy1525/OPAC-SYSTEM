from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0004_replace_video_with_demo_url"),
    ]

    operations = [
        migrations.AlterField(
            model_name="document",
            name="video_demo_url",
            field=models.URLField(
                "Thesis Video Demo Link",
                blank=True,
                help_text="Optional unlisted YouTube link for the thesis video demonstration.",
                max_length=500,
                null=True,
            ),
        ),
    ]
