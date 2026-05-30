# StudyOS Interview Guide

This guide provides deep-dive answers to common system design and behavioral questions based on the development of StudyOS.

## 1. Problem Statement & Why StudyOS Was Built
**The Problem:** Traditional Learning Management Systems (LMS) are often bloated, unintuitive, and lack modern capabilities like AI-assisted learning. Teachers spend hours manually creating assessments, and students lack personalized guidance when teachers are unavailable.
**The Solution:** StudyOS was built to bridge this gap by integrating generative AI directly into the classroom workflow. It empowers teachers to generate quizzes in seconds and provides students with an on-demand AI tutor, all wrapped in a sleek, modern UI.

## 2. System Design & Architecture
- **Monolith Architecture:** Built using Django (Python). Chose a monolithic architecture for rapid iteration and seamless data sharing between modules (auth, classrooms, quizzes) via Foreign Keys.
- **Database:** PostgreSQL (via Render). Chosen for robust relational integrity and JSONB support if needed for complex AI responses.
- **Frontend:** Server-Side Rendering (SSR) via Django Templates + Bootstrap 5. This eliminated the need for a separate SPA frontend (like React), reducing complexity and deployment overhead while maintaining high performance.

## 3. Database Design
- **Core Entities:** `User`, `Classroom`, `Enrollment`, `Quiz`, `Question`, `Choice`, `QuizAttempt`.
- **Key Relationships:** 
  - A `User` can be a teacher (creates Classrooms) or a student (enrolls in Classrooms).
  - A `QuizAttempt` ties a `Student`, a `Quiz`, and a `Score` together, utilizing a `UniqueConstraint` to prevent multiple attempts if configured.
- **Optimization:** Used `select_related()` (for ForeignKey) and `prefetch_related()` (for Reverse ForeignKey/Many-to-Many) in views to solve the N+1 query problem, drastically reducing database load on dashboards.

## 4. Authentication Flow
- Leveraged Django’s built-in authentication system with a custom `User` model extending `AbstractUser`.
- Added boolean flags (`is_teacher`, `is_student`) for Role-Based Access Control (RBAC).
- Used custom Mixins (`TeacherRequiredMixin`, `StudentRequiredMixin`) on Class-Based Views to enforce authorization at the routing level.

## 5. Gemini API Integration (The "Aha!" Moment)
- **Challenge:** Generating structured, parseable JSON from an LLM.
- **Solution:** Utilized `google-genai` and `pydantic` to enforce a strict JSON schema. The AI prompt explicitly requires a list of questions, each with a text prompt and exactly four choices (with one marked correct). 
- **Error Handling:** If the API fails or returns invalid JSON, the system gracefully deletes the empty draft quiz and alerts the teacher, preventing corrupted data from entering the database.

## 6. Challenges Faced
- **Challenge:** Managing complex state during Quiz Evaluation.
- **Solution:** Wrote a dedicated `evaluator.py` service. It iterates over `request.POST` data, validates the IDs, compares against the database using `Choice.objects.get(id=choice_id)`, and calculates the score. Abstracting this out of the View keeps the controller thin and testable.
- **Challenge:** Static Files in Production.
- **Solution:** Implemented `WhiteNoise` to allow Gunicorn to serve static files directly, avoiding the need for a separate Nginx container or AWS S3 bucket for CSS/JS.

## 7. Future Scope
- Implementing real-time WebSockets via Django Channels for live chat and notifications.
- Adding comprehensive video/audio uploading for assignments.
- Expanding the Analytics engine with predictive modeling to identify at-risk students earlier.
