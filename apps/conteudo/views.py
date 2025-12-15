from pathlib import Path
import json
from functools import lru_cache

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, Http404, HttpResponseBadRequest
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.accounts.models import UserProgress

DATA_JSON_PATH = Path(settings.BASE_DIR) / "protected" / "data.json"
DEFAULT_REQUIRED_SECONDS = 8


@lru_cache(maxsize=1)
def _load_course_payload():
    with DATA_JSON_PATH.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def _valid_slide_ids():
    payload = _load_course_payload()
    ids = []

    def walk(items):
        for item in items or []:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "Slide" and "id" in item:
                ids.append(item["id"])
            if isinstance(item.get("items"), list):
                walk(item["items"])

    walk(payload.get("items", []))
    return set(ids)


def _serialize_progress_entry(entry: UserProgress):
    return {
        "slideId": entry.slide_id,
        "elements": entry.elements or {},
        "time_met": entry.time_met,
        "required_seconds": entry.required_seconds,
        "completed": entry.completed,
        "updated_at": entry.updated_at.isoformat(),
        "completed_at": entry.completed_at.isoformat() if entry.completed_at else None,
    }


@login_required
def index(request):
    return render(request, "index.html")


@login_required
@require_GET
def course_data(request):
    try:
        payload = _load_course_payload()
    except FileNotFoundError as exc:
        raise Http404("O arquivo data.json nao foi encontrado.") from exc
    except json.JSONDecodeError:
        return JsonResponse({"error": "O arquivo data.json esta invalido."}, status=500)

    return JsonResponse(payload)


@login_required
@require_GET
def progress_overview(request):
    profile = getattr(request.user, "profile", None)
    if profile is None:
        return JsonResponse(
            {
                "mode": "FREE",
                "last_completed_slide_id": None,
                "last_viewed_slide_id": None,
                "last_interaction_at": None,
                "slides": {},
            }
        )
    entries = UserProgress.objects.filter(user=request.user)
    data = {str(entry.slide_id): _serialize_progress_entry(entry) for entry in entries}
    response = {
        "mode": profile.progress_mode,
        "last_completed_slide_id": profile.last_completed_slide_id,
        "last_viewed_slide_id": profile.last_viewed_slide_id,
        "last_interaction_at": profile.last_interaction_at.isoformat()
        if profile.last_interaction_at
        else None,
        "slides": data,
    }
    return JsonResponse(response)


def _parse_payload(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _validate_slide_id(slide_id):
    try:
        slide_id = int(slide_id)
    except (TypeError, ValueError):
        return None
    try:
        valid_ids = _valid_slide_ids()
    except Exception:
        return None
    return slide_id if slide_id in valid_ids else None


@login_required
@require_POST
def progress_interaction(request):
    payload = _parse_payload(request)
    if payload is None:
        return HttpResponseBadRequest("JSON invalido.")

    slide_id = _validate_slide_id(payload.get("slideId"))
    if slide_id is None:
        return HttpResponseBadRequest("slideId invalido.")

    elements = payload.get("elements") or {}
    time_met = bool(payload.get("timeMet") or payload.get("time_met"))
    required_seconds = int(payload.get("requiredSeconds") or payload.get("required_seconds") or DEFAULT_REQUIRED_SECONDS)
    completed = bool(payload.get("completed"))

    entry, _ = UserProgress.objects.get_or_create(
        user=request.user,
        slide_id=slide_id,
        defaults={
            "elements": elements,
            "time_met": time_met,
            "required_seconds": required_seconds,
            "completed": completed,
            "completed_at": timezone.now() if completed else None,
        },
    )

    entry.elements = elements
    entry.time_met = time_met or entry.time_met
    entry.required_seconds = required_seconds
    if completed and not entry.completed:
        entry.completed = True
        entry.completed_at = timezone.now()
    entry.save()

    profile = getattr(request.user, "profile", None)
    if profile:
        now = timezone.now()
        profile.last_interaction_at = now
        profile.last_viewed_slide_id = slide_id
        if completed:
            current_last = profile.last_completed_slide_id or -1
            profile.last_completed_slide_id = max(current_last, slide_id)
        profile.save(update_fields=["last_interaction_at", "last_completed_slide_id", "last_viewed_slide_id"])

    return JsonResponse({"ok": True, "progress": _serialize_progress_entry(entry)})
