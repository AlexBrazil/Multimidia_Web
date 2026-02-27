# Manual tecnico - arquitetura do projeto multimidia_auth

## 1) Visao geral
- Projeto Django com 3 apps principais: `apps/accounts`, `apps/conteudo`, `apps/legal`.
- Front-end renderizado por templates Django + JavaScript modular em `static/js/`.
- Conteudo dos cursos em JSON protegido por curso: `protected/courses/<product_id>.json`.
- Assets publicos (imagens, audio, video, css, js) em `static/`.

## 2) Estrutura de pastas (alto nivel)
- `core/`: settings, urls, asgi/wsgi.
- `apps/accounts/`: autenticacao, cadastro, recuperacao e modelos de usuario.
- `apps/conteudo/`: selecao de cursos, player, endpoint de JSON e endpoint de progresso.
- `apps/legal/`: paginas legais.
- `templates/`: telas HTML do sistema.
- `static/`: CSS, JS e assets publicos.
- `protected/courses/`: JSONs de curso protegidos.

## 3) Fluxo principal de uso
1. Usuario autenticado acessa `/` -> `apps.conteudo.views.course_select` -> `templates/courses/select.html`.
2. Usuario escolhe um curso e acessa `/courses/<product_id>/` -> `apps.conteudo.views.index` -> `templates/index.html`.
3. `templates/index.html` injeta `window.APP_ENDPOINTS` e `window.APP_USER`.
4. `static/js/main.js` carrega `courseData` e, quando autenticado, carrega `progress`.
5. `static/js/renderer.js` renderiza slide e elementos de `static/js/elements/`.
6. Em modo `MONITORED`, `main.js` registra interacoes em `progress/interaction/`.

## 4) URLs principais

### 4.1 `core/urls.py`
- `admin/`
- include de `apps.accounts.urls`
- include de `apps.conteudo.urls`
- include de `apps.legal.urls`

### 4.2 `apps/conteudo/urls.py`
- `/` -> selecao de cursos (`course_select`)
- `/courses/<product_id>/` -> player do curso (`index`)
- `/courses/<product_id>/data.json` -> JSON protegido do curso (`course_data`)
- `/courses/<product_id>/progress/` -> resumo de progresso (`progress_overview`)
- `/courses/<product_id>/progress/interaction/` -> registro de interacao (`progress_interaction`)
- Rotas de compatibilidade:
  - `/data.json`
  - `/progress/`
  - `/progress/interaction/`

### 4.3 `apps/accounts/urls.py`
- `/login/`, `/logout/`
- `/register/...` (aluno/gestor PF/PJ)
- `/terms/`
- `/recovery/request/`, `/recovery/`, `/recovery/unavailable/`
- `/r/<code>/` (short link de reset)
- `/conta/reset/<uidb64>/<token>/` (PasswordResetConfirmView)

### 4.4 `apps/legal/urls.py`
- `/politica-de-privacidade/`
- `/termos-de-servico/`

## 5) Backend e dados

### 5.1 Modelos relevantes (`apps/accounts/models.py`)
- `CustomUser`: usuario custom com login por email.
- `UserProfile`: dados cadastrais e configuracoes de progresso (legado/compatibilidade).
- `Course`: cadastro de cursos (`product_id`, `is_default`, `is_active`).
- `Enrollment`: matricula do usuario no curso e ultimo estado agregado.
- `UserProgress`: progresso por `(user, course, slide_id)`.
- `ShortLink`: links curtos expiram e sao de uso unico (recuperacao de senha).

### 5.2 Regras de acesso em conteudo
- Endpoints de curso e progresso usam `@login_required`.
- Usuario precisa de `Enrollment` ativo no curso acessado.
- `slideId` no POST de progresso e validado contra IDs reais do JSON do curso.

### 5.3 Cache em `apps/conteudo/views.py`
- `_get_default_course` usa `@lru_cache`.
- `_load_course_payload(product_id)` usa `@lru_cache`.
- Em alteracoes de curso/default, pode ser necessario reiniciar o processo para refletir imediatamente.

## 6) Front-end

### 6.1 Arquivos principais
- `static/js/main.js`: estado da aplicacao, navegacao, busca e progresso.
- `static/js/renderer.js`: factory de elementos e render do slide.
- `static/js/utils/asset-path.js`: resolucao de caminhos de assets.
- `static/js/elements/*.js`: componentes de renderizacao.

### 6.2 Modo MONITORED
- Usa `requiredSeconds`/`minDuration` do slide.
- Exige tempo minimo e interacoes por tipo de elemento.
- Bloqueia avancar para frente sem concluir o slide atual.

## 7) Estrutura de curso (JSON)
- Arquivos: `protected/courses/<product_id>.json`.
- Estrutura hierarquica: `SlideGroup` -> `SlideGroup` -> `Slide`.
- IDs de `Slide` devem ser unicos e ordenados de forma consistente para nao quebrar progressao monitorada.
- O `productId` interno do JSON deve ser consistente com:
  - nome do arquivo (`<product_id>.json`)
  - registro `Course.product_id` no banco

## 8) Seguranca
- `core/settings.py` usa variaveis de ambiente (`DJANGO_*`, `N8N_*`).
- Cookies seguros e HSTS habilitados quando `DEBUG=0`.
- JSON dos cursos nao deve ser exposto publicamente fora das views autenticadas.
- Recuperacao de senha:
  - token Django (`uidb64` + `default_token_generator`)
  - `ShortLink` com TTL e uso unico
  - webhook n8n (quando configurado)
  - observacao: em `apps/accounts/views/reset.py`, a URL curta enviada e montada com `https` fixo; em dev local sem HTTPS isso pode gerar link nao funcional.

## 9) Operacao
- Ambiente local padrao: SQLite (`db.sqlite3`) quando `DJANGO_DB_URL` nao esta definido.
- Deploy previsto para Gunicorn/Uvicorn atras de NGINX.
- `STATIC_ROOT` e `MEDIA_ROOT` configurados para deploy.

## 10) Validacao recomendada
- `python manage.py check`
- `python manage.py test`
- Smoke:
  - `/login/`
  - `/` autenticado (selecao de cursos)
  - `/courses/<product_id>/` (player)
