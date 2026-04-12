from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, AccessLog, DownloadLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Fieldsets for editing existing users
    fieldsets = UserAdmin.fieldsets + (
        ("System Permissions", {"fields": ("role", "picture")}),
    )
    
    # Fieldsets for creating new users
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("System Permissions", {"fields": ("role", "picture")}),
    )

    list_display = ("username", "email", "role", "is_staff", "is_superuser")
    list_editable = ("role",) # Allows changing roles directly from the list view
    list_filter = ("role", "is_staff", "is_superuser")

@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_time', 'ip_address')
    list_filter = ('login_time', 'user')
    readonly_fields = ('user', 'login_time', 'ip_address')

    def has_add_permission(self, request): return False # Prevents manual log creation

@admin.register(DownloadLog)
class DownloadLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'file_name', 'downloaded_at')
    list_filter = ('downloaded_at', 'user')
    readonly_fields = ('user', 'file_name', 'downloaded_at')

    def has_add_permission(self, request): return False
    
from .models import UploadLog # Add to your existing imports

@admin.register(UploadLog)
class UploadLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'uploaded_at')
    list_filter = ('uploaded_at', 'user')
    readonly_fields = ('user', 'title', 'uploaded_at')

    def has_add_permission(self, request): return False