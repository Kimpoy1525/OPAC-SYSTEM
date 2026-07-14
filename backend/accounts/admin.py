from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, AccessLog, DownloadLog, TitleReservation

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
    
from .models import UploadLog, EditLog, DeleteLog # Add to your existing imports

@admin.register(UploadLog)
class UploadLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'uploaded_at')
    list_filter = ('uploaded_at', 'user')
    readonly_fields = ('user', 'title', 'uploaded_at')

    def has_add_permission(self, request): return False

@admin.register(EditLog)
class EditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'edited_at')
    list_filter = ('edited_at', 'user')
    readonly_fields = ('user', 'title', 'edited_at')

    def has_add_permission(self, request): return False

@admin.register(DeleteLog)
class DeleteLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'deleted_at')
    list_filter = ('deleted_at', 'user')
    readonly_fields = ('user', 'title', 'deleted_at')

    def has_add_permission(self, request): return False


@admin.register(TitleReservation)
class TitleReservationAdmin(admin.ModelAdmin):
    list_display = ('title', 'student', 'course', 'section', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status', 'course', 'section', 'created_at')
    search_fields = ('title', 'student__username', 'student__email', 'group_members')
    readonly_fields = ('student', 'title', 'overview', 'group_members', 'course', 'section', 'created_at')
