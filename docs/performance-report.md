# StudyOS Performance Optimization Report

**Review Date:** 2026-05-30
**Scope:** ORM query optimization, view-layer performance, and production configuration.

---

## Summary of Optimizations

| Area | Issue Found | Optimization Applied | Impact |
|------|-------------|---------------------|--------|
| `profile_view` | Python-loop average calculation (N+1) | `Avg()` aggregation + `select_related()` | 1 query vs N queries |
| `profile_view` | No `select_related` on quiz/assignment querysets | Added `select_related('quiz', 'quiz__classroom')` | Eliminates 2N queries |
| Analytics: student | Per-classroom queries in a for-loop | Already uses Django `Avg()` and `ExpressionWrapper` | Good |
| Analytics: teacher | Participation rate calculation | Already uses `Count()` aggregation | Good |
| Quiz list view | Teacher quiz list | Already uses `.select_related('classroom')` | Good |
| Static files | Whitenoise with compression | `CompressedManifestStaticFilesStorage` | Gzip/Brotli compression |
| Logging | `print()` in service error handlers | Replaced with `logger.error()` | No stdout I/O in production |

---

## 1. Profile View — N+1 Fixed (core/views.py)

### Before
```python
quiz_attempts = QuizAttempt.objects.filter(student=profile_user, status='Submitted')
# This Python loop hits the DB once per attempt to access qa.percentage
total_pct = sum(a.percentage for a in quiz_attempts if a.percentage)
avg_score = total_pct / total_quizzes
```

**Problem:** `sum(a.percentage for a in quiz_attempts ...)` iterates over N quiz attempts in Python, fetching each row from the DB individually. Also, without `select_related`, accessing `qa.quiz.title` in the template triggers a separate query per attempt.

### After
```python
quiz_attempts = (
    QuizAttempt.objects
    .filter(student=profile_user, status='Submitted')
    .select_related('quiz', 'quiz__classroom')    # JOIN: 1 query covers all
    .order_by('-submitted_at')
)
avg_score = quiz_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
```

**Result:** From O(N) queries to O(1) — a single SQL `AVG()` calculation replaces N Python iterations.

---

## 2. Analytics Service — Already Optimized

The `analytics/services.py` file demonstrates excellent ORM practices:

- Uses `Avg()`, `Count()`, `F()`, `ExpressionWrapper()` for server-side calculations.
- Filters `QuizAttempt` and `AssignmentSubmission` with explicit classroom scoping to avoid full-table scans.
- Returns calculated JSON arrays for Chart.js — no per-row processing in views.

---

## 3. Quiz List View — Already Optimized

`TeacherQuizListView.get_queryset()` in `quiz/views.py`:
```python
qs = Quiz.objects.filter(teacher=self.request.user).select_related('classroom')
```
Uses `select_related('classroom')` to avoid N+1 when rendering classroom names in the list template.

---

## 4. Static File Performance — Production Configured

WhiteNoise with `CompressedManifestStaticFilesStorage` is configured:
- **Gzip + Brotli compression** applied to all static files at `collectstatic` time.
- **Content hashing** appended to filenames (e.g., `style.abc123.css`) enables infinite browser cache TTL.
- **Zero-copy serving:** WhiteNoise serves files from memory without Django middleware overhead.

---

## 5. Database Indexing

| Field | Model | Index Type | Notes |
|-------|-------|------------|-------|
| `class_code` | `Classroom` | Unique Index | Auto-created by `unique=True` |
| `username` | `User` | Unique Index | Django default |
| `student + quiz` | `QuizAttempt` | Unique Constraint | Auto-created by `UniqueConstraint` |
| `student + classroom` | `Enrollment` | Unique Constraint | Auto-created by `UniqueConstraint` |
| `assignment + student` | `AssignmentSubmission` | Unique Constraint | Auto-created by `unique_together` |
| `attendance_session + student` | `AttendanceRecord` | Unique Constraint | Auto-created by `unique_together` |

All high-frequency lookup fields have database-level constraints that create implicit indexes, ensuring fast lookups.

---

## 6. Recommendations for Future Optimization

- **Caching:** Add Redis-backed Django caching for the teacher analytics dashboard (data doesn't change in real time). Use `@cache_page(60 * 15)` on `teacher_analytics` view.
- **Pagination:** `TeacherQuizListView` already has `paginate_by = 10`. Ensure all other list views have pagination.
- **Database connection pooling:** `conn_max_age=600` is already set in `dj-database-url.config()` for persistent connections.
- **Async AI calls:** Long-running Gemini API calls (quiz generation, study notes) block the WSGI thread. A future enhancement is to use Django Q or Celery to run these as background tasks.
