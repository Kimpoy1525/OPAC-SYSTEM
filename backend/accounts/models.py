from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Django needs this to handle sessions and the Admin panel.
    We will add your 3 roles here.
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