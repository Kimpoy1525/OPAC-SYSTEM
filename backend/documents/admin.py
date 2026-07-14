from django.contrib import admin
from .models import Document, ResearchFile

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'authors', 'year', 'course', 'has_video', 'uploaded_at']
    list_filter = ['year', 'course']
    search_fields = ['title', 'authors', 'keywords']

    @admin.display(boolean=True, description='Video')
    def has_video(self, obj):
        return bool(obj.video)

@admin.register(ResearchFile)
class ResearchFileAdmin(admin.ModelAdmin):
    list_display = ['document', 'file', 'uploaded_at']
