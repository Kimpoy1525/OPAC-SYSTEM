from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    """
    Custom User model with 3 distinct roles.
    """
    class Role(models.TextChoices):
        SUPERADMIN = "SUPERADMIN", "Superadmin"
        ADMIN = "ADMIN", "Admin"
        USER = "USER", "User"

    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.USER
    )
    picture = models.URLField(max_length=500, null=True, blank=True)

class InstituteAccount(models.Model):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.email

# --- ACTIVITY LOGGING MODELS ---

class AccessLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    login_time = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Access Logs"
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.user.username} - {self.login_time}"

class DownloadLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    downloaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Download Logs"
        ordering = ['-downloaded_at']

    def __str__(self):
        return f"{self.user.username} downloaded {self.file_name}"
    
class UploadLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255) # The title of the research paper
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Upload Logs"
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.username} uploaded '{self.title}'"

class EditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255) # The title of the research paper that was edited
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Edit Logs"
        ordering = ['-edited_at']

    def __str__(self):
        return f"{self.user.username} edited '{self.title}'"

class DeleteLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255) # The title of the research paper that was deleted
    deleted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Delete Logs"
        ordering = ['-deleted_at']

    def __str__(self):
        return f"{self.user.username} deleted '{self.title}'"
