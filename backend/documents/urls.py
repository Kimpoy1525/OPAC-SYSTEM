from django.urls import path
from .views import DocumentUploadView, DocumentListView, DocumentDetailView

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('all/', DocumentListView.as_view(), name='document-list'), # New
    path('detail/<int:id>/', DocumentDetailView.as_view(), name='document-detail'), # New
]