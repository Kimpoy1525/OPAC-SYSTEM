from django.urls import path
from .views import (
    DocumentDeleteView, 
    DocumentUploadView, 
    DocumentListView, 
    DocumentDetailView, 
    DocumentUpdateView,
    FileDownloadView  
)

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('all/', DocumentListView.as_view(), name='document-list'),
    path('detail/<int:id>/', DocumentDetailView.as_view(), name='document-detail'),
    path('detail/<int:id>/update/', DocumentUpdateView.as_view(), name='document-update'),
    path('detail/<int:id>/delete/', DocumentDeleteView.as_view(), name='document-delete'),
    path('download/<int:file_id>/', FileDownloadView.as_view(), name='file-download'),
]