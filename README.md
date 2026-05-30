# StudyOS

**The Future of Intelligent Learning.**

StudyOS is a robust, AI-powered learning management system designed to streamline the educational experience for both teachers and students. Built with Django, it features intelligent tutoring, generative smart quizzes, advanced analytics, and a modern, responsive UI.

## 🚀 Features

- **Role-Based Access**: Dedicated workflows for Students and Teachers.
- **Classroom Management**: Create subjects, share codes, and enroll students seamlessly.
- **Smart Quizzes**: 
  - Teachers can generate entire quizzes via the Google Gemini API.
  - Automated grading and instant feedback.
  - Timed attempts and score percentage tracking.
- **Assignments**: Upload files, submit work, and manage grading effortlessly.
- **AI Academic Tutor**: Integrated Gemini-powered chat interface to help students with academic concepts.
- **Advanced Analytics**: Interactive dashboards using Chart.js to track class and individual performance trends.
- **Notifications & Attendance**: Real-time alerts and session-based attendance tracking (in development).

## 🛠️ Technology Stack

- **Backend**: Django 5 / Python 3
- **Database**: PostgreSQL (Production) / SQLite (Local)
- **Frontend**: Bootstrap 5, Vanilla CSS, Chart.js
- **AI Integration**: Google GenAI API (Gemini-2.5-Flash)
- **Deployment**: Render, Gunicorn, WhiteNoise

## 💻 Local Setup Instructions

1. **Clone the repository**
2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   DATABASE_URL=sqlite:///db.sqlite3
   GEMINI_API_KEY=your-google-gemini-api-key
   ALLOWED_HOSTS=*
   ```
5. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```
6. **Start Server**:
   ```bash
   python manage.py runserver
   ```

## 🚀 Deployment (Render)

This project is configured for automated deployment on [Render](https://render.com).
1. Connect your GitHub repository to Render.
2. The `render.yaml` blueprint will automatically create a Web Service and a PostgreSQL database.
3. Ensure you add the `GEMINI_API_KEY` manually in the Render dashboard environment variables.

## 🧪 Testing

Critical workflows are covered by Django's `TestCase`. Run the test suite using:
```bash
python manage.py test
```
