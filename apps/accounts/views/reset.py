# apps/accounts/views/reset.py
"""
Fluxo de recuperação de senha com:
- Formulário que recebe e-mail
- Geração de token padrão (uidb64 + default_token_generator)
- Criação de ShortLink (URL curta com expiração e uso único)
- Envio do link curto + e-mail + whatsapp via webhook (n8n) com requests + retries
- Rota /r/<code> que valida e redireciona para a URL oficial do PasswordResetConfirmView

Pré-requisitos:
- Template: templates/accounts/recovery/request.html
- URL name "accounts:password-reset-confirm" apontando para PasswordResetConfirmView
- Variáveis no settings.py:
    N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "")
    N8N_WEBHOOK_TOKEN = os.getenv("N8N_WEBHOOK_TOKEN", "")
- Model UserProfile(user OneToOne) com campo whatsapp normalizado
"""

# apps/accounts/views/reset.py
from __future__ import annotations

import json
import logging
import uuid
from typing import Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.http import Http404, HttpResponseRedirect
from django.urls import reverse, reverse_lazy
from django.views.generic import FormView, View

from ..forms.reset import PasswordResetRequestForm
from ..models import ShortLink  # <<< usa o model oficial daqui

logger = logging.getLogger(__name__)
User = get_user_model()

# ---------------------------------------------------------------------------
# Cliente HTTP com retries/backoff para o webhook (requests)
# ---------------------------------------------------------------------------
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_DEFAULT_TIMEOUT: Tuple[float, float] = (3.0, 5.0)  # (connect, read)
_requests_session: requests.Session | None = None

def _build_session(
    total_retries: int = 3,
    backoff_factor: float = 0.5,
    status_forcelist: tuple[int, ...] = (429, 500, 502, 503, 504),
) -> requests.Session:
    retry = Retry(
        total=total_retries,
        read=total_retries,
        connect=total_retries,
        status=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods={"GET", "POST", "PUT", "DELETE", "PATCH"},
        raise_on_status=False,
        raise_on_redirect=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    s = requests.Session()
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s

def _get_session() -> requests.Session:
    global _requests_session
    if _requests_session is None:
        _requests_session = _build_session()
    return _requests_session

def send_n8n_password_reset(*, to_whatsapp: str, email: str, short_link: str, idem_key: str | None = None) -> bool:
    """
    Dispara webhook do n8n com timeouts e retries.
    Retorna True/False sem lançar exceções (a view não deve falhar por isso).
    """
    url = getattr(settings, "N8N_WEBHOOK_URL", "")
    if not url:
        logger.warning("N8N_WEBHOOK_URL não configurado; pulando envio")
        return False

    payload = {"to": to_whatsapp, "email": email, "short_link": short_link}
    headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idem_key or str(uuid.uuid4()),
    }
    token = getattr(settings, "N8N_WEBHOOK_TOKEN", "")
    if token:
        headers["X-Webhook-Token"] = token

    try:
        resp = _get_session().post(url, data=json.dumps(payload), headers=headers, timeout=_DEFAULT_TIMEOUT)
        if 200 <= resp.status_code < 300:
            return True
        logger.warning(
            "Webhook n8n falhou: status=%s body=%s",
            resp.status_code,
            (resp.text or "")[:500],
        )
        return False
    except requests.RequestException as e:
        logger.exception("Erro de rede ao chamar n8n: %s", e)
        return False


# ---------------------------------------------------------------------------
# Views: pedido de reset e roteador do link curto
# ---------------------------------------------------------------------------

from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

class PasswordResetRequestView(FormView):
    """
    Recebe um e-mail (de um usuário ativo), gera token padrão do Django,
    cria um ShortLink (expira/uso único) e envia via n8n (WhatsApp).
    """
    template_name = "accounts/recovery/request.html"
    form_class = PasswordResetRequestForm
    success_url = reverse_lazy("accounts:recovery")  # página informativa

    def form_valid(self, form):
        user = form.get_user()  # definido no clean_email do form (usuário ativo + whatsapp)

        try:
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # URL oficial do Django (confirmar nova senha)
            reset_path = reverse("accounts:password-reset-confirm", args=[uidb64, token])

            # Cria link curto (expira em 60 min; uso único)
            short = ShortLink.new(
                target_path=reset_path,
                email=user.email,
                whatsapp=getattr(user.profile, "whatsapp", ""),
                ttl_minutes=60,
            )

            # URL absoluta do link curto
            domain = get_current_site(self.request).domain
            scheme = "https"
            short_url = f"{scheme}://{domain}{reverse('accounts:shortlink', args=[short.code])}"

            # Envia para o n8n (não quebra fluxo se falhar)
            ok = send_n8n_password_reset(
                to_whatsapp=user.profile.whatsapp,
                email=user.email,
                short_link=short_url,
                idem_key=short.code,
            )
            if not ok:
                logger.warning("Falha ao notificar n8n para %s", user.email)

        except Exception:
            logger.exception("Erro ao preparar fluxo de reset para %s", getattr(user, "email", "desconhecido"))

        return super().form_valid(form)


class ShortLinkRouterView(View):
    """
    /r/<code> -> valida o ShortLink (expiração/uso) e redireciona para o alvo.
    Se inválido/expirado/consumido: 404.
    """
    def get(self, request, code: str):
        try:
            sl = ShortLink.objects.get(code=code)
        except ShortLink.DoesNotExist:
            raise Http404

        if not sl.is_valid():
            raise Http404

        sl.mark_used()
        return HttpResponseRedirect(sl.target_path)
