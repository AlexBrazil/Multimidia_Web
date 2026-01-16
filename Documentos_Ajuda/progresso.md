# Progresso

## Objetivo
- Documentar onde o progresso dos alunos e armazenado.
- Detalhar como o front-end registra o progresso e quais regras sao aplicadas.

## Onde o progresso fica salvo
- Banco de dados (SQLite por padrao no desenvolvimento e PosttgreSQL em produção) no modelo `UserProgress`.
- Campos agregados no `UserProfile` guardam o ultimo estado.
- Modelos em `apps/accounts/models.py`.

## Fluxo principal
1) Front-end envia POST para `/progress/interaction/`.
2) View valida JSON e `slideId`.
3) Cria/atualiza registro em `UserProgress`.
4) Atualiza campos de resumo no `UserProfile`.

## Endpoints relacionados
- `/progress/interaction/` (POST): registra interacao/progresso.
- `/progress/` (GET): retorna o resumo e entradas salvas.
- Rotas em `apps/conteudo/urls.py` e views em `apps/conteudo/views.py`.

## Regras para registrar progresso
- Requer login (`@login_required`).
- `slideId` deve ser inteiro e existir no `protected/data.json`.
- JSON invalido retorna 400.
- Campos gravados:
  - `elements` (payload do front-end)
  - `time_met` (tempo minimo atingido)
  - `required_seconds`
  - `completed` e `completed_at`
- Ao completar um slide, `completed_at` e atualizado.
- `UserProfile` atualiza:
  - `last_interaction_at`
  - `last_viewed_slide_id`
  - `last_completed_slide_id` (mantem o maior id)

## Payload esperado (POST /progress/interaction/)
- `slideId` (int)
- `elements` (objeto)
- `timeMet` ou `time_met` (bool)
- `requiredSeconds` ou `required_seconds` (int)
- `completed` (bool)

## Validacoes e seguranca
- `slideId` e validado contra os IDs reais do `protected/data.json`.
- Views usam `@login_required`.
- A view nao expõe detalhes do JSON em caso de erro de parsing.

## Modo MONITORED
- O front-end envia `requiredSeconds`/`minDuration` conforme o JSON do curso.
- A view usa `required_seconds` para persistir o minimo por slide.

## Arquivos chave
- `apps/conteudo/views.py` (endpoints e validacao)
- `apps/conteudo/urls.py` (rotas)
- `apps/accounts/models.py` (UserProgress, UserProfile)
- `protected/data.json` (IDs de slides)
