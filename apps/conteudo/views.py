from pathlib import Path
import json

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, Http404
from django.shortcuts import render
from django.views.decorators.http import require_GET

DATA_JSON_PATH = Path(settings.BASE_DIR) / "protected" / "data.json"


@login_required
def index(request):
    return render(request, "index.html")


@login_required
@require_GET
def course_data(request):
    try:
        with DATA_JSON_PATH.open(encoding="utf-8") as data_file:
            payload = json.load(data_file)
    except FileNotFoundError as exc:
        raise Http404("O arquivo data.json nao foi encontrado.") from exc
    except json.JSONDecodeError:
        return JsonResponse({"error": "O arquivo data.json esta invalido."}, status=500)

    return JsonResponse(payload)
