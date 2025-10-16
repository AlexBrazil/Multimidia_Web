from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserProfile
from .models import ShortLink


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    readonly_fields = ("terms_accepted", "terms_accepted_at")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "person_type",
                    "cpf",
                    "cnpj",
                    "nome_legal",
                    "nome_fantasia",
                    "estado",
                    "municipio",
                    "bairro",
                    "endereco",
                    "cep",
                    "whatsapp",
                    "fone",
                    "obs",
                    "terms_accepted",
                    "terms_accepted_at",
                )
            },
        ),
    )


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "username", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "username")
    readonly_fields = ("date_joined",)
    inlines = [UserProfileInline]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informacoes pessoais", {"fields": ("username", "role")}),
        (
            "Permissoes",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "role",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "person_type", "estado", "municipio", "terms_accepted")
    list_filter = ("person_type", "estado", "terms_accepted")
    search_fields = (
        "user__email",
        "user__username",
        "cpf",
        "cnpj",
        "nome_legal",
        "nome_fantasia",
    )

@admin.register(ShortLink)
class ShortLinkAdmin(admin.ModelAdmin):
    list_display = ("code", "email", "whatsapp", "created_at", "expires_at", "used_at")
    list_filter = ("used_at",)
    search_fields = ("code", "email", "whatsapp")