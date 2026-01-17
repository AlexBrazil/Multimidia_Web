# Auth

## Objetivo
- Documentar o fluxo de cadastro, login e recuperacao de senha.
- Manter a visao atual do que existe no codigo e dos pontos de seguranca.

## Onde as URLs sao registradas
- Rotas de contas sao incluidas no root do projeto via `core/urls.py`:
  - `path("", include("apps.accounts.urls"))`
  - Resultado: os caminhos definidos em `apps/accounts/urls.py` ficam em `/` (ex.: `/login/`).

## Estrutura de pastas importantes
- `core/`: settings e urls globais do projeto.
- `apps/accounts/`: models, forms, views e urls do fluxo de contas.
- `templates/accounts/`: telas de login, cadastro e recuperacao.
- `static/`: assets publicos usados pelos templates (CSS/JS).
- `protected/courses/`: JSONs dos cursos por `productId`.
- `Documentos_Ajuda/`: documentacao local do projeto.

## Rotas principais (apps.accounts.urls)
- Login: `/login/` -> `UserLoginView`
- Logout: `/logout/` -> `UserLogoutView`
- Cadastro:
  - `/register/` (escolha)
  - `/register/aluno/pf/`
  - `/register/aluno/pj/`
  - `/register/gestor/pf/`
  - `/register/gestor/pj/`
  - `/register/sucesso/`
- Termos: `/terms/`
- Recuperacao:
  - `/recovery/request/` (form de reset)
  - `/recovery/` (redirect para request)
  - `/recovery/unavailable/` (fluxo legado opcional)
  - `/r/<code>/` (short link)
  - `/conta/reset/<uidb64>/<token>/` (PasswordResetConfirmView)

## Cadastro
- View base: `BaseRegisterView` cria `CustomUser` e `UserProfile` em transacao.
- `CustomUser` nasce com `is_active=False` (pendente de aprovacao).
- Mensagem informa que a conta precisa de liberacao da editora.
- Para o curso default, cria `Enrollment` automaticamente quando existe `Course.is_default=True`.
- Formas PF/PJ e roles (Aluno/Gestor) estao em `apps/accounts/forms/base.py`.
- Validacoes importantes:
  - Email e username unicos.
  - CPF/CNPJ/telefone/CEP normalizados em `apps/accounts/validators.py`.
  - Termos obrigatorios (`accept_terms`).

## Login / Logout
- Auth usa `AUTH_USER_MODEL = accounts.CustomUser` com `USERNAME_FIELD = email`.
- `PendingAwareAuthenticationForm` mostra erro especifico quando a conta esta inativa,
  mas a senha e correta (usuario pendente).
- `LOGIN_URL = /login/`, `LOGIN_REDIRECT_URL = /`, `LOGOUT_REDIRECT_URL = /login/`.
- Logout aceita GET/POST e redireciona para login.

## Recuperacao de senha
- `PasswordResetRequestForm`:
  - Exige usuario ativo.
  - Exige WhatsApp no perfil.
  - Mensagem generica quando o email nao existe (nao revela conta).
- `PasswordResetRequestView`:
  - Gera token padrao do Django (uidb64 + default_token_generator).
  - Cria `ShortLink` com TTL e uso unico.
  - Envia link curto via webhook n8n.
- `ShortLinkRouterView` valida expiracao/uso e redireciona para o alvo.
- Confirmacao de nova senha usa `PasswordResetConfirmView` com template propio.

## Modelos envolvidos
- `CustomUser`: email como login, role, flags de status.
- `UserProfile`: dados pessoais, WhatsApp e aceite de termos.
- `Course`: catalogo de cursos por `productId`.
- `Enrollment`: matricula do usuario em cada curso e resumo de progresso.
- `ShortLink`: link curto de reset com expiracao e uso unico.

## Middleware relevante
- `AuthenticationMiddleware` e `SessionMiddleware` ativos em `core/settings.py`.

## Views que exigem login (fora do app accounts)
- `apps/conteudo/views.py`: `/`, `/courses/<productId>/`, `/courses/<productId>/data.json`,
  `/courses/<productId>/progress/`, `/courses/<productId>/progress/interaction/`.

## Variaveis de ambiente importantes
- `DJANGO_SECRET_KEY`: chave de assinatura do Django (tokens e sessao).
- `DJANGO_DEBUG`: controla `DEBUG` (impacta seguranca de cookies/HSTS).
- `DJANGO_ALLOWED_HOSTS`: hosts liberados em producao.
- `DJANGO_CSRF_TRUSTED_ORIGINS`: origens confiaveis para CSRF.
- `N8N_WEBHOOK_URL`: endpoint do n8n para envio do link de reset.
- `N8N_WEBHOOK_TOKEN`: token opcional para autenticar o webhook.

## Configuracao (core/settings.py)
- `AUTH_USER_MODEL`, `LOGIN_URL`, `LOGIN_REDIRECT_URL`, `LOGOUT_REDIRECT_URL`.
- `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_TOKEN` para envio do reset via WhatsApp.
