# Top Interview Questions for StudyOS

This guide prepares you for the most likely questions you will face when presenting StudyOS in a technical interview.

## System Design & Architecture
**1. Why did you choose Django instead of a Microservices architecture for this project?**
*Answer:* For a startup-scale Learning Management System built by a solo developer, a Monolithic architecture via Django allowed for rapid iteration and high cohesion. Microservices would have introduced unnecessary complexity (network latency, distributed transactions) without immediate scaling benefits. Django’s built-in ORM and Auth made building the relational data models seamless.

**2. How did you design the database schema to handle Quiz attempts securely?**
*Answer:* The core tables are `Quiz`, `Question`, `Choice`, and `QuizAttempt`. To ensure data integrity, I used a `UniqueConstraint` on the `QuizAttempt` table combining the `student_id` and `quiz_id`. This prevents a student from accidentally submitting multiple attempts for a single-attempt quiz at the database level.

## Authentication & Security
**3. How does StudyOS handle Role-Based Access Control?**
*Answer:* I extended Django’s `AbstractUser` to include boolean flags (`is_teacher`, `is_student`). I then wrote custom class-based view mixins (`TeacherRequiredMixin`) that override the `dispatch` method to check these flags. If a student tries to access a teacher route, they are immediately served a 403 Forbidden or redirected.

**4. What steps did you take to secure the application for production?**
*Answer:* I moved all sensitive keys (Secret Key, Database URL, Gemini API Key) to environment variables using `django-environ`. I enforced CSRF protection on all POST requests, utilized `WhiteNoise` for secure static file delivery, and configured secure headers (X-Frame-Options) in the production settings.

## AI Integration (Gemini)
**5. How did you force the Google Gemini API to return structured data?**
*Answer:* LLMs inherently output unstructured text. To integrate this into a relational database, I used the `google-genai` SDK combined with `pydantic`. I defined a strict JSON schema for a "Quiz" (containing a list of questions and choices) and passed this schema in the API request payload, ensuring the response could be reliably parsed and saved to the DB.

**6. What happens if the Gemini API goes down or returns a timeout?**
*Answer:* The application handles the failure gracefully. The quiz generation logic runs in a `try/except` block. If the API fails, the partially created `Quiz` instance is rolled back/deleted, and a Django `messages.error` alert is displayed to the user on the frontend, ensuring no corrupted data remains.

## Database Optimization
**7. What is the N+1 query problem and how did you solve it in StudyOS?**
*Answer:* The N+1 problem occurs when querying a list of objects, and then making a separate database query for a related object for each item in that list. In the analytics dashboards, I solved this by using `select_related()` for ForeignKey relationships (like getting the Classroom for an Attendance Session) and `prefetch_related()` for reverse relationships (like getting all Questions for a Quiz) in a single optimized query.

**8. Why use PostgreSQL over SQLite in production?**
*Answer:* While SQLite is great for local development, PostgreSQL handles concurrent writes significantly better, which is crucial for an application where 30 students might submit a quiz simultaneously. 

## Notifications & Signals
**9. How do you trigger notifications without blocking the main application flow?**
*Answer:* I utilized Django Signals (`post_save`). When a `Quiz` is created and marked as published, the signal automatically fires and creates `Notification` records for every enrolled student. 

**10. How would you scale the notification system in the future?**
*Answer:* Currently, notifications are written synchronously to the database. At scale, I would move this to an asynchronous message broker like Redis + Celery, or use Django Channels to push real-time WebSocket alerts to the client.
