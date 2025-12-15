from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserProfile, UserProgress, ProgressMode
from .models import ShortLink


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    readonly_fields = ("terms_accepted", "terms_accepted_at", "last_interaction_at", "progress_payload")
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
                    "progress_mode",
                    "last_completed_slide_id",
                    "last_interaction_at",
                    "progress_payload",
                )
            },
        ),
    )


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "username", "role", "is_active", "is_staff", "get_progress_mode", "get_last_completed")
    list_filter = ("role", "is_active", "is_staff", "profile__progress_mode")
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

    @admin.display(description="Modo de progresso")
    def get_progress_mode(self, obj):
        try:
            return obj.profile.progress_mode
        except UserProfile.DoesNotExist:
            return None

    @admin.display(description="Ult. slide concluido")
    def get_last_completed(self, obj):
        try:
            return obj.profile.last_completed_slide_id
        except UserProfile.DoesNotExist:
            return None


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "person_type", "estado", "municipio", "terms_accepted", "progress_mode", "last_completed_slide_id")
    list_filter = ("person_type", "estado", "terms_accepted", "progress_mode")
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


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "slide_id", "completed", "time_met", "required_seconds", "updated_at", "completed_at")
    list_filter = ("completed",)
    search_fields = ("user__email", "user__username", "slide_id")
