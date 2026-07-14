from django.test import TestCase
from django.urls import reverse

from .models import Document
from .serializers import DocumentSerializer


class DocumentSearchTests(TestCase):
    def setUp(self):
        self.document = Document.objects.create(
            title="Artificial Intelligence Research",
            authors="Ana Dela Cruz",
            year=2026,
            abstract="A machine learning system for academic libraries.",
            keywords="AI, OPAC",
            panelists="Faculty Reviewer",
            course="BSCS",
        )

    def test_search_is_case_insensitive(self):
        uppercase = self.client.get(reverse("document-list"), {"search": "ARTIFICIAL"})
        lowercase = self.client.get(reverse("document-list"), {"search": "artificial"})

        self.assertEqual(uppercase.status_code, 200)
        self.assertEqual(lowercase.status_code, 200)
        self.assertEqual(uppercase.json(), lowercase.json())
        self.assertEqual(len(uppercase.json()), 1)

    def test_search_includes_abstract_text(self):
        response = self.client.get(reverse("document-list"), {"search": "MACHINE LEARNING"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_video_demo_link_accepts_youtube_and_rejects_other_hosts(self):
        valid = DocumentSerializer(instance=self.document, data={"video_demo_url": "https://youtu.be/abc123"}, partial=True)
        invalid = DocumentSerializer(instance=self.document, data={"video_demo_url": "https://example.com/video"}, partial=True)

        self.assertTrue(valid.is_valid(), valid.errors)
        self.assertFalse(invalid.is_valid())
        self.assertIn("video_demo_url", invalid.errors)
