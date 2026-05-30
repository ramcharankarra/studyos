import os
import time
from django.utils import timezone
from google import genai
from .models import ChatMessage, LearningInsight, AILog
from quiz.models import QuizAttempt, Question
from assignment.models import AssignmentSubmission

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=api_key)

def chat_with_tutor(session, message_text):
    """
    Sends a message to the Gemini API, maintaining conversation history.
    Saves the user message and the model's response to the DB.
    """
    client = get_gemini_client()
    
    # Save the user's message
    ChatMessage.objects.create(session=session, role='user', content=message_text)
    
    # Retrieve past messages to build history
    past_messages = session.messages.order_by('timestamp')
    
    # Construct the intelligent system prompt
    system_prompt = """You are an advanced academic AI tutor. Your goal is to provide highly structured, educational responses based on the user's intent.
Analyze the user's request and follow these exact formatting rules:

1. If the user asks for a DEFINITION (e.g., "What is X?", "Define Y"):
   Provide a short, concise explanation (2-5 sentences).

2. If the user asks you to EXPLAIN a concept (e.g., "Explain X"):
   Provide a detailed explanation structured exactly like this:
   - **Definition**: Brief summary.
   - **How it works**: Concept breakdown.
   - **Example**: A clear, relatable example.
   - **Use Cases**: Real-world applications.

3. If the user asks "HOW" something works (e.g., "How does X work?"):
   Provide a step-by-step numbered workflow followed by a concrete example.

4. If the user asks for a COMPARISON (e.g., "X vs Y"):
   Provide a Markdown table comparing the two, followed by Pros, Cons, and Use Cases for both.

5. If the user asks a CODING question (e.g., "Write code for X", "Fix this code"):
   Provide:
   - The Code (in markdown blocks).
   - Explanation of the code.
   - Time Complexity (if applicable).
   - Best Practices.

DO NOT give direct answers to assignments or quizzes without explaining the underlying concepts. Maintain context of previous messages.
"""
    
    chat_history = system_prompt + "\n\nConversation History:\n"
    for msg in past_messages:
        role_label = "Student" if msg.role == 'user' else "Tutor"
        chat_history += f"{role_label}: {msg.content}\n\n"
    
    chat_history += "Tutor: "

    start_time = time.time()
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=chat_history,
        )
        
        reply_text = response.text
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Save model's response
        ChatMessage.objects.create(session=session, role='model', content=reply_text)
        
        # Log Success
        AILog.objects.create(
            user=session.student,
            question=message_text,
            response_time_ms=response_time_ms,
            is_error=False
        )
        
        # Optionally update session title if it's the first message
        if session.title == "New Conversation" and past_messages.count() <= 2:
            try:
                title_response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=f"Generate a short (max 4 words) title for this question. Do not include quotes. Question: {message_text}",
                )
                session.title = title_response.text.strip().replace('"', '')
                session.save()
            except Exception:
                pass # Fail silently if title generation fails
            
        return reply_text
    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        print(f"Error chatting with tutor: {error_msg}")
        
        # Log Error
        AILog.objects.create(
            user=session.student,
            question=message_text,
            response_time_ms=response_time_ms,
            is_error=True,
            error_message=error_msg
        )
        
        fallback_msg = "AI service is temporarily unavailable. Please try again in a few moments."
        ChatMessage.objects.create(session=session, role='model', content=fallback_msg)
        return fallback_msg

