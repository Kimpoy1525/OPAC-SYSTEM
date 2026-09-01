"""Backfill/refresh semantic-search embeddings for all documents.

Usage:
    python manage.py generate_embeddings            # embed only missing/stale docs
    python manage.py generate_embeddings --refresh  # force re-embed everything
"""
import time
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from documents.embeddings import (
    GEMINI_EMBEDDING_MODEL,
    EMBEDDING_VERSION,
    build_document_text,
    embed_texts,
)
from documents.models import Document

_BATCH_SIZE = 100


class Command(BaseCommand):
    help = "Generate semantic search embeddings for all documents (Gemini)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--refresh",
            action="store_true",
            help="Re-embed all documents, ignoring existing embeddings",
        )

    def handle(self, *args, **options):
        refresh = options["refresh"]

        queryset = Document.objects.all()
        if not refresh:
            queryset = queryset.filter(
                Q(search_embedding__isnull=True) | ~Q(embedding_model=GEMINI_EMBEDDING_MODEL)
 | Q(embedding_version__lt=EMBEDDING_VERSION)
            )

        total = Document.objects.count()
        pending_ids = list(queryset.values_list("id", flat=True))
        if not pending_ids:

            self.stdout.write(f"All {total} documents are already embedded (model: {GEMINI_EMBEDDING_MODEL}).")
            self.stdout.write("Tip: use --refresh to force re-embedding if the model changed.")
            return

        self.stdout.write(
            f"Embedding {len(pending_ids)}/{total} documents with {GEMINI_EMBEDDING_MODEL}..."
        )

        now = timezone.now()
        processed = 0
        for start in range(0, len(pending_ids), _BATCH_SIZE):
            batch_ids = pending_ids[start:start + _BATCH_SIZE]
            docs = list(Document.objects.filter(id__in=batch_ids))
            try:
                texts = [build_document_text(doc) for doc in docs]
                vectors = embed_texts(texts)
            except Exception as exc:
                self.stderr.write(
                    self.style.ERROR(f"Embedding failed for batch {start + 1}-{start + len(docs)}: {exc}")
                )
                return

            for doc, vector in zip(docs, vectors):
                doc.search_embedding = vector
                doc.embedding_version = EMBEDDING_VERSION
                doc.embedding_model = GEMINI_EMBEDDING_MODEL
                doc.embedding_updated_at = now
            Document.objects.bulk_update(
                docs, ["search_embedding", "embedding_version", "embedding_model", "embedding_updated_at"]
            )
            processed += len(docs)
            self.stdout.write(f"  Embedded {processed}/{len(pending_ids)}")
            time.sleep(2)  # Be gentle with Gemini free-tier rate limits

        self.stdout.write(
            self.style.SUCCESS(f"Done: embedded {processed} document(s).")
        )