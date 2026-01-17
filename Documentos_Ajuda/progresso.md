# Progresso

## Objetivo
- Documentar onde o progresso dos alunos e armazenado.
- Detalhar como o front-end registra o progresso e quais regras sao aplicadas.

## Onde o progresso fica salvo
- Banco de dados (SQLite por padrao no desenvolvimento e PostgreSQL em producao) no modelo `UserProgress`.
- Campos agregados em `Enrollment` guardam o ultimo estado por curso.
- `UserProfile` recebe espelho do curso default por compatibilidade.
- Modelos em `apps/accounts/models.py`.

## Fluxo principal
1) Front-end envia POST para `/courses/<productId>/progress/interaction/`.
2) View valida JSON, `slideId` e inscricao no curso.
3) Cria/atualiza registro em `UserProgress` (por curso).
4) Atualiza campos de resumo no `Enrollment` (e `UserProfile` no curso default).

## Endpoints relacionados
- `/courses/<productId>/progress/interaction/` (POST): registra interacao/progresso.
- `/courses/<productId>/progress/` (GET): retorna o resumo e entradas salvas.
- `/courses/<productId>/data.json` (GET): fornece o JSON do curso.
- Rotas em `apps/conteudo/urls.py` e views em `apps/conteudo/views.py`.

## Regras para registrar progresso
- Requer login (`@login_required`).
- `slideId` deve ser inteiro e existir no `protected/courses/<productId>.json`.
- Usuario precisa estar matriculado no curso (Enrollment ativo).
- JSON invalido retorna 400.
- Campos gravados:
  - `elements` (payload do front-end)
  - `time_met` (tempo minimo atingido)
  - `required_seconds`
  - `completed` e `completed_at`
- Ao completar um slide, `completed_at` e atualizado.
- `Enrollment` atualiza:
  - `last_interaction_at`
  - `last_viewed_slide_id`
  - `last_completed_slide_id` (mantem o maior id)
- `UserProfile` recebe espelho apenas para o curso default.

## Payload esperado (POST /courses/<productId>/progress/interaction/)
- `slideId` (int)
- `elements` (objeto)
- `timeMet` ou `time_met` (bool)
- `requiredSeconds` ou `required_seconds` (int)
- `completed` (bool)

## Validacoes e seguranca
- `slideId` e validado contra os IDs reais do `protected/courses/<productId>.json`.
- Views usam `@login_required` e exigem `Enrollment` ativo.
- A view nao expoe detalhes do JSON em caso de erro de parsing.

## Modo MONITORED
- O front-end envia `requiredSeconds`/`minDuration` conforme o JSON do curso.
- A view usa `required_seconds` para persistir o minimo por slide.

## Arquivos chave
- `apps/conteudo/views.py` (endpoints e validacao)
- `apps/conteudo/urls.py` (rotas)
- `apps/accounts/models.py` (Course, Enrollment, UserProgress, UserProfile)
- `protected/courses/<productId>.json` (IDs de slides)