def generate_student_insights(student):
    """
    Analyzes a student's quiz and assignment performance.
    Uses Gemini to generate strengths, weaknesses, and recommendations.
    Saves them to LearningInsight.
    """
    client = get_gemini_client()
    
    # Gather Data
    quiz_attempts = QuizAttempt.objects.filter(student=student).select_related('quiz')
    assignment_submissions = AssignmentSubmission.objects.filter(student=student, status='Graded').select_related('assignment')
    
    if not quiz_attempts.exists() and not assignment_submissions.exists():
        return False
        
    data_summary = f"Student Performance Data for {student.full_name}:\n\n"
    
    data_summary += "Quizzes:\n"
    for qa in quiz_attempts:
        data_summary += f"- {qa.quiz.title}: {qa.score}/{qa.quiz.total_marks}\n"
        
    data_summary += "\nAssignments:\n"
    for sub in assignment_submissions:
        data_summary += f"- {sub.assignment.title}: {sub.grade}/{sub.assignment.max_marks}\n"
        if sub.feedback:
            data_summary += f"  Feedback: {sub.feedback}\n"
            
    prompt = data_summary + """
    
    Based on the above academic performance data, generate an analysis in JSON format containing exactly these three keys:
    1. "strength": A short paragraph summarizing the student's strongest areas.
    2. "weakness": A short paragraph summarizing the areas where the student struggles the most.
    3. "recommendation": An actionable study plan or recommendation to improve.
    """
    
    try:
        from pydantic import BaseModel
        class InsightOutput(BaseModel):
            strength: str
            weakness: str
            recommendation: str

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': InsightOutput,
                'temperature': 0.2,
            },
        )
        import json
        insights = json.loads(response.text)
        
        # Clear old insights
        LearningInsight.objects.filter(student=student).delete()
        
        # Save new insights
        LearningInsight.objects.create(student=student, insight_type='strength', content=insights['strength'])
        LearningInsight.objects.create(student=student, insight_type='weakness', content=insights['weakness'])
        LearningInsight.objects.create(student=student, insight_type='recommendation', content=insights['recommendation'])
        
        return True
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        return False

def generate_class_insights(classroom):
    """
    Analyzes the performance of an entire classroom.
    """
    client = get_gemini_client()
    
    quiz_attempts = QuizAttempt.objects.filter(quiz__classroom=classroom).select_related('quiz', 'student')
    assignments = AssignmentSubmission.objects.filter(assignment__classroom=classroom, status='Graded').select_related('assignment', 'student')
    
    if not quiz_attempts.exists() and not assignments.exists():
        return False
        
    data_summary = f"Classroom Performance Data for {classroom.name}:\n\n"
    
    # We aggregate a simple summary to keep the prompt size reasonable
    quiz_scores = {}
    for qa in quiz_attempts:
        if qa.quiz.title not in quiz_scores:
            quiz_scores[qa.quiz.title] = []
        quiz_scores[qa.quiz.title].append((qa.score / qa.quiz.total_marks) * 100)
        
    data_summary += "Average Quiz Scores (%):\n"
    for title, scores in quiz_scores.items():
        avg = sum(scores) / len(scores)
        data_summary += f"- {title}: {avg:.1f}%\n"
        
    assignment_scores = {}
    for sub in assignments:
        if sub.assignment.title not in assignment_scores:
            assignment_scores[sub.assignment.title] = []
        if sub.grade is not None:
            assignment_scores[sub.assignment.title].append(float(sub.grade) / sub.assignment.max_marks * 100)
            
    data_summary += "\nAverage Assignment Scores (%):\n"
    for title, scores in assignment_scores.items():
        avg = sum(scores) / len(scores)
        data_summary += f"- {title}: {avg:.1f}%\n"

    prompt = data_summary + """
    
    Based on the above aggregated class performance data, generate an analysis in JSON format containing exactly these three keys:
    1. "strength": A short paragraph summarizing the class's strongest areas.
    2. "weakness": A short paragraph summarizing the topics where the class struggles the most.
    3. "recommendation": An actionable teaching recommendation for the instructor.
    """
    
    try:
        from pydantic import BaseModel
        class InsightOutput(BaseModel):
            strength: str
            weakness: str
            recommendation: str

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': InsightOutput,
                'temperature': 0.2,
            },
        )
        import json
        insights = json.loads(response.text)
        
        # Clear old insights
        LearningInsight.objects.filter(classroom=classroom).delete()
        
        # Save new insights
        LearningInsight.objects.create(classroom=classroom, insight_type='strength', content=insights['strength'])
        LearningInsight.objects.create(classroom=classroom, insight_type='weakness', content=insights['weakness'])
        LearningInsight.objects.create(classroom=classroom, insight_type='recommendation', content=insights['recommendation'])
        
        return True
    except Exception as e:
        print(f"Error generating class insights: {str(e)}")
        return False
