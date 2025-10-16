from uuid import uuid4

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.urls import reverse
import secrets


class UserRoles(models.TextChoices):
    EDITORA = "EDITORA", "Editora"
    GESTOR = "GESTOR", "Gestor"
    ALUNO = "ALUNO", "Aluno"


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("O e-mail deve ser informado.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", UserRoles.ALUNO)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", UserRoles.GESTOR)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser precisa ter is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser precisa ter is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    email = models.EmailField("e-mail", unique=True)
    username = models.CharField("nome de usuario", max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=UserRoles.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.username

    def get_short_name(self):
        return self.username


class PersonType(models.TextChoices):
    PF = "PF", "Pessoa Fisica"
    PJ = "PJ", "Pessoa Juridica"


class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="profile")
    person_type = models.CharField(max_length=2, choices=PersonType.choices)
    cpf = models.CharField(max_length=14, blank=True)
    cnpj = models.CharField(max_length=18, blank=True)
    nome_legal = models.CharField(max_length=255, blank=True)
    nome_fantasia = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=2, blank=True)
    municipio = models.CharField(max_length=255, blank=True)
    bairro = models.CharField(max_length=255, blank=True)
    endereco = models.CharField(max_length=255, blank=True)
    cep = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    fone = models.CharField(max_length=40, blank=True)
    obs = models.TextField(blank=True)
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"Perfil de {self.user.username}" if self.user_id else "Perfil"

class ShortLink(models.Model):
    code = models.CharField(max_length=16, unique=True, db_index=True)
    target_path = models.CharField(max_length=512)  # ex.: /conta/reset/<uidb64>/<token>/
    email = models.EmailField(blank=True)          # snapshot útil p/ auditoria
    whatsapp = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def new(cls, *, target_path: str, email: str, whatsapp: str, ttl_minutes: int = 60):
        code = secrets.token_urlsafe(12)[:16]  # curto e seguro
        return cls.objects.create(
            code=code,
            target_path=target_path,
            email=email,
            whatsapp=whatsapp,
            expires_at=timezone.now() + timezone.timedelta(minutes=ttl_minutes),
        )

    def is_valid(self) -> bool:
        return self.used_at is None and timezone.now() <= self.expires_at

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    def __str__(self):
        return f"/r/{self.code} -> {self.target_path}"