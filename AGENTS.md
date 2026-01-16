# AGENTS.md

## Objetivo
- Documentar regras locais para agentes e manter mudancas consistentes com a arquitetura do projeto.

## Gatilhos de contexto
- "analisar estrutura de pastas": procurar documento especifico da secao (ex.: `Documentos_Ajuda/estrutura-pastas.md`), ou `content.md` na pasta alvo; se nao existir, perguntar.
- "autenticacao": procurar documento especifico da secao (ex.: `Documentos_Ajuda/auth.md`), ou `content.md` na pasta alvo; se nao existir, perguntar.
- "progresso": procurar documento especifico da secao (ex.: `Documentos_Ajuda/progresso.md`), ou `content.md` na pasta alvo; se nao existir, perguntar.

## Resumo do projeto
- Projeto Django com apps: accounts (auth/cadastro/recuperacao), conteudo (curso/progresso), legal (termos).
- Front-end renderizado por templates e JS; dados do curso em `protected/data.json`.
- Assets estaticos em `static/` (publicos); protecao principal e sobre o JSON do curso.

## Fluxo principal do curso
1) Usuario autenticado acessa `/` -> `apps.conteudo.views.index` -> `templates/index.html`.
2) `static/js/main.js` faz fetch em `/data.json` -> `apps.conteudo.views.course_data`.
3) `static/js/renderer.js` monta o slide e chama elementos em `static/js/elements/`.
4) Em modo MONITORED, `main.js` envia POST `/progress/interaction/`.
5) `apps.conteudo.views.progress_interaction` persiste em `UserProgress` e atualiza `UserProfile`.

## Pastas e arquivos chave
- `core/`: settings, urls, wsgi/asgi.
- `apps/accounts/`: auth, cadastro, recuperacao, modelos.
- `apps/conteudo/`: index, data.json, progresso.
- `apps/legal/`: paginas legais.
- `templates/`: HTML principal e telas de conta.
- `static/`: JS/CSS e assets.
- `protected/data.json`: conteudo do curso (nao expor publicamente).

## Seguranca e dados
- Endpoints do curso/progresso usam `@login_required`.
- Nao registrar credenciais/tokens em logs.
- Evitar credenciais em URL; use POST/login normal ou links temporarios com TTL quando necessario.
- `progress_interaction` valida `slideId` contra IDs reais do JSON.

## Convencoes de edicao
- Preferir mudancas pequenas e isoladas.
- Evitar novas dependencias sem justificativa.
- Preservar estrutura do JSON e contratos usados pelo front-end.
- Evitar alterar CSS compartilhado quando o impacto em outros pontos nao for claro; prefira criar CSS novo e especifico para o componente, ou documente o reuso.
- Escopo primeiro: confirmar no codigo/arquivos relevantes antes de propor solucao; se nao encontrou, perguntar.
- Se houver `content.md` dentro da secao alvo, ler e seguir antes de propor mudancas nessa area.
- Usar progressive disclosure: ler apenas arquivos/trechos necessarios; ampliar escopo so quando houver bloqueio ou pedido explicito.
- Sem suposicoes: nao inventar endpoints, settings, modelos ou arquivos; citar o caminho do arquivo quando referenciar algo.
- Mudancas minimas: evitar refatoracoes amplas sem pedido.
- Validacao obrigatoria: quando possivel, rodar testes/checks; quando nao, declarar limitacoes.
- Impacto cruzado: evitar alterar CSS compartilhado sem verificar onde e usado.
- Em caso de duvida, listar 1-3 perguntas antes de alterar.
- Garantir que a nova versao cubra 100% dos casos de uso anteriores, salvo pedido explicito para remover algum caso.
- Templates de pagina completa devem estender `base.html`; se nao estenderem, incluir `<meta name="viewport">` no `<head>`. Nao aplicar a fragmentos/parciais.
- Para tarefas grandes, registrar o plano em `Documentos_Ajuda/PLAN.md` (ou `Documentos_Ajuda/plans/<tema>.md`) e atualizar o status a cada etapa.

## Modelo de refatoracao (Research / Plan / Implement)
- Research: localizar onde esta o comportamento, ler arquivos relacionados e identificar impacto.
- Plan: criar um plano de acao com visao geral e etapas antes de mudar.
- Implement: executar por etapas, com contexto reduzido, validando cada passo.

## Mudancas no `data.json`
- Garantir IDs unicos e consistentes.
- `requiredSeconds`/`minDuration` alimentam o modo MONITORED.
- Se alterar schema dos elementos, atualizar renderizacao em `static/js/elements/`.

## Ambiente e configuracao
- Variaveis em `.env` e `.env.prod.example` (SECRET_KEY, DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS).
- Dev usa SQLite por padrao (`db.sqlite3`).
- Cookies seguros e HSTS sao habilitados em producao.

## Testes e validacao
- `python manage.py check`
- `python manage.py test`
- Smoke: carregar `/login/` e `/` (autenticado) para validar fluxo do curso.
