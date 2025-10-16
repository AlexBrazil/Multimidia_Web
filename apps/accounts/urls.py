from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView

from .views.reset import PasswordResetRequestView, ShortLinkRouterView
from .views import (
    AlunoPFRegisterView,
    AlunoPJRegisterView,
    GestorPFRegisterView,
    GestorPJRegisterView,
    RecoveryUnavailableView,
    RegistrationChoiceView,
    RegistrationSuccessView,
    TermsView,
    UserLoginView,
    UserLogoutView,
)

app_name = "accounts"

urlpatterns = [
    # --------------------
    # Autenticação
    # --------------------
    path("login/", UserLoginView.as_view(), name="login"),
    path("logout/", UserLogoutView.as_view(), name="logout"),

    # --------------------
    # Registro de usuários
    # --------------------
    path("register/", RegistrationChoiceView.as_view(), name="register-choice"),
    path("register/aluno/pf/", AlunoPFRegisterView.as_view(), name="register-aluno-pf"),
    path("register/aluno/pj/", AlunoPJRegisterView.as_view(), name="register-aluno-pj"),
    path("register/gestor/pf/", GestorPFRegisterView.as_view(), name="register-gestor-pf"),
    path("register/gestor/pj/", GestorPJRegisterView.as_view(), name="register-gestor-pj"),
    path("register/sucesso/", RegistrationSuccessView.as_view(), name="register-success"),

    # --------------------
    # Termos de uso
    # --------------------
    path("terms/", TermsView.as_view(), name="terms"),

    # --------------------
    # Recuperação de acesso (NOVO FLUXO)
    # --------------------
    # Novo formulário principal
    path("recovery/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),

    # Redirecionamento de compatibilidade (/recovery/ → /recovery/request/)
    path(
        "recovery/",
        RedirectView.as_view(pattern_name="accounts:password-reset-request", permanent=False),
        name="recovery",
    ),

    # Página "quero ser avisado" (opcional, mantém do fluxo anterior)
    path("recovery/unavailable/", RecoveryUnavailableView.as_view(), name="recovery-unavailable"),

    # Short link → redireciona ao token original (curto, usado no webhook WhatsApp)
    path("r/<str:code>/", ShortLinkRouterView.as_view(), name="shortlink"),

    # Página interna de redefinição (Django padrão com nosso template)
    path(
        "conta/reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="accounts/recovery/reset_confirm.html",
            success_url=reverse_lazy("accounts:login"),
        ),
        name="password-reset-confirm",
    ),
]
