"""TOTP helpers for the content-manager two-factor authentication.

- Secrets are stored Fernet-encrypted at rest (key derived from SECRET_KEY).
- Backup codes are stored as SHA-256 hashes and are single-use.
- QR codes are rendered as SVG (no Pillow dependency required).
"""
import base64
import hashlib
import secrets
import string

import pyotp
import qrcode
import qrcode.image.svg
from cryptography.fernet import Fernet
from django.conf import settings


def _fernet():
    key = base64.urlsafe_b64encode(
        hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    )
    return Fernet(key)


def encrypt_secret(plain):
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_secret(token):
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")


def build_otpauth_url(secret, account_name, issuer="CCSTECHVAULT"):
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=account_name, issuer_name=issuer
    )


def render_qr_svg(otpauth_url):
    qr = qrcode.QRCode(image_factory=qrcode.image.svg.SvgPathImage)
    qr.add_data(otpauth_url)
    qr.make(fit=True)
    image = qr.make_image()
    try:
        return image.to_string(encoding="unicode")
    except TypeError:
        return image.to_string().decode("utf-8")


def generate_backup_codes(count=8):
    alphabet = string.ascii_uppercase + string.digits
    codes = []
    for _ in range(count):
        raw = "".join(secrets.choice(alphabet) for _ in range(10))
        codes.append(raw[:5] + "-" + raw[5:])
    return codes


def hash_code(code):
    normalized = (code or "").strip().replace(" ", "").upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def verify_and_consume_backup_code(user, code):
    stored = list(user.backup_codes or [])
    digest = hash_code(code)
    if digest in stored:
        stored.remove(digest)
        user.backup_codes = stored
        user.save(update_fields=["backup_codes"])
        return True
    return False
