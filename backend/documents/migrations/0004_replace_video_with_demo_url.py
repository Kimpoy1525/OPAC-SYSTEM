from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_document_video"),
    ]

    operations = [
        migrations.RenameField(
            model_name="document",
            old_name="video",
            new_name="video_demo_url",
        ),
        migrations.AlterField(
            model_name="document",
            name="video_demo_url",
            field=models.URLField(
                blank=True,
                help_text="Optional unlisted YouTube link for the thesis video demonstration.",
                max_length=500,
                null=True,
            ),
        ),
    ]
