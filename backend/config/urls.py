from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve # Added for production serving
import re # Added for URL pattern matching

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. Your new Research Upload path
    path('home/', include('documents.urls')), 
    
    # 2. Existing Auth paths
    path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
]

# 3. Essential for serving the PDFs in 'research_files/'
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # This block allows Railway to serve files from your Volume when DEBUG is False
    urlpatterns += [
        path(
            r'^media/(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]