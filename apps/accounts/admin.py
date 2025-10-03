from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0


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
        ("Permissoes", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")} ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")} ),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "role", "password1", "password2", "is_active", "is_staff", "is_superuser"),
        }),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "person_type", "estado", "municipio")
    list_filter = ("person_type", "estado")
    search_fields = ("user__email", "user__username", "cpf", "cnpj", "nome_legal", "nome_fantasia")
