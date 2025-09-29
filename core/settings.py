"""
Django settings for core project (ajustado para DEV e pronto para deploy com NGINX).

- DEV:
  - DEBUG via .env
  - Templates em /templates
  - Estáticos de origem em /static
  - Banco SQLite

- PROD (VPS + NGINX):
  - Coletar estáticos em /staticfiles (STATIC_ROOT)
  - Servir app via gunicorn/uvicorn + NGINX
  - Ajustar ALLOWED_HOSTS e CSRF_TRUSTED_ORIGINS no .env
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# --- Paths & .env -----------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# --- Básico / Ambiente ------------------------------------------------------
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-unsafe")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"

# Em produção, preencha no .env, ex.: "seu-dominio.com,www.seu-dominio.com"
ALLOWED_HOSTS = [
    h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h.strip()
]

# Para HTTPS/CSRF atrás do NGINX. Ex.: "https://seu-dominio.com"
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]

# --- Apps -------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "apps.conteudo",
]

# --- Middleware -------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

# --- Templates --------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # Onde está seu index.html atual:
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# --- Banco de dados (DEV com SQLite) ---------------------------------------
# Em produção, migre para Postgres; por ora mantemos SQLite.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# --- Validação de senha -----------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Locale / Timezone ------------------------------------------------------
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# --- Arquivos estáticos e mídia --------------------------------------------
# URL pública (sempre com barra inicial)
STATIC_URL = "/static/"

# Pasta de origem dos seus CSS/JS/IMAGENS que você versiona:
STATICFILES_DIRS = [BASE_DIR / "static"]

# Pasta de destino do collectstatic (para NGINX servir em produção):
STATIC_ROOT = BASE_DIR / "staticfiles"

# Uploads (se for usar uploads de imagem/documentos):
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- Auth (login/logout) ----------------------------------------------------
LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/login/"

# --- Segurança para produção (ajuste no .env e nginx com HTTPS) ------------
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))  # ex.: 31536000 em prod
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", "0") == "1"
SECURE_HSTS_PRELOAD = os.getenv("DJANGO_SECURE_HSTS_PRELOAD", "0") == "1"
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "0") == "1"

# --- Chave primária default -------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
