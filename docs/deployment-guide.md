# StudyOS Deployment Guide

StudyOS is pre-configured for a smooth, production-ready deployment on **Render** using a PostgreSQL database and WhiteNoise for static file serving.

## 1. Prerequisites
- A GitHub account holding the StudyOS repository.
- A Render account (render.com).
- A Google Gemini API Key.

## 2. Setting up the PostgreSQL Database on Render
1. In your Render Dashboard, click **New** -> **PostgreSQL**.
2. Name the database (e.g., `studyos-db`).
3. Select your region and instance type (Free tier is fine).
4. Once created, copy the **Internal Database URL** (if deploying the web app on Render) or **External Database URL**.

## 3. Deploying the Web Application
1. In your Render Dashboard, click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Use the following configuration:
   - **Environment**: Python
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn studyos.wsgi:application`
   - **Plan**: Free (or higher).

## 4. Environment Variables
Add the following Environment Variables in the Render interface before deploying:
- `PYTHON_VERSION` : `3.14.0` (or your preferred version)
- `DATABASE_URL` : Paste the PostgreSQL URL you copied earlier.
- `SECRET_KEY` : Generate a long, random string (e.g., via `python -c "import secrets; print(secrets.token_urlsafe(50))"`).
- `DEBUG` : `False` (Crucial for production security).
- `ALLOWED_HOSTS` : `your-render-app-name.onrender.com`
- `GEMINI_API_KEY` : Your Google Gemini API key.

## 5. Post-Deployment Steps
Once Render successfully builds and deploys the application:
1. Go to the "Shell" tab in the Render Dashboard for your Web Service.
2. Run the following command to create a superuser for accessing the Django Admin:
   ```bash
   python manage.py createsuperuser
   ```
3. Follow the prompts to set your admin username and password.
4. Visit `your-render-app-name.onrender.com/admin` to verify deployment and start configuring Classrooms!
