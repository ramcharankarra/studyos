# StudyOS — Comprehensive Demo Walkthrough

This guide provides a step-by-step walkthrough of StudyOS from both the **Teacher** and **Student** perspectives. It contains concrete, actionable instructions and example data so you can easily demonstrate the full capabilities of the platform during interviews, in portfolios, or on live recordings.

---

## 1. Teacher Walkthrough

This section covers the typical workflow of an educator using StudyOS to manage classrooms, create content, take attendance, and view student progress metrics.

### Step 1: Teacher Registration & Login
1. Open the StudyOS home page and click on the **"Register"** button in the navigation bar.
2. In the registration form, enter the following details:
   - **Username:** `dr_python`
   - **Full Name:** `Dr. Charles Python`
   - **Email:** `teacher@studyos.edu`
   - **Password:** `StudyOSPass123!`
   - **Role:** Select the **"Teacher"** checkbox.
3. Click the **"Register"** button. Upon success, you will be redirected to the login page.
4. On the login page, enter your username (`dr_python`) and password (`StudyOSPass123!`), then click **"Login"**. You will land on the **Teacher Dashboard**.

### Step 2: Create a Classroom
1. On the Teacher Dashboard, click the **"Create Classroom"** button or navigate to the Classrooms tab and click **"New Classroom"**.
2. Enter the following classroom details:
   - **Classroom Name:** `Advanced Python Programming`
   - **Subject:** `Computer Science`
   - **Description:** `Master advanced concepts in Python including decorators, generators, metaclasses, and modern frameworks like Django.`
3. Click **"Save Classroom"**.
4. You will be redirected to the newly created classroom's detail page.

### Step 3: Retrieve and Share the Join Code
1. On the classroom detail page, locate the **"Class Code"** in the sidebar (formatted as `COMP-XXXXXX`, e.g., `COMP-A8F3D1`).
2. Copy this code. This is the unique code you will share with students so they can self-enroll in your classroom.

### Step 4: Create a Quiz (Manually & via AI)

#### Option A: Manual Quiz Creation
1. Inside the classroom page, click on the **"Quizzes"** tab, then click **"Create Quiz"**.
2. Fill out the general quiz details:
   - **Quiz Title:** `Python Decorators & Generators`
   - **Description:** `Test your understanding of decorator patterns, closing functions, and lazy evaluation with generator expressions.`
   - **Time Limit:** `15 minutes`
3. Click **"Save Quiz"** to create the quiz container.
4. On the quiz detail page, click **"Add Question"** to manually add a multiple-choice question:
   - **Question Text:** `Which keyword is used to yield values from a Python generator function?`
   - **Points:** `10`
   - **Choices:**
     - Add Choice: `return` (Is Correct: Unchecked)
     - Add Choice: `yield` (Is Correct: Checked)
     - Add Choice: `send` (Is Correct: Unchecked)
     - Add Choice: `await` (Is Correct: Unchecked)
5. Click **"Save Question"**.

#### Option B: AI-Powered Quiz Creation (From PDF Syllabus)
1. On the classroom details page under the Quizzes tab, click **"Generate Quiz with AI"**.
2. Enter the quiz details:
   - **Topic / Title:** `Python Object-Oriented Design`
   - **Number of Questions:** `5`
3. Click the **"Choose File"** button under **"Upload Reference PDF"** and select a PDF (e.g., `oop_syllabus.pdf`).
4. Click **"Generate with AI"**. The Gemini AI service will parse the PDF, extract core concepts, and automatically populate 5 multiple-choice questions with correct and incorrect options directly into the database.
5. Click the **"Publish Quiz"** button to make it visible to students.

### Step 5: Create an Assignment
1. In the classroom, click on the **"Assignments"** tab, then click **"Create Assignment"**.
2. Enter the following details:
   - **Title:** `Implementing a Custom Django Middleware`
   - **Description:** `Write a custom Django middleware that logs request execution times and writes them to a file named request_times.log. Submit your implementation as a Python (.py) or ZIP file.`
   - **Total Points:** `100`
   - **Deadline:** Select a date 7 days in the future, e.g., `2026-06-06 23:59`.
3. Click **"Save Assignment"**.
4. Click **"Publish Assignment"** to make it active for all enrolled students.

