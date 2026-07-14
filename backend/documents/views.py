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
from accounts.models import DownloadLog, UploadLog, EditLog, DeleteLog # Added all log models here
import json
import os 
import csv
import io
from datetime import date

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
        if search_query:
            search_query = search_query.strip()

        if year:
            queryset = queryset.filter(year=year)
        if course:
            queryset = queryset.filter(course=course)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(authors__icontains=search_query) |
                Q(keywords__icontains=search_query) |
                Q(abstract__icontains=search_query)
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
            
            # --- NEW: LOG THE EDIT EVENT ---
            if request.user.is_authenticated:
                EditLog.objects.create(
                    user=request.user,
                    title=document.title
                )
            
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # --- NEW: LOG THE DELETE EVENT (before deleting so we still have the title) ---
        if request.user.is_authenticated:
            DeleteLog.objects.create(
                user=request.user,
                title=instance.title
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

# --- CSV BULK IMPORT ---
VALID_COURSES = ['BSCS', 'BSIT', 'BSEMC']
CURRENT_YEAR = date.today().year

class DocumentCSVUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        csv_file = request.FILES.get('csv_file')
        if not csv_file:
            return Response({"error": "No CSV file provided"}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({"error": "File must be a CSV"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw = csv_file.read()
            # Try multiple encodings to handle files saved from Excel (Windows-1252), etc.
            decoded = None
            for enc in ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1', 'utf-16']:
                try:
                    decoded = raw.decode(enc)
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue
            if decoded is None:
                return Response({"error": "Could not decode CSV file. Try saving it as UTF-8 in Excel (File → Save As → CSV UTF-8)."}, status=status.HTTP_400_BAD_REQUEST)
            reader = csv.DictReader(io.StringIO(decoded))

            if not reader.fieldnames:
                return Response({"error": "CSV file is empty or has no headers"}, status=status.HTTP_400_BAD_REQUEST)

            # Build column mapping (handles "author" -> "authors", "panelist" -> "panelists")
            column_map = {}
            for header in reader.fieldnames:
                h = header.strip().lower()
                if h in ['author', 'authors']:
                    column_map[header] = 'authors'
                elif h in ['panelist', 'panelists']:
                    column_map[header] = 'panelists'
                elif h == 'title':
                    column_map[header] = 'title'
                elif h == 'year':
                    column_map[header] = 'year'
                elif h == 'abstract':
                    column_map[header] = 'abstract'
                elif h == 'course':
                    column_map[header] = 'course'
                elif h == 'keywords':
                    column_map[header] = 'keywords'

            # Check required columns exist
            required = ['title', 'authors', 'year', 'abstract', 'course', 'panelists']
            found = set(column_map.values())
            missing = [r for r in required if r not in found]
            if missing:
                return Response({
                    "error": f"Missing required columns: {missing}. "
                             f"CSV must have: title, author(s), year, abstract, course, panelist(s)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # --- PHASE 1: Read all rows and collect titles ---
            rows_data = []
            for row_num, row in enumerate(reader, start=2):
                data = {}
                for orig_col, mapped_col in column_map.items():
                    data[mapped_col] = row.get(orig_col, '').strip()
                rows_data.append({"row_num": row_num, "data": data, "title": data.get('title', '')})

            # Check which titles already exist in the database
            csv_titles = [r['title'] for r in rows_data if r['title']]
            existing_titles = set()
            if csv_titles:
                existing_qs = Document.objects.filter(title__in=csv_titles).values_list('title', flat=True)
                existing_titles = set(existing_qs)

            duplicate_titles = [t for t in csv_titles if t in existing_titles]

            # If duplicates found and neither force nor skip_duplicates is set, ask for confirmation
            force = request.data.get('force', '').strip().lower() == 'true'
            skip_duplicates = request.data.get('skip_duplicates', '').strip().lower() == 'true'
            if duplicate_titles and not force and not skip_duplicates:
                return Response({
                    "duplicate_titles": duplicate_titles,
                    "duplicate_count": len(duplicate_titles),
                    "total_rows": len(rows_data),
                    "requires_confirmation": True,
                    "message": f"{len(duplicate_titles)} of {len(rows_data)} titles already exist in the database."
                }, status=status.HTTP_200_OK)

            # If skip_duplicates is set, filter out rows with titles that already exist
            rows_to_process = rows_data
            if skip_duplicates and duplicate_titles:
                duplicate_set = set(duplicate_titles)
                rows_to_process = [r for r in rows_data if r['title'] not in duplicate_set]

            # --- PHASE 3: Insert rows ---
            results = []
            success_count = 0
            error_count = 0
            skipped_count = len(rows_data) - len(rows_to_process) if (skip_duplicates and duplicate_titles) else 0

            for entry in rows_to_process:
                row_num = entry['row_num']
                data = entry['data']
                title = entry['title']

                errors = []
                if not data.get('title'):
                    errors.append('title is empty')
                if not data.get('authors'):
                    errors.append('authors is empty')
                if not data.get('year'):
                    errors.append('year is empty')
                if not data.get('abstract'):
                    errors.append('abstract is empty')
                if not data.get('course'):
                    errors.append('course is empty')
                if not data.get('panelists'):
                    errors.append('panelists is empty')

                if errors:
                    results.append({"row": row_num, "title": title, "status": "error", "message": "; ".join(errors)})
                    error_count += 1
                    continue

                # Validate year
                try:
                    year_val = int(data['year'])
                    if year_val < 2019 or year_val > CURRENT_YEAR:
                        raise ValueError
                except (ValueError, TypeError):
                    results.append({"row": row_num, "title": title, "status": "error", "message": f"Invalid year '{data['year']}' (must be 2019-{CURRENT_YEAR})"})
                    error_count += 1
                    continue

                # Validate course
                course_val = data['course'].strip().upper()
                if course_val not in VALID_COURSES:
                    results.append({"row": row_num, "title": title, "status": "error", "message": f"Invalid course '{data['course']}' (must be BSCS, BSIT, or BSEMC)"})
                    error_count += 1
                    continue

                try:
                    Document.objects.create(
                        title=data['title'],
                        authors=data['authors'],
                        year=year_val,
                        abstract=data['abstract'],
                        course=course_val,
                        panelists=data['panelists'],
                        keywords=data.get('keywords', '') or '',
                    )
                    results.append({"row": row_num, "title": title, "status": "success"})
                    success_count += 1
                except Exception as e:
                    results.append({"row": row_num, "title": title, "status": "error", "message": str(e)})
                    error_count += 1

            return Response({
                "success_count": success_count,
                "error_count": error_count,
                "skipped_count": skipped_count,
                "results": results,
            }, status=status.HTTP_201_CREATED if success_count > 0 else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": f"Failed to parse CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


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
