from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status, generics
from django.db.models import Q
from django.conf import settings 
from django.http import FileResponse, Http404 
from django.shortcuts import get_object_or_404 
from .models import Document, ResearchFile
from .serializers import DocumentSerializer
from accounts.models import DownloadLog, UploadLog # Added UploadLog here
import json
import os 

# 1. Handles the initial upload of a paper
class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = DocumentSerializer(data=request.data)
        if serializer.is_valid():
            document = serializer.save()
            
            # --- NEW: LOG THE UPLOAD EVENT ---
            if request.user.is_authenticated:
                UploadLog.objects.create(
                    user=request.user,
                    title=document.title
                )
            
            # Extract the list of documents from the 'files' key
            files_data = request.FILES.getlist('files')
            
            # Create a ResearchFile entry for each uploaded file
            for file in files_data:
                ResearchFile.objects.create(document=document, file=file)
            
            return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 2. Handles listing all papers and searching
class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = Document.objects.all().order_by('-uploaded_at')
        year = self.request.query_params.get('year')
        course = self.request.query_params.get('course')
        search_query = self.request.query_params.get('search')

        if year:
            queryset = queryset.filter(year=year)
        if course:
            queryset = queryset.filter(course=course)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(authors__icontains=search_query) |
                Q(keywords__icontains=search_query)
            )
        return queryset

# 3. Handles viewing the details of a single paper
class DocumentDetailView(generics.RetrieveAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'id'

# 4. Handles the Edit Popup
class DocumentUpdateView(generics.UpdateAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'id'
    parser_classes = (MultiPartParser, FormParser)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            document = serializer.save()
            delete_ids_raw = request.data.get('delete_files')
            if delete_ids_raw:
                try:
                    id_list = json.loads(delete_ids_raw)
                    ResearchFile.objects.filter(id__in=id_list, document=document).delete()
                except (ValueError, TypeError) as e:
                    print(f"Deletion error: {e}")

            new_files = request.FILES.getlist('new_files')
            for file_data in new_files:
                ResearchFile.objects.create(document=document, file=file_data)

            return Response(DocumentSerializer(document).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 5. Handles deleting the entire research document
class DocumentDeleteView(generics.DestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'id'

# --- THE DOWNLOAD LOGIC ---
class FileDownloadView(APIView):
    def get(self, request, file_id):
        research_file = get_object_or_404(ResearchFile, id=file_id)
        
        if request.user.is_authenticated:
            DownloadLog.objects.create(
                user=request.user,
                file_name=os.path.basename(research_file.file.name)
            )

        # Serve the file directly from the persistent Volume
        # We check the absolute path first, then a joined path as a backup
        file_path = research_file.file.path
        
        if not os.path.exists(file_path):
             # Backup: Try joining BASE_DIR/media/ + file name
             file_path = os.path.join(settings.MEDIA_ROOT, research_file.file.name)

        if os.path.exists(file_path):
            return FileResponse(open(file_path, 'rb'), as_attachment=True)
        else:
            raise Http404(f"File not found at: {file_path}")