### Step 6: Take Attendance
1. In the classroom, click on the **"Attendance"** tab, then click **"New Session"**.
2. Fill out the attendance session details:
   - **Session Date:** Today's Date
   - **Topic/Title:** `Metaclasses and Dynamic Types`
   - **Start Time:** `10:00 AM`
   - **End Time:** `11:30 AM`
3. Click **"Create Session"**. You will see a list of all enrolled students in the classroom.
4. For each student, toggle the status:
   - Mark `Alice Smith` as **"Present"** (Green badge)
   - Mark `Bob Jones` as **"Absent"** (Red badge)
5. Click **"Save Attendance"** to persist the record.

### Step 7: View Analytics Dashboard
1. Go to the main navigation bar and click **"Analytics"** or **"Dashboard"**.
2. Review the beautifully rendered interactive dashboards powered by Chart.js, including:
   - **Average Quiz Score:** Displays performance across all active quizzes.
   - **Attendance Rate:** Displays overall student attendance percentage.
   - **Assignment Submission Rates:** Displays a bar chart tracking completed vs. missing homework submissions.

### Step 8: Export Reports (CSV & PDF)
1. On the Teacher Analytics Dashboard, locate the **"Export Data"** section.
2. Click **"Export Grades CSV"** to download a CSV file detailing all student names, quizzes attempted, scores, and assignment grades.
3. Click **"Export Class Performance PDF"** to generate and download a production-quality, beautifully formatted PDF report containing average marks, attendance summaries, and student rankings, styled using ReportLab.

### Step 9: Post Classroom Announcements
1. Inside the classroom, navigate to the **"Announcements"** tab.
2. Click **"New Announcement"**.
3. Fill out the announcement:
   - **Title:** `Upcoming Live Class on Python Advanced Typing`
   - **Content:** `Hi class, please review PEP 484 type hints before our session on Wednesday. We will be building a complete static analysis tool using abstract syntax trees.`
4. Click **"Post Announcement"**. All enrolled students will instantly see this announcement on their dashboard and receive a notification.

### Step 10: Schedule a Live Class
1. Inside the classroom, click the **"Live Classes"** tab, then click **"Schedule Live Class"**.
2. Enter the meeting metadata:
   - **Class Topic:** `Metaprogramming & Advanced AST Manipulation`
   - **Date & Time:** `Wednesday, 10:00 AM`
   - **Meeting Link:** `https://meet.google.com/abc-defg-hij`
3. Click **"Schedule Class"**. Students will see this live class card with a direct "Join Class" link on their dashboards.

### Step 11: AI-Powered Performance Coaching (AI Analytics)
1. Navigate to the classroom's **"AI Coaching"** page.
2. Click the **"Analyze Student Performance with AI"** button.
3. The platform gathers anonymized student grades, attendance metrics, and quiz speeds, sending a structured payload to the Gemini API.
4. Within seconds, a detailed, markdown-formatted performance coaching report is displayed, highlighting students who are falling behind, recommending personalized intervention paths, and detailing which core subjects need a refresher.

---

## 2. Student Walkthrough

This section covers the typical workflow of a student using StudyOS to enroll in classes, complete quizzes, submit work, and utilize AI studying tools.

### Step 1: Student Registration & Login
1. Open the StudyOS home page and click on the **"Register"** button in the navigation bar.
2. In the registration form, enter the following details:
   - **Username:** `alice_coder`
   - **Full Name:** `Alice Smith`
   - **Email:** `alice@studyos.edu`
   - **Password:** `StudentPass123!`
   - **Role:** Select the **"Student"** checkbox.
3. Click the **"Register"** button. Upon success, you will be redirected to the login page.
4. Login with your username (`alice_coder`) and password (`StudentPass123!`) to land on the **Student Dashboard**.

### Step 2: Join a Classroom
1. On the Student Dashboard, click the **"Join Classroom"** button.
2. Enter the unique code provided by Dr. Charles Python (e.g., `COMP-A8F3D1`).
3. Click **"Join Class"**.
4. You will instantly be enrolled and redirected to the classroom dashboard for **Advanced Python Programming**.

