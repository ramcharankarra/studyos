# StudyOS: AI-Powered Educational Platform

![StudyOS Header](docs/screenshots/header.png)

[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Gemini API](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Render](https://img.shields.io/badge/Render-%46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

**StudyOS** is a comprehensive, feature-complete Learning Management System (LMS) enhanced by cutting-edge Generative AI (Google Gemini). It transforms traditional online learning by automating administrative overhead for teachers, and providing highly personalized, responsive tutoring and career guidance for students.

## 🎯 Problem It Solves
Traditional LMS platforms are static portals for uploading assignments. They lack interactivity, and teachers spend countless hours grading and creating materials. StudyOS solves this by introducing AI into the core workflow:
- **For Teachers**: Instantly generates quizzes from uploaded PDFs, provides deep behavioral analytics, and automates grading.
- **For Students**: Offers an on-demand AI Tutor, automatically extracts study notes from lecture slides, and generates personalized career roadmaps to bridge the gap between academia and industry.

## ✨ Features

- **Robust Authentication:** Secure registration and login for both Student and Teacher roles.
- **Classroom Management:** Teachers can create subjects, launch classrooms, and manage student enrollments.
- **AI Quiz Generation:** Teachers upload PDF/DOCX materials, and the AI automatically generates MCQs with varying difficulty levels.
- **Assignment System:** Complete workflow for assigning tasks, student submissions, and teacher grading.
- **AI Tutor Engine:** A context-aware chatbot that helps students understand concepts (not just giving answers) based on their enrolled subjects.
- **AI Study Notes Generator:** Automatically extracts summaries, key concepts, and flashcards from uploaded PDFs, PPTs, and Word docs.
- **Career Assistant:** Analyzes student resumes against ATS standards and generates personalized, step-by-step career roadmaps based on dream jobs.
- **Public Portfolios:** Aggregates a student's quiz scores, badges, and career goals into a public-facing `/profile/<username>` URL.
- **Advanced Analytics:** AI-driven insights for teachers to identify at-risk students and frequently missed topics.
- **Global Theme System:** 5 dynamic, persistent UI themes (Blue Academic, Purple Learning, Green Success, Orange Energy, Minimal Professional).
- **Communication & Live Classes:** Integrated messaging system and live class scheduling.
- **Export System:** 1-click CSV and PDF report generation for class analytics.

## 🛠 Technology Stack

- **Backend:** Python, Django
- **Database:** PostgreSQL (production), SQLite (local dev)
- **AI Engine:** Google Gemini Pro API (`gemini-2.5-flash`)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, Chart.js
- **Deployment:** Render (PaaS), WhiteNoise (Static Files), Gunicorn

## 🚀 Installation Guide

### Prerequisites
- Python 3.10+
- PostgreSQL (optional for local, required for prod)
- Google Gemini API Key

### Local Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/ramcharankarra/studyos.git
   cd studyos
   ```
2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` to the `.env` file.

5. **Run Migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
6. **Start the Development Server**
   ```bash
   python manage.py runserver
   ```
   Access the application at `http://127.0.0.1:8000/`.

## 🌍 Deployment Guide
StudyOS is optimized for deployment on Render.

1. Create a new Web Service on Render and connect this repository.
2. Set the Build Command: `./build.sh`
3. Set the Start Command: `gunicorn studyos.wsgi:application`
4. Add the following Environment Variables in the Render dashboard:
   - `PYTHON_VERSION`: `3.14.0` (or your preferred version)
   - `SECRET_KEY`: (Generate a secure random string)
   - `DEBUG`: `False`
   - `DATABASE_URL`: (Your Render PostgreSQL connection string)
   - `GEMINI_API_KEY`: (Your Google Gemini API Key)
   - `ALLOWED_HOSTS`: `your-app.onrender.com`

## 📂 Documentation Structure
Check the `/docs` folder for deep dives into the architecture and design of StudyOS:
- [System Architecture](docs/architecture.md)
- [Database Design & ER Diagram](docs/database-design.md)
- [API & Service Overview](docs/api-overview.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Recruiter Summary](docs/recruiter-summary.md)
- [Future Roadmap](docs/future-roadmap.md)

---
*Built with ❤️ for modern education.*
