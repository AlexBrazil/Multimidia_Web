from pathlib import Path
import json
from functools import lru_cache

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, Http404, HttpResponseBadRequest
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.accounts.models import Course, Enrollment, UserProgress

COURSES_DIR = Path(settings.BASE_DIR) / "protected" / "courses"
DEFAULT_REQUIRED_SECONDS = 8


def _get_requested_product_id(request, product_id=None):
    if product_id:
        return product_id
    raw = request.GET.get("productId") or request.GET.get("product_id")
    return raw.strip() if raw else None


@lru_cache(maxsize=1)
def _get_default_course():
    return Course.objects.filter(is_default=True, is_active=True).first()


def _resolve_course(request, product_id=None):
    requested = _get_requested_product_id(request, product_id)
    if requested:
        course = Course.objects.filter(product_id=requested, is_active=True).first()
        if course:
            return course
        raise Http404("Curso nao encontrado.")
    course = _get_default_course()
    if course:
        return course
    raise Http404("Curso padrao nao configurado.")


def _require_enrollment(user, course: Course):
    enrollment = Enrollment.objects.filter(user=user, course=course, is_active=True).first()
    if not enrollment:
        raise PermissionDenied("Usuario nao matriculado neste curso.")
    if course.is_default:
        profile = getattr(user, "profile", None)
        if profile and enrollment.progress_mode != profile.progress_mode:
            enrollment.progress_mode = profile.progress_mode
            enrollment.save(update_fields=["progress_mode"])
    return enrollment


def _resolve_course_path(product_id):
    if not product_id:
        return None
    candidate = COURSES_DIR / f"{product_id}.json"
    return candidate if candidate.exists() else None


@lru_cache(maxsize=8)
def _load_course_payload(product_id=None):
    path = _resolve_course_path(product_id)
    if path is None:
        raise FileNotFoundError
    with path.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def _valid_slide_ids(product_id=None):
    payload = _load_course_payload(product_id)
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
def course_select(request):
    enrollments = (
        Enrollment.objects.filter(user=request.user, is_active=True, course__is_active=True)
        .select_related("course")
        .order_by("course__title", "course__product_id")
    )
    return render(request, "courses/select.html", {"enrollments": enrollments})


@login_required
def index(request, product_id=None):
    course = _resolve_course(request, product_id)
    _require_enrollment(request.user, course)
    return render(request, "index.html", {"course": course})


@login_required
@require_GET
def course_data(request, product_id=None):
    course = _resolve_course(request, product_id)
    _require_enrollment(request.user, course)
    try:
        payload = _load_course_payload(course.product_id)
    except FileNotFoundError as exc:
        raise Http404("O arquivo de curso nao foi encontrado.") from exc
    except json.JSONDecodeError:
        return JsonResponse({"error": "O arquivo do curso esta invalido."}, status=500)

    return JsonResponse(payload)


@login_required
@require_GET
def progress_overview(request, product_id=None):
    course = _resolve_course(request, product_id)
    enrollment = _require_enrollment(request.user, course)
    entries = UserProgress.objects.filter(user=request.user, course=course)
    data = {str(entry.slide_id): _serialize_progress_entry(entry) for entry in entries}
    response = {
        "mode": enrollment.progress_mode,
        "last_completed_slide_id": enrollment.last_completed_slide_id,
        "last_viewed_slide_id": enrollment.last_viewed_slide_id,
        "last_interaction_at": enrollment.last_interaction_at.isoformat()
        if enrollment.last_interaction_at
        else None,
        "slides": data,
    }
    return JsonResponse(response)


def _parse_payload(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return None


def _validate_slide_id(slide_id, product_id=None):
    try:
        slide_id = int(slide_id)
    except (TypeError, ValueError):
        return None
    try:
        valid_ids = _valid_slide_ids(product_id)
    except Exception:
        return None
    return slide_id if slide_id in valid_ids else None


@login_required
@require_POST
def progress_interaction(request, product_id=None):
    payload = _parse_payload(request)
    if payload is None:
        return HttpResponseBadRequest("JSON invalido.")

    course = _resolve_course(request, product_id)
    enrollment = _require_enrollment(request.user, course)
    slide_id = _validate_slide_id(
        payload.get("slideId"),
        course.product_id,
    )
    if slide_id is None:
        return HttpResponseBadRequest("slideId invalido.")

    elements = payload.get("elements") or {}
    time_met = bool(payload.get("timeMet") or payload.get("time_met"))
    required_seconds = int(payload.get("requiredSeconds") or payload.get("required_seconds") or DEFAULT_REQUIRED_SECONDS)
    completed = bool(payload.get("completed"))

    entry, _ = UserProgress.objects.get_or_create(
        user=request.user,
        course=course,
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

    now = timezone.now()
    enrollment.last_interaction_at = now
    enrollment.last_viewed_slide_id = slide_id
    if completed:
        current_last = enrollment.last_completed_slide_id or -1
        enrollment.last_completed_slide_id = max(current_last, slide_id)
    enrollment.save(update_fields=["last_interaction_at", "last_completed_slide_id", "last_viewed_slide_id"])

    if course.is_default:
        profile = getattr(request.user, "profile", None)
        if profile:
            profile.last_interaction_at = now
            profile.last_viewed_slide_id = slide_id
            if completed:
                current_last = profile.last_completed_slide_id or -1
                profile.last_completed_slide_id = max(current_last, slide_id)
            profile.save(update_fields=["last_interaction_at", "last_completed_slide_id", "last_viewed_slide_id"])

    return JsonResponse({"ok": True, "progress": _serialize_progress_entry(entry)})