### Step 3: Take a Quiz
1. Inside the classroom, navigate to the **"Quizzes"** tab.
2. Locate the active quiz **"Python Decorators & Generators"** and click **"Start Quiz"**.
3. Read the questions and select your answers. For example, select `yield` for the generator keyword question.
4. Click **"Submit Quiz"** before the 15-minute timer expires.
5. The system will grade your quiz in real-time, displaying your score (e.g., `10/10` or `100%`) alongside detailed answers explaining why each option is correct or incorrect.

### Step 4: View Quiz Results & Leaderboard
1. After submitting, click the **"Leaderboard"** tab for the quiz.
2. Because multiple students (e.g., Bob, Charlie) have completed the quiz, you will see a gamified, beautiful leaderboard displaying ranks (Rank 1: `Alice Smith` with `100%`, Rank 2: `Bob Jones` with `80%`).

### Step 5: Submit an Assignment
1. Inside the classroom, navigate to the **"Assignments"** tab.
2. Locate the active assignment **"Implementing a Custom Django Middleware"** and click **"View Assignment"**.
3. Under the submission panel, click the file upload input and select a local python file (e.g., `middleware.py`).
4. Click **"Submit Assignment"**. Your submission status will change to **"Submitted"** with a green badge and display the submission date/time.

### Step 6: Use the AI Tutor
1. Navigate to the **"AI Tutor"** section from the sidebar or top navigation.
2. Select your classroom: `Advanced Python Programming`.
3. In the chat interface, enter your question: `What is the difference between a class decorator and a function decorator in Python?`
4. Click **"Ask Tutor"**. The Gemini AI Tutor reads your message, retrieves your classroom syllabus context, and provides a highly styled, clear explanation with Python code snippets highlighting differences in signature and state persistence.

### Step 7: Generate Study Notes from a PDF
1. Navigate to the **"Study Notes"** tab inside your dashboard.
2. Click **"Create Study Guide with AI"**.
3. Enter a title: `Understanding Metaclasses`.
4. Upload a reference PDF (e.g., a chapter about metaclasses, `metaclasses_chapter.pdf`).
5. Click **"Generate Study Guide"**. The Gemini API parses the PDF and returns a beautifully structured study guide featuring key terminologies, core concepts, summaries, code samples, and quick review questions. You can save, print, or review these notes on-demand.

### Step 8: Use the Career Assistant
1. Navigate to the **"Career Assistant"** section from the sidebar.
2. Click the **"Upload Resume"** panel and select your current draft resume PDF (e.g., `alice_resume_draft.pdf`).
3. Select your Target Job Title: `Backend Engineer`.
4. Click **"Analyze and Generate Roadmap"**.
5. The Gemini API runs an ATS-compatibility scan, parses your experience against typical backend expectations, and outputs:
   - **ATS Score:** e.g., `72/100`
   - **Key Deficiencies:** e.g., "Missing production cloud infrastructure experience; Needs stronger database indexing descriptions."
   - **Custom Learning Roadmap:** A personalized 4-week step-by-step roadmap recommending specific StudyOS classrooms to join, tasks to perform, and projects to add to your portfolio to secure a job as a Backend Engineer.

### Step 9: View Student Analytics
1. Navigate to your **"Student Performance"** tab.
2. View custom, beautiful charts detailing your progress:
   - **Personal Quiz Performance:** A line chart showing your quiz score progression.
   - **Attendance Breakdown:** A clean circular gauge showing your attendance standing (e.g., `92%`).
   - **Assignment Grade Distribution:** Highlighting how you rank relative to class averages.

### Step 10: View and Customize Your Public Portfolio
1. Go to **"Public Portfolio"** from your user profile dropdown.
2. This generates a gorgeous, resume-ready, interview-ready developer portfolio page featuring:
   - Your name, bio, and role.
   - **Verified Skills:** Automatically aggregated from your highest quiz score categories (e.g., `Python`, `Django Middleware`).
   - **Academic Credentials:** Verified classrooms completed and your grade point average.
   - **Top Achievements:** Badges unlocked (e.g., "Quiz Champion", "Attendance Star").
3. Click the **"Share Portfolio"** button to copy your unique public portfolio URL (e.g., `https://studyos.edu/portfolio/alice_coder`), ready to share with recruiters.
