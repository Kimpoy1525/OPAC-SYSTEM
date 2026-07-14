from rest_framework import serializers
from .models import Document, ResearchFile

class ResearchFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchFile
        fields = ['id', 'file', 'uploaded_at']

class DocumentSerializer(serializers.ModelSerializer):
    # files is read_only because the DocumentUpdateView handles file creation/deletion manually
    files = ResearchFileSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 
            'title', 
            'authors', 
            'year', 
            'abstract', 
            'keywords', 
            'panelists', 
            'course', 
            'uploaded_at', 
            'video_demo_url',
            'files'
        ]
        
        # This makes sure the update won't fail if these fields are temporarily blank 
        # while keeping the data types correct.
        extra_kwargs = {
            'keywords': {'required': False, 'allow_blank': True, 'allow_null': True},
            'panelists': {'required': False, 'allow_blank': True},
            'video_demo_url': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def validate_video_demo_url(self, value):
        if not value:
            return value
        from urllib.parse import urlparse
        hostname = (urlparse(value).hostname or '').lower()
        allowed_hosts = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'}
        if hostname not in allowed_hosts:
            raise serializers.ValidationError("Enter a valid YouTube or youtu.be link.")
        return value
