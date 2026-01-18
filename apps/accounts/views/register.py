import logging

from django.contrib import messages
from django.db import transaction
from django.shortcuts import redirect
from django.urls import reverse, reverse_lazy
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _
from django.views.generic import FormView, TemplateView

from ..forms import (
    AlunoPFRegisterForm,
    AlunoPJRegisterForm,
    GestorPFRegisterForm,
    GestorPJRegisterForm,
)
from ..models import CustomUser, UserProfile

logger = logging.getLogger(__name__)


class RegistrationChoiceView(TemplateView):
    template_name = "accounts/register/choice.html"


class RegistrationSuccessView(TemplateView):
    template_name = "accounts/register/success.html"


class TermsView(TemplateView):
    template_name = "accounts/register/terms.html"


class BaseRegisterView(FormView):
    success_url = reverse_lazy("accounts:register-success")
    form_class = None
    template_name = "accounts/register/form_base.html"

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        terms_link = reverse("accounts:terms")
        form.fields["accept_terms"].help_text = mark_safe(
            _(
                "Ao marcar esta opcao voce concorda com os <a href=\"%s\" target=\"_blank\" rel=\"noopener\">termos de uso</a>."
            )
            % terms_link
        )
        return form

    def form_valid(self, form):
        with transaction.atomic():
            user_data = form.get_user_data()
            password = user_data.pop("password")
            user = CustomUser.objects.create_user(password=password, **user_data)

            profile_data = form.get_profile_data()
            UserProfile.objects.create(user=user, **profile_data)

        self._notify_editora(user)
        messages.info(
            self.request,
            _(
                "Cadastro recebido! Assim que a equipe da editora revisar e liberar seu acesso, voce sera avisado por e-mail ou WhatsApp."
            ),
        )
        return super().form_valid(form)

    def _notify_editora(self, user: CustomUser):
        logger.info("Novo cadastro pendente de aprovacao", extra={"user": user.email})

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault("terms_url", reverse("accounts:terms"))
        return context


class AlunoPFRegisterView(BaseRegisterView):
    form_class = AlunoPFRegisterForm
    template_name = "accounts/register/aluno_pf.html"


class AlunoPJRegisterView(BaseRegisterView):
    form_class = AlunoPJRegisterForm
    template_name = "accounts/register/aluno_pj.html"


class GestorPFRegisterView(BaseRegisterView):
    form_class = GestorPFRegisterForm
    template_name = "accounts/register/gestor_pf.html"


class GestorPJRegisterView(BaseRegisterView):
    form_class = GestorPJRegisterForm
    template_name = "accounts/register/gestor_pj.html"


class RecoveryLandingView(TemplateView):
    template_name = "accounts/recovery/landing.html"


class RecoveryUnavailableView(TemplateView):
    template_name = "accounts/recovery/unavailable.html"

    def post(self, request, *args, **kwargs):
        messages.info(
            request,
            _(
                "Estamos preparando a recuperacao automatica de credenciais. Em breve voce podera solicita-la por aqui."
            ),
        )
        return redirect("accounts:recovery")
