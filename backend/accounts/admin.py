from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
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
    readonly_fields = ('user', 'title', 'edited_at', 'formatted_changes')

    def has_add_permission(self, request): return False

    @admin.display(description="Changes")
    def formatted_changes(self, obj):
        """Render the changes JSON as a readable Field: Old → New table."""
        if not obj.changes:
            return format_html("<em>No changes recorded</em>")

        rows = []
        for change in obj.changes:
            field = change.get("field", "?")
            old = change.get("old", "")
            new = change.get("new", "")
            rows.append(
                format_html(
                    "<tr><td><strong>{}</strong></td><td>{}</td><td>→</td><td>{}</td></tr>",
                    field,
                    old,
                    new,
                )
            )

        return format_html(
            "<table style='border-collapse: collapse; width: 100%;'>"
            "<thead><tr style='border-bottom: 2px solid #ccc;'>"
            "<th style='padding: 6px; text-align: left;'>Field</th>"
            "<th style='padding: 6px; text-align: left;'>Old</th>"
            "<th style='padding: 6px;'></th>"
            "<th style='padding: 6px; text-align: left;'>New</th>"
            "</tr></thead><tbody>{}</tbody></table>",
            format_html("".join(rows)),
        )

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
