# StudyOS Security Report

**Review Date:** 2026-05-30
**Scope:** Full application security review covering authentication, authorization, session security, file handling, CSRF protection, secret management, and production hardening.

---

## 1. Secret Management — SECURE ✅

| Item | Status | Details |
|------|--------|---------|
| `SECRET_KEY` | ✅ Secure | Loaded via `django-environ` from `.env` file. Has `django-insecure-` prefix as fallback (development only). |
| `GEMINI_API_KEY` | ✅ Secure | Loaded via `os.environ.get("GEMINI_API_KEY")` in all service files. Raises `ValueError` if missing — fails loudly. |
| `DATABASE_URL` | ✅ Secure | Loaded via `dj-database-url.config()` from `DATABASE_URL` env var. |
| `.env` file | ✅ Gitignored | `.gitignore` explicitly blocks `.env`, `.env.local`, `.env.*.local` |
| `.env.example` | ✅ Present | Documents all required variables safely without real values. |

---

## 2. Authentication — SECURE ✅

- **Custom User Model:** `core.models.User` extends `AbstractUser` with `is_teacher` and `is_student` boolean flags. Dual-role assignment is prevented at the form level.
- **Django Auth Backend:** Standard `django.contrib.auth.backends.ModelBackend`. Session-based authentication.
- **Password Security:** Django's built-in `AUTH_PASSWORD_VALIDATORS` enforce minimum length, common password checks, and numeric-only prevention.
- **Session Security:** `SESSION_COOKIE_SECURE = True` when `DEBUG=False`. Sessions invalidated on logout via `django.contrib.auth.logout()`.
- **Login Redirect:** `LOGIN_URL = 'login'` and `LOGIN_REDIRECT_URL = 'dashboard'` correctly configured.

---

## 3. Authorization / RBAC — SECURE ✅

StudyOS implements strict Role-Based Access Control via custom mixins in `core/mixins.py`:

```python
class TeacherRequiredMixin(AccessMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not request.user.is_teacher:
            messages.error(request, "You do not have permission.")
            return redirect('dashboard')
        return super().dispatch(request, *args, **kwargs)
```

**Verified enforcement points:**
- Teacher quiz management views use `TeacherRequiredMixin`
- Student quiz-taking views use `StudentRequiredMixin`
- Teacher classroom views use `TeacherRequiredMixin`
- Teacher analytics views use `@user_passes_test(lambda u: u.is_teacher)`
- Student analytics views use `@user_passes_test(lambda u: not u.is_teacher)`
- Assignment teacher views use `TeacherRequiredMixin`
- Attendance teacher views use `TeacherRequiredMixin`
- Career assistant and study notes are accessible to both roles (by design)
- Export endpoints (PDF/CSV) are protected by `@user_passes_test(lambda u: u.is_teacher)`

**Object-level security:** All ORM queries that return teacher-owned objects are filtered by `teacher=request.user` at the queryset level. Teachers cannot access other teachers' classrooms, quizzes, or assignments.

---

## 4. CSRF Protection — SECURE ✅

- `django.middleware.csrf.CsrfViewMiddleware` is enabled in `MIDDLEWARE`.
- All HTML forms in templates use `{% csrf_token %}`.
- `CSRF_COOKIE_SECURE = True` is set when `DEBUG=False`.

---

## 5. File Upload Security — SECURE ✅

- **Allowed file types:** The AI quiz generator and study notes service check file extensions (`.pdf`, `.docx`, `.pptx`, `.txt`) before processing.
- **Upload paths:** `assignment/models.py` uses a dynamic upload function `assignment_upload_path()` that scopes files to `assignment_uploads/classroom_{id}/student_{id}/`. This prevents path traversal attacks.
- **Temporary file handling:** The AI quiz generator writes uploaded files to a `tempfile.NamedTemporaryFile` with `delete=False` and manually cleans up via `os.unlink()` after processing.
- **Media files:** `MEDIA_ROOT` is set to `BASE_DIR / 'media'` and is served separately from static files.

---

## 6. Production Security Headers — CONFIGURED ✅

When `DEBUG=False`, the following are activated in `settings.py`:

```python
SECURE_BROWSER_XSS_FILTER = True       # X-XSS-Protection header
SECURE_CONTENT_TYPE_NOSNIFF = True      # X-Content-Type-Options: nosniff
SESSION_COOKIE_SECURE = True            # Cookies only sent over HTTPS
CSRF_COOKIE_SECURE = True               # CSRF cookie only over HTTPS
X_FRAME_OPTIONS = 'DENY'               # Prevents clickjacking
```

**Outstanding deployment recommendations:**
- Set `SECURE_HSTS_SECONDS = 31536000` once HTTPS is confirmed working.
- Set `SECURE_SSL_REDIRECT = True` to force all HTTP→HTTPS redirects.
- These are not set by default to avoid breaking HTTP-only development environments.

---

## 7. SQL Injection — SECURE ✅

StudyOS uses Django's ORM exclusively. All database queries use parameterized ORM calls (`.filter()`, `.get()`, `.annotate()`). No raw SQL (`cursor.execute()`) is used anywhere in the codebase. Django's ORM automatically escapes all input values.

---

## 8. Logging Security — IMPROVED ✅

**Before:** All service error handlers used bare `print()` statements. In production, these are invisible and unauditable.

**After:** Replaced all 9 `print()` calls across 5 service files with `logging.getLogger(__name__)`. Django's `LOGGING` config now routes these to both the console and `logs/studyos.log`. The `logs/` directory is gitignored.
