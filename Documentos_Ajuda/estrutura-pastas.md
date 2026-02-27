# Estrutura de pastas - multimidia_auth

## Objetivo
- Servir como referencia rapida da estrutura real do repositorio.
- Indicar onde procurar cada tipo de alteracao.

## Raiz do projeto
- `manage.py`: entrada de comandos Django.
- `core/`: configuracao do projeto (settings, urls, wsgi/asgi).
- `apps/`: apps Django do dominio (`accounts`, `conteudo`, `legal`).
- `templates/`: templates HTML.
- `static/`: CSS, JS e assets publicos.
- `protected/`: dados protegidos de curso.
- `Documentos_Ajuda/`: documentacao tecnica e planos.
- `.env`, `.env.example`, `.env.prod.example`: variaveis de ambiente.

## `apps/accounts/`
- `models.py`: `CustomUser`, `UserProfile`, `Course`, `Enrollment`, `UserProgress`, `ShortLink`.
- `urls.py`: login/logout/cadastro/recuperacao.
- `views/`:
  - `auth.py`: login/logout.
  - `register.py`: fluxo de cadastro.
  - `reset.py`: recuperacao de senha + shortlink + webhook.
- `forms/`:
  - `auth.py`: autenticacao com mensagem para usuario pendente.
  - `base.py`: formularios de cadastro PF/PJ.
  - `reset.py`: formulario de pedido de reset.
- `validators.py`: normalizacao e validacoes (CPF/CNPJ/CEP/telefone).
- `admin.py`: configuracao de admin para modelos de contas/progresso.
- `migrations/`: historico de schema e seeds.

## `apps/conteudo/`
- `views.py`:
  - selecao de curso (`course_select`)
  - player (`index`)
  - JSON de curso (`course_data`)
  - progresso (`progress_overview`, `progress_interaction`)
- `urls.py`: rotas por curso e rotas de compatibilidade.
- `models.py`: atualmente sem modelos proprios.

## `apps/legal/`
- `urls.py`: paginas de politica e termos.
- `views.py`/`models.py`: sem logica/modelos relevantes no estado atual.

## `core/`
- `settings.py`: configuracoes principais.
- `local_settings.py`: overrides locais (dev).
- `urls.py`: include dos apps.
- `wsgi.py` / `asgi.py`: entrypoints de deploy.

## `templates/`
- `index.html`: player do curso.
- `courses/select.html`: selecao de cursos.
- `accounts/`: login, cadastro e recuperacao.
- `legal/`: termos e politica.

## `static/`
- `js/main.js`: fluxo principal de navegacao/progresso.
- `js/renderer.js`: render de slide/elementos.
- `js/elements/`: implementacao dos elementos do JSON.
- `css/core/`: base visual e responsividade global.
- `css/elements/`: estilos por elemento.
- `assets/`: imagens, audio e videos publicos.

## `protected/`
- `courses/<product_id>.json`: conteudo dos cursos.
- Regra: manter consistencia entre nome do arquivo, `productId` no JSON e `Course.product_id` no banco.

## `Documentos_Ajuda/`
- `manual-tecnico-arquitetura.md`: arquitetura geral.
- `auth.md`: fluxo de autenticacao/cadastro/recuperacao.
- `progresso.md`: fluxo de progresso e regras MONITORED.
- `plans/`: planos de mudanca/deploy.
