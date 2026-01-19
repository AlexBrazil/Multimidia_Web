# Plano de deploy VPS (Nginx + Gunicorn) - atualizado

## Contexto
- VPS com Nginx + Gunicorn.
- Repo bare com hook de deploy.
- Banco PostgreSQL existente com usuarios antigos (sem Course/Enrollment).
- Cursos em `protected/courses/000001.json` e `protected/courses/000002.json`.

## Objetivos
- Publicar a versao atual do projeto.
- Garantir Course e Enrollment para todos os usuarios existentes.
- Validar fluxo MONITORED em producao.

## Preflight (antes do deploy)
- Fazer backup do banco (pg_dump).
- Confirmar env vars em `.env` conforme `.env.prod.example`.
- Confirmar que os JSONs de curso estao versionados no repo e nao estao no `.gitignore`.
- Verificar servicos (Gunicorn/Nginx) e paths de runtime.
- Confirmar que o hook roda como usuario correto e que existe permissao sudo sem senha para `systemctl restart minhacnhonline.service`.

## Hook atual (post-receive)
- Branch deployada: `main`.
- Checkout forcado em `WORK_TREE`.
- Instala dependencias via `requirements.txt` (pip).
- Exige `.env` no app; aborta se faltar.
- Roda `python manage.py migrate --noinput`.
- Roda `python manage.py collectstatic --noinput`.
- Reinicia `minhacnhonline.service`.

## Passos de deploy (ordem sugerida)
1) Fazer push para o repo bare (branch `main`) e observar logs do hook.
2) Confirmar que migrations e collectstatic rodaram no hook.
3) Confirmar que os JSONs de curso estao presentes em `/srv/minhacnhonline/app/protected/courses/`.
4) Rodar o script de criacao de cursos/matriculas.
5) Verificar se existe progresso antigo do curso 000002.
6) Se houver progresso antigo, executar o reset do 000002.
7) Smoke test: login, selecionar curso, navegar slides, MONITORED.

## Como verificar servicos e paths (detalhado)
Executar na VPS:

```bash
# Servicos
systemctl status nginx
systemctl status minhacnhonline.service

# Logs recentes
journalctl -u minhacnhonline.service -n 200 --no-pager
journalctl -u nginx -n 200 --no-pager

# Paths esperados pelo hook
ls -la /srv/minhacnhonline/app
ls -la /srv/minhacnhonline/venv
ls -la /srv/minhacnhonline/app/.env
ls -la /srv/minhacnhonline/app/protected/courses

# (Opcional) Ativar venv para rodar checks
source /srv/minhacnhonline/venv/bin/activate
cd /srv/minhacnhonline/app
python manage.py check
deactivate
```

## Script: criar cursos e matriculas
Executar na VPS (com venv ativa):

```bash
source /srv/minhacnhonline/venv/bin/activate
cd /srv/minhacnhonline/app
python manage.py shell
```

Cole o script abaixo no shell e execute:

```python
from django.contrib.auth import get_user_model
from apps.accounts.models import Course, Enrollment

User = get_user_model()

courses = [
    {"product_id": "000001"},
    {"product_id": "000002"},
]

course_objs = []
for payload in courses:
    course, _ = Course.objects.get_or_create(
        product_id=payload["product_id"],
        defaults={"is_active": True, "is_default": False},
    )
    course_objs.append(course)

users = User.objects.all()
for user in users:
    for course in course_objs:
        Enrollment.objects.get_or_create(
            user=user,
            course=course,
            defaults={"is_active": True},
        )
```

Saia do shell com `exit()` e desative a venv:

```bash
deactivate
```

## Checagem: existe progresso antigo do 000002?
Executar no `python manage.py shell`:

```python
from apps.accounts.models import Course, UserProgress

Course.objects.filter(product_id="000002").exists()
UserProgress.objects.filter(course__product_id="000002").count()
```

Se o curso nao existir e/ou a contagem for 0, o reset pode ser ignorado.

## Script: reset do progresso do curso 000002 (opcional)
Executar no `python manage.py shell`:

```python
from django.db import transaction
from apps.accounts.models import Course, Enrollment, UserProgress

course = Course.objects.get(product_id="000002")
enrollments = Enrollment.objects.filter(course=course)

with transaction.atomic():
    UserProgress.objects.filter(course=course).delete()
    enrollments.update(
        last_viewed_slide_id=None,
        last_completed_slide_id=None,
        last_interaction_at=None,
    )
```

## Checklist de validacao
- `python manage.py check` sem erros.
- Login funciona e mostra tela de selecao de cursos.
- Curso 000001: avanco MONITORED libera o proximo slide apos tempo/interacoes.
- Curso 000002: avanco MONITORED libera o proximo slide apos tempo/interacoes.
- `/courses/<productId>/data.json` responde 200 autenticado.

## Acoes futuras (hardening)
- Rotacionar `DJANGO_SECRET_KEY` e senha do banco em uma janela de manutencao.
- Garantir que `DJANGO_DB_URL` use senha URL-encoded se tiver caracteres especiais.

## Rollback
- Restaurar backup do banco (pg_restore).
- Voltar para a tag/commit anterior no repo e reiniciar Gunicorn.
