import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_remove_document_file_document_keywords_researchfile"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="video",
            field=models.FileField(
                blank=True,
                help_text="Optional thesis presentation or demonstration video (MP4, WebM, MOV).",
                null=True,
                upload_to="research_videos/",
                validators=[django.core.validators.FileExtensionValidator(allowed_extensions=["mp4", "webm", "mov"])],
            ),
        ),
    ]
