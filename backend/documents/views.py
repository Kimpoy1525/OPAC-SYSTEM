from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status, generics
from rest_framework.permissions import BasePermission
from django.db.models import Q, Count, Case, When
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
import urllib.request
import urllib.error
from datetime import date

class IsCatalogAdmin(BasePermission):
    message = "Content Manager access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ['CONTENT_MANAGER', 'SUPERADMIN']
        )


# --- SEMANTIC SEARCH HELPERS (best-effort: never block the primary flow on embedding failures) ---
def _reembed_document(doc):
    """Embed/refresh a single document's search vector."""
    try:
        from django.utils import timezone
        from .embeddings import (
            EMBEDDING_VERSION,
            GEMINI_EMBEDDING_MODEL,
            build_document_text,
            embed_texts,
        )
        vectors = embed_texts([build_document_text(doc)])
        if not vectors:
            return
        doc.search_embedding = vectors[0]
        doc.embedding_version = EMBEDDING_VERSION
        doc.embedding_model = GEMINI_EMBEDDING_MODEL
        doc.embedding_updated_at = timezone.now()
        doc.save(update_fields=["search_embedding", "embedding_version", "embedding_model", "embedding_updated_at"])
        from .search import invalidate_cache
        invalidate_cache()
    except Exception:
        # Uploads/updates must never fail because embeddings could not be generated.
        pass

def _reembed_many(docs):
    """Batch-embed a list of documents (e.g. right after a CSV import)."""
    if not docs:
        return
    try:
        from django.utils import timezone
        from .embeddings import (
            EMBEDDING_VERSION,
            GEMINI_EMBEDDING_MODEL,
            build_document_text,
            embed_texts,
        )
        vectors = embed_texts([build_document_text(d) for d in docs])
        if not vectors:
            return
        now = timezone.now()
        for doc, vector in zip(docs, vectors):
            doc.search_embedding = vector
            doc.embedding_version = EMBEDDING_VERSION
            doc.embedding_model = GEMINI_EMBEDDING_MODEL
            doc.embedding_updated_at = now
        Document.objects.bulk_update(
            docs, ["search_embedding", "embedding_version", "embedding_model", "embedding_updated_at"]
        )
        from .search import invalidate_cache
        invalidate_cache()
    except Exception:
        pass


