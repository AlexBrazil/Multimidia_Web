from django.urls import path

from .views import (
    AlunoPFRegisterView,
    AlunoPJRegisterView,
    GestorPFRegisterView,
    GestorPJRegisterView,
    RecoveryLandingView,
    RecoveryUnavailableView,
    RegistrationChoiceView,
    RegistrationSuccessView,
    TermsView,
    UserLoginView,
    UserLogoutView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", UserLoginView.as_view(), name="login"),
    path("logout/", UserLogoutView.as_view(), name="logout"),
    path("register/", RegistrationChoiceView.as_view(), name="register-choice"),
    path("register/aluno/pf/", AlunoPFRegisterView.as_view(), name="register-aluno-pf"),
    path("register/aluno/pj/", AlunoPJRegisterView.as_view(), name="register-aluno-pj"),
    path("register/gestor/pf/", GestorPFRegisterView.as_view(), name="register-gestor-pf"),
    path("register/gestor/pj/", GestorPJRegisterView.as_view(), name="register-gestor-pj"),
    path("register/sucesso/", RegistrationSuccessView.as_view(), name="register-success"),
    path("terms/", TermsView.as_view(), name="terms"),
    path("recovery/", RecoveryLandingView.as_view(), name="recovery"),
    path("recovery/unavailable/", RecoveryUnavailableView.as_view(), name="recovery-unavailable"),
]
