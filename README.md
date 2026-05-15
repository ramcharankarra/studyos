# StudyOS 🎓

StudyOS is a full-stack, AI-powered educational platform designed to transform traditional classroom workflows into intelligent, personalized learning ecosystems. Built with modern web technologies, it provides distinct, feature-rich dashboards for Students, Teachers, and Administrators.

## Features ✨

### 👨‍🎓 For Students
- **Smart Quizzes:** Upload lecture notes and let the Gemini AI automatically generate multiple-choice quizzes and flashcards.
- **Academic Portfolio:** A dynamic profile page featuring Recharts visualizations of subject mastery and activity streaks.
- **Personalized Learning Path:** An AI-driven engine that analyzes weak topics and generates targeted study recommendations.
- **Assignment Hub:** Submit essays and links, and get instant "AI Teaching Assistant" feedback on your draft before submitting it to the real teacher.

### 👩‍🏫 For Teachers
- **Classroom Management:** Create subjects, generate unique invite codes, and monitor top-performing students via leaderboards.
- **Assignment Center:** Publish coursework, attach resources, and track real-time submission metrics.
- **Live Classes:** Schedule and manage Google Meet/Zoom links directly within the platform.
- **Student Inspection:** Click on any student to view their exact AI-generated academic profile to guide 1-on-1 interventions.

## Tech Stack 🛠️

- **Frontend:** React 19, Vite, Tailwind CSS 4, Framer Motion, Recharts
- **Backend/Database:** Firebase Authentication, Cloud Firestore
- **AI Integration:** Google Gemini API (`gemini-2.5-pro`)
- **Icons:** Lucide React

## Setup Instructions 🚀

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd StudyOS
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env.local` file in the root directory with your Firebase configuration and Gemini API Key:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   VITE_GEMINI_API_KEY="your_gemini_api_key"
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Deployment 🌐
StudyOS is configured for instant deployment on Vercel or Firebase Hosting.
- **Vercel:** A `vercel.json` file is included to handle React Router rewrites automatically.
- **Firebase:** A `firebase.json` and secure `firestore.rules` file are included.

## License
MIT
