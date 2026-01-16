# Plano - Sistema multi cursos

## Objetivo
- Permitir que um aluno tenha inscricao em mais de um curso ao mesmo tempo.
- Servir um arquivo por curso (ex.: `protected/courses/<productId>.json`).
- Garantir controle de avancos por curso (FREE/MONITORED), sem perder dados atuais.

## Premissas e compatibilidade
- O `productId` ja existe no JSON atual e deve ser usado como identificador.
- Manter compatibilidade com o fluxo atual (curso unico) durante migracao.
- Nao quebrar o front-end atual sem um fallback de rota.

## Proposta de arquitetura (alto nivel)
- Armazenar arquivos por curso em `protected/courses/<productId>.json`.
- Criar modelo `Course` com `product_id`, `title` (opcional), `data_path` (opcional).
- Criar modelo de inscricao `Enrollment` (ou `UserCourse`) para ligar usuario x curso.
- Mover controle de avancos por curso para `Enrollment`:
  - `progress_mode`, `last_viewed_slide_id`, `last_completed_slide_id`, `last_interaction_at`.
- Ajustar `UserProgress` para incluir `course` (FK) ou `course_product_id`.

## Etapas detalhadas

### 1) Research (mapear impacto)
- Mapear onde o JSON e carregado e como o `slideId` e validado (`apps/conteudo/views.py`).
- Identificar todos os pontos que assumem curso unico (front-end e back-end).
- Mapear dependencias do `progress_mode` (hoje em `UserProfile`).

### 2) Modelagem de dados e migracao
- Criar `Course`:
  - Campos: `product_id` (unique), `name/title` (opcional), `is_active`, `created_at`.
- Criar `Enrollment`:
  - FK `user`, FK `course`, status (ativo), `progress_mode`,
    `last_viewed_slide_id`, `last_completed_slide_id`, `last_interaction_at`.
  - Unique constraint (`user`, `course`).
- Atualizar `UserProgress`:
  - Adicionar FK `course` (ou `course_product_id` se nao quiser FK).
  - Novo unique constraint (`user`, `course`, `slide_id`).
- Migracao de dados:
  - Criar um curso "default" com `product_id` atual (ex.: `000001`).
  - Migrar progresso existente para esse curso.
  - Migrar `UserProfile.progress_mode` e campos de ultimo estado para `Enrollment`.

### 3) Estrutura de arquivos de curso
- Criar pasta `protected/courses/`.
- Mover o JSON atual para `protected/courses/<productId>.json`.
- Manter `protected/data.json` temporariamente como fallback (ou como alias).
- Opcional: criar comando de import para ler JSON e registrar `Course`.

### 4) Endpoints e regras de acesso
- Atualizar URLs para receber `productId`:
  - `GET /courses/<productId>/data.json`
  - `GET /courses/<productId>/progress/`
  - `POST /courses/<productId>/progress/interaction/`
- Manter rotas antigas (`/data.json`, `/progress/`, `/progress/interaction/`) como
  fallback para o curso default (durante transicao).
- Adicionar verificacao de inscricao:
  - Usuario precisa ter `Enrollment` ativo para acessar o curso.
  - Retornar 403/404 conforme regra desejada.

### 5) Ajustes no carregamento e validacao
- Refatorar `_load_course_payload(product_id)` e `_valid_slide_ids(product_id)`.
- Validar `slideId` contra o JSON do curso correto.
- Garantir cache por curso (LRU por `product_id`).

### 6) Controle de avancos (FREE/MONITORED)
- Mover `progress_mode` para `Enrollment` (por curso).
- Em `progress_overview`, retornar modo e resumo do curso atual.
- Em `progress_interaction`, registrar `required_seconds` e `time_met`
  por curso (sem misturar cursos).
- Garantir que `requiredSeconds/minDuration` sejam aplicados por curso
  conforme o JSON carregado.

### 7) Front-end e templates
- Enviar `productId` para o front-end (ex.: via contexto do template).
- Atualizar `static/js/main.js` para montar URLs com `productId`.
- Se existir tela de selecao de cursos, usar `Enrollment` para listar.

### 8) Admin e operacao
- Registrar `Course` e `Enrollment` no admin.
- Adicionar acao para matricular usuario em cursos.
- Documentar como adicionar um novo arquivo `protected/courses/<productId>.json`.

### 9) Documentacao
- Atualizar `Documentos_Ajuda/progresso.md` com multi-curso.
- Atualizar `Documentos_Ajuda/auth.md` (se houver impacto em login/fluxo).

### 10) Testes e validacao
- Criar testes:
  - Acesso a dados do curso exige inscricao.
  - Progresso isolado por curso (nao mistura slides).
  - Rotas antigas funcionam para curso default.
- Rodar `python manage.py check` e `python manage.py test`.
- Smoke:
  - Login, acesso ao curso A e B (usuarios inscritos).
  - POST `/progress/interaction/` registra no curso correto.

## Riscos e cuidados
- Migracao de dados: evitar perda de progresso.
- Conflitos de `slide_id` entre cursos (resolver com `course` + `slide_id`).
- Performance: cache por curso para nao recarregar JSON.

## Decisoes pendentes (precisam de confirmacao)
- Nome/estrutura final das rotas de curso.
- Como selecionar o curso no front-end (menu, query, perfil).
- Estrategia de fallback para `protected/data.json`.
