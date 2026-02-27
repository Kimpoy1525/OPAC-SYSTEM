from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework import generics
from django.db.models import Q
from .models import Document, ResearchFile # Added ResearchFile
from .serializers import DocumentSerializer

class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = DocumentSerializer(data=request.data)
        if serializer.is_valid():
            # 1. Save the main Document (Title, Authors, Year, Keywords, etc.)
            document = serializer.save()
            
            # 2. Extract the list of documents from the 'files' key
            files_data = request.FILES.getlist('files')
            
            # 3. Create a ResearchFile entry for each uploaded file (PDF, DOCX, DOC)
            for file in files_data:
                ResearchFile.objects.create(document=document, file=file)
            
            # Re-serialize to include the newly created nested files in the response
            return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
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

        # 4. Updated Search Logic: Now searches Title, Authors, AND Keywords
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(authors__icontains=search_query) |
                Q(keywords__icontains=search_query) # Search through keywords too
            )
            
        return queryset

class DocumentDetailView(generics.RetrieveAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'id'