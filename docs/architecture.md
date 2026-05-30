# StudyOS System Architecture

StudyOS follows a traditional Model-View-Template (MVT) architecture powered by Django, augmented with external API integrations for Artificial Intelligence (Google Gemini).

## 1. High-Level Architecture
- **Frontend Layer**: HTML5 templates styled with Bootstrap 5, Vanilla CSS, and JavaScript. 
- **Application Layer**: Python/Django handling routing, business logic, form validation, and database ORM.
- **Data Layer**: PostgreSQL (Production) / SQLite (Development) relational database.
- **AI Integration Layer**: RESTful requests to Google Gemini's `gemini-2.5-flash` endpoint.

## 2. Request Flow
1. **User Request**: User clicks "Generate Quiz".
2. **Django Router**: `urls.py` directs the request to `quiz.views.ai_generate_quiz`.
3. **Controller/View Logic**: The view extracts the uploaded PDF file.
4. **Service Layer**: The file is passed to `quiz.services.ai_generator.generate_quiz_via_ai(file)`.
5. **AI Workflow**: 
   - `PyMuPDF` or `python-docx` extracts raw text from the file.
   - Text is embedded in an engineered prompt requesting a JSON array of MCQs.
   - Request is sent to Google Gemini API.
   - JSON response is validated using Pydantic.
6. **Data Persistence**: Validated questions are saved to PostgreSQL via Django ORM.
7. **Response**: User is redirected to the newly created Quiz dashboard.

## 3. Core Modules Interaction
- **Core (Auth)**: Manages Custom User model (`is_teacher`, `is_student`).
- **Classroom**: The central hub. Quizzes, Assignments, and Attendance all have foreign keys linking them back to a specific `Classroom`.
- **AI Learning**: Reads from `Classroom` context to provide subject-specific Chatbot answers.
- **Analytics**: Aggregates data from `QuizAttempt` and `AssignmentSubmission` to generate teacher-facing performance metrics.
