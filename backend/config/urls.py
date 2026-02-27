from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. Your new Research Upload path
    # Full URL: http://localhost:8000/home/upload/
    path('home/', include('documents.urls')), 
    
    # 2. Existing Auth paths (Keeping both to prevent breaking React)
    path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),

]

# 3. Essential for serving the PDFs in 'research_files/'
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)