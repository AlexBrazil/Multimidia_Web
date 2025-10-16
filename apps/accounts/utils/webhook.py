# apps/accounts/utils/webhook.py
import json
import logging
import uuid
import requests
from django.conf import settings
from .http_client import build_session

logger = logging.getLogger(__name__)

# Conexão curta; leitura um pouco maior
DEFAULT_TIMEOUT = (3.0, 5.0)  # (connect, read) em segundos

_session = None
def get_session() -> requests.Session:
    global _session
    if _session is None:
        _session = build_session()
    return _session

def send_n8n_password_reset(to_whatsapp: str, email: str, short_link: str, *, idem_key: str | None = None) -> bool:
    """
    Dispara o webhook do n8n.
    - Usa timeout e retries (em 429/5xx).
    - Envia Idempotency-Key para evitar duplicidade server-side.
    - Retorna True/False (não levanta exceção na view).
    """
    url = getattr(settings, "N8N_WEBHOOK_URL", "")
    if not url:
        logger.warning("N8N_WEBHOOK_URL não configurado")
        return False

    payload = {
        "to": to_whatsapp,
        "email": email,
        "short_link": short_link,
    }

    headers = {
        "Content-Type": "application/json",
        # Idempotência: mesmo evento não deve criar mensagens duplicadas no n8n
        "Idempotency-Key": idem_key or str(uuid.uuid4()),
        # Opcional: autenticação simples por token/segredo
        "X-Webhook-Token": getattr(settings, "N8N_WEBHOOK_TOKEN", ""),
    }

    try:
        resp = get_session().post(url, data=json.dumps(payload), headers=headers, timeout=DEFAULT_TIMEOUT)
        if 200 <= resp.status_code < 300:
            return True
        logger.warning("Webhook n8n falhou: status=%s body=%s", resp.status_code, resp.text[:500])
        return False
    except requests.RequestException as e:
        logger.exception("Erro de rede ao chamar n8n: %s", e)
        return False
