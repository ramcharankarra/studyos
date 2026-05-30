# Refactoring Recommendations

While StudyOS is currently feature-complete and highly optimized, the following architectural refactoring is recommended as the application scales to thousands of concurrent users:

## 1. Move to Asynchronous Task Queues (Celery)
**Issue:** When a teacher requests an AI-generated quiz, the HTTP request blocks until the Gemini API responds (2-5 seconds).
**Recommendation:** Implement **Celery + Redis**. When the form is submitted, dispatch a Celery task `generate_quiz_task.delay(topic)`. Return an immediate 202 Accepted to the user, and use WebSockets or polling to notify them when the quiz is ready.

## 2. Abstract "Fat Views" into Service Layers
**Issue:** While we successfully abstracted the quiz evaluator logic, some views (like `SessionCreateView`) still contain business logic (e.g., bulk creating `AttendanceRecord` objects).
**Recommendation:** Enforce a strict Service-Oriented Architecture (SOA) within the monolith. All views should only handle HTTP parsing and template rendering, delegating data manipulation to `attendance.services`.

## 3. Implement Caching Framework
**Issue:** The Analytics Engine runs heavy aggregations on the `QuizAttempt` and `AssignmentSubmission` tables.
**Recommendation:** Utilize Django's caching framework (with Redis backend). Cache the results of the Analytics dashboard for 15 minutes (`@cache_page(60 * 15)`) to drastically reduce DB load for frequently accessed pages.
