from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator, FileExtensionValidator
from datetime import date

class Document(models.Model):
    # This automatically gets the current year (e.g., 2026)
    current_year = date.today().year

    COURSE_CHOICES = [
        ('BSCS', 'BSCS'),
        ('BSIT', 'BSIT'),
        ('BSEMC', 'BSEMC'),
    ]

    title = models.CharField(max_length=255)
    authors = models.CharField(max_length=500)
    
    # 2019 - Present restriction
    year = models.IntegerField(
        validators=[
            MinValueValidator(2019), 
            MaxValueValidator(current_year)
        ],
        help_text="Enter a year between 2019 and the current year."
    )
    
    abstract = models.TextField()
    
    # NEW: Keywords field to store tags (e.g., "AI, React, Database")
    keywords = models.CharField(
        max_length=500, 
        blank=True, 
        null=True, 
        help_text="Enter comma-separated keywords."
    )
    
    panelists = models.CharField(max_length=500)
    
    # Restricted to 5 for the button choices
    course = models.CharField(max_length=5, choices=COURSE_CHOICES)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# NEW MODEL: To handle multiple document uploads per research title
class ResearchFile(models.Model):
    document = models.ForeignKey(
        Document, 
        related_name='files', 
        on_delete=models.CASCADE
    )
    
    # Restricts uploads to PDF and Word documents as requested
    file = models.FileField(
        upload_to='research_files/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'doc'])],
        help_text="Upload research documents (PDF, DOCX, DOC)."
    )
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File for {self.document.title}"