# StudyOS Application Routes Overview

StudyOS follows standard Django view routing. Here is a high-level overview of the main user-facing routes and their functions.

## 1. Authentication (`core.urls`)
- `GET/POST /login/`: User login.
- `GET/POST /register/`: User registration.
- `POST /logout/`: Terminate session.
- `GET /dashboard/`: Redirects to Teacher or Student dashboard based on role.
- `GET /profile/<username>/`: Public portfolio view.

## 2. Classroom Management (`classroom.urls`)
- `GET /classrooms/`: (Teacher) View all managed classes.
- `GET /classrooms/student/`: (Student) View joined classes.
- `POST /classrooms/join/`: (Student) Join class via unique code.
- `GET /classrooms/<int:pk>/`: Detail view of a specific classroom.

## 3. Quiz & Assessments (`quiz.urls`)
- `POST /quizzes/ai-generate/`: (Teacher) Upload PDF and trigger Gemini AI quiz generation.
- `GET /quizzes/<int:pk>/take/`: (Student) Interactive quiz taking interface.
- `GET /quizzes/<int:pk>/result/`: (Student) Post-quiz result and correct answers review.

## 4. AI Tutors & Notes (`ai_learning.urls` & `study_notes.urls`)
- `GET/POST /ai/tutor/new/`: Start a new context-aware chat session with the AI.
- `GET/POST /study-notes/`: Upload lecture PDFs/PPTs to generate AI summaries and flashcards.

## 5. Career & Analytics (`career_assistant.urls` & `analytics.urls`)
- `GET/POST /career/`: Dashboard for AI Resume Analysis and Career Roadmap generation.
- `GET /analytics/teacher/`: Deep analytics dashboard for teachers.
- `GET /analytics/teacher/export/csv/`: Generate CSV report of all student grades.
- `GET /analytics/teacher/export/pdf/`: Generate PDF report of all student grades.