# 1. Handles the initial upload of a paper
class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsCatalogAdmin]

    def post(self, request, *args, **kwargs):
        serializer = DocumentSerializer(data=request.data)
        if serializer.is_valid():
            document = serializer.save()
            
            # Generate its semantic-search embedding (best-effort, never blocks the upload).
            _reembed_document(document)

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
        self._semantic_scores = {}
        queryset = Document.objects.all().order_by('-uploaded_at').prefetch_related('files')
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
            # 1) Semantic (cosine) ranking - exact year/course filters above are applied first.



            try:
                from .search import semantic_search
                ranked = semantic_search(search_query)



                if ranked:
                    self._semantic_scores = {}
                    for doc_id, score in ranked:
                        self._semantic_scores[doc_id] = score



                    ids = [doc_id for doc_id, _ in ranked]
                    return queryset.filter(id__in=ids)


            except Exception:
                pass  # Fall through to keyword search below



        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(authors__icontains=search_query) |
                Q(keywords__icontains=search_query) |
                Q(abstract__icontains=search_query)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        items = list(queryset)
        if getattr(self, '_semantic_scores', None):
            items.sort(key=lambda item: self._semantic_scores.get(item.id, -1.0), reverse=True)
        data = self.get_serializer(items, many=True).data
        if getattr(self, '_semantic_scores', None):
            for item in data:
                item['semantic_score'] = round(self._semantic_scores.get(item['id'], 0.0), 4)
        return Response(data)

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
    permission_classes = [IsCatalogAdmin]

    # Fields tracked for the change log (excludes uploaded_at / id / files)
    TRACKED_FIELDS = [
        'title', 'authors', 'year', 'abstract', 'keywords',
        'panelists', 'course', 'video_demo_url',
    ]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Capture original values BEFORE saving
            old_values = {f: getattr(instance, f) for f in self.TRACKED_FIELDS}

            document = serializer.save()

            # Refresh its semantic-search embedding since the metadata changed (best-effort).
            _reembed_document(document)

            # Count files before/after to detect file add/removal
            old_file_ids = set(instance.files.values_list('id', flat=True))

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

            # --- Build the change list (field-by-field diff) ---
            changes = []
            for field in self.TRACKED_FIELDS:
                old_value = old_values[field]
                new_value = getattr(document, field)
                if old_value != new_value:
                    changes.append({
                        "field": field,
                        "old": str(old_value) if old_value is not None else "",
                        "new": str(new_value) if new_value is not None else "",
                    })

            # Detect file count changes
            new_file_ids = set(document.files.values_list('id', flat=True))
            removed_count = len(old_file_ids - new_file_ids)
            added_count = len(new_files)
            if removed_count:
                changes.append({"field": "files", "old": f"{removed_count} file(s)", "new": "removed"})
            if added_count:
                changes.append({"field": "files", "old": f"{added_count} file(s)", "new": "added"})

            # --- LOG THE EDIT EVENT WITH CHANGES ---
            if request.user.is_authenticated:
                EditLog.objects.create(
                    user=request.user,
                    title=document.title,
                    changes=changes
                )

            return Response(DocumentSerializer(document).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 5. Handles deleting the entire research document
class DocumentDeleteView(generics.DestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    lookup_field = 'id'
    permission_classes = [IsCatalogAdmin]

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
    permission_classes = [IsCatalogAdmin]

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
                return Response({"error": "Could not decode CSV file. Try saving it as UTF-8 in Excel (File â†’ Save As â†’ CSV UTF-8)."}, status=status.HTTP_400_BAD_REQUEST)
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

            created_docs = []
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
                    document = Document.objects.create(
                        title=data['title'],
                        authors=data['authors'],
                        year=year_val,
                        abstract=data['abstract'],
                        course=course_val,
                        panelists=data['panelists'],
                        keywords=data.get('keywords', '') or '',
                    )
                    created_docs.append(document)
                    results.append({"row": row_num, "title": title, "status": "success"})
                    success_count += 1
                except Exception as e:
                    results.append({"row": row_num, "title": title, "status": "error", "message": str(e)})
                    error_count += 1

            # Generate semantic-search embeddings for the newly imported rows (best-effort batch)ã€‚
            _reembed_many(created_docs)

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
# --- AI REPOSITORY CHATBOT (metadata only) ---
class RepositoryChatView(APIView):

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Please sign in to use the AI assistant."}, status=status.HTTP_401_UNAUTHORIZED)

        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            return Response({"error": "The AI assistant is not configured yet. Please contact the administrator."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            body = json.loads(request.body) if request.body else {}
        except (json.JSONDecodeError, TypeError):
            body = {}

        raw_messages = body.get("messages") or []
        if not isinstance(raw_messages, list):
            return Response({"error": "Invalid messages payload."}, status=status.HTTP_400_BAD_REQUEST)

        messages = []
        for m in raw_messages:
            if isinstance(m, dict) and isinstance(m.get("content"), str) and m.get("content").strip():
                messages.append({"role": "model" if m.get("role") == "assistant" else "user", "content": m["content"].strip()})
        messages = messages[-12:]

        # --- Semantic retrieval: inject only the most relevant titles instead of dumping the catalog ---
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        docs = []
        if last_user:
            try:
                from .search import semantic_search
                ranked = semantic_search(last_user, limit=20)
                if ranked:
                    rank_map = {doc_id: index for index, (doc_id, _) in enumerate(ranked)}
                    docs = list(Document.objects.filter(id__in=[doc_id for doc_id, _ in ranked]))
                    docs.sort(key=lambda doc: rank_map.get(doc.id, 9999))
            except Exception:
                pass  # Fall back to the full catalog dump below
        if not docs:
            docs = list(Document.objects.all().order_by("-uploaded_at")[:150])

        lines = []
        for doc in docs:
            abstract = (doc.abstract or "").strip()
            if len(abstract) > 600:
                abstract = abstract[:600] + "..."
            lines.append(
                "Title: {0}\n  Authors: {1}\n  Year: {2}\n  Course: {3}\n  Keywords: {4}\n  Panelists: {5}\n  Abstract: {6}".format(
                    doc.title, doc.authors, doc.year, doc.course, doc.keywords or "N/A", doc.panelists or "N/A", abstract
                )
            )
        repository_text = "\n\n".join(lines) if lines else "(The repository currently has no research titles.)"

        total = Document.objects.count()
        course_counts = {r["course"]: r["c"] for r in Document.objects.values("course").annotate(c=Count("id"))}

        matrix = {}
        for r in Document.objects.values("course", "year").annotate(c=Count("id")):
            matrix.setdefault(r["course"], {})[str(r["year"])] = r["c"]
        years = sorted({y for d in matrix.values() for y in d})

        fact_lines = [
            "IMPORTANT FACTS (these are authoritative, do not contradict them):",
            f"- Total research titles in the repository: {total}",
        ]
        for c in ["BSCS", "BSIT", "BSEMC"]:
            fact_lines.append(f"- {c} titles: {course_counts.get(c, 0)}")
        fact_lines.append("- Per-course breakdown by year:")
        for c in ["BSCS", "BSIT", "BSEMC"]:
            pieces = [matrix.get(c, {}).get(y, 0) for y in years]
            fact_lines.append(f"    {c}: " + "; ".join(f"{y}: {n}" for y, n in zip(years, pieces)))
        facts = "\n".join(fact_lines)

        system_prompt = (
            "You are the CCSTECHVAULT AI assistant for Our Lady of Fatima University - College of Computer Studies. "
            "Answer questions ONLY using the research metadata provided below. "
            "For ANY question about counts or how many titles (including combined filters like course and year), use the IMPORTANT FACTS section - do not count from the list yourself. "
            "You do NOT have access to files, PDFs, documents, download links, or video content - never mention them. "
            "If the answer is not in the metadata, say you do not have that information. Be concise and helpful.\n\n"
            + facts + "\n\n"
            + "REPOSITORY METADATA (title, authors, year, course, keywords, panelists, abstract ONLY):\n\n"
            + repository_text
        )

        contents = []
        for m in messages:
            contents.append({"role": m["role"], "parts": [{"text": m["content"]}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 2048},
        }

        model_name = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").strip()
        url = "https://generativelanguage.googleapis.com/v1beta/models/" + model_name + ":generateContent?key=" + api_key
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            return Response({"error": "AI service error ({0}). Please try again later.".format(exc.code)}, status=status.HTTP_502_BAD_GATEWAY)
        except (urllib.error.URLError, OSError):
            return Response({"error": "Could not reach the AI service. Please try again later."}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            reply = result["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError, TypeError):
            reply = "I'm sorry, I could not generate a response. Please try again."

        return Response({"reply": reply})

