from rest_framework import serializers
from .models import Document, ResearchFile

# 1. First, create a serializer for the files
class ResearchFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchFile
        fields = ['id', 'file', 'uploaded_at']

# 2. Update the main Document serializer
class DocumentSerializer(serializers.ModelSerializer):
    # This matches the 'related_name="files"' we set in models.py
    # This allows React to see the files as an array inside each document object
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
            'files' # Added the files array here
        ]