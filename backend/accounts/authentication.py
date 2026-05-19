from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication that bypasses CSRF checks.
    This is needed because our React frontend sends session cookies
    but does not (and cannot easily) send CSRF tokens with every request.
    """
    def enforce_csrf(self, request):
        # Intentionally do nothing to skip the CSRF check
        return
