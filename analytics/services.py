import logging
logger = logging.getLogger(__name__)

import os
import json
from google import genai
from django.db.models import Avg, Count, F, Q, ExpressionWrapper, FloatField
from quiz.models import QuizAttempt
from assignment.models import AssignmentSubmission
from ai_learning.models import LearningInsight
from .models import TeacherAIAnalytics
from classroom.models import Classroom, Enrollment

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=api_key)

def get_student_analytics(student):
    """
    Fetches raw chart data for a student's analytics dashboard.
    """
    # Quiz performance timeline
    quiz_attempts = QuizAttempt.objects.filter(student=student, status='Submitted').order_by('submitted_at').select_related('quiz')
    quiz_labels = []
    quiz_scores = []
    for qa in quiz_attempts:
        if qa.submitted_at:
            quiz_labels.append(f"{qa.quiz.title} ({qa.submitted_at.strftime('%b %d')})")
        else:
            quiz_labels.append(f"{qa.quiz.title} (Pending)")
        score_percentage = (float(qa.score) / qa.quiz.total_marks) * 100 if qa.quiz.total_marks > 0 else 0
        quiz_scores.append(round(score_percentage, 1))

    # Assignment performance timeline
    assignment_submissions = AssignmentSubmission.objects.filter(
        student=student, status='Graded'
    ).order_by('submitted_at').select_related('assignment')
    
    assignment_labels = []
    assignment_scores = []
    for sub in assignment_submissions:
        assignment_labels.append(f"{sub.assignment.title} ({sub.submitted_at.strftime('%b %d')})")
        score_percentage = (float(sub.grade) / sub.assignment.max_marks) * 100 if sub.assignment.max_marks > 0 and sub.grade is not None else 0
        assignment_scores.append(round(score_percentage, 1))

    # Subject-wise (Classroom-wise) average performance
    classrooms = Classroom.objects.filter(enrollments__student=student)
    subject_labels = []
    subject_averages = []
    
    for c in classrooms:
        subject_labels.append(c.name)
        
        # Calculate average quiz score for this class
        q_avg = QuizAttempt.objects.filter(student=student, quiz__classroom=c).aggregate(
            avg_score=Avg(ExpressionWrapper(F('score') * 100.0 / F('quiz__total_marks'), output_field=FloatField()))
        )['avg_score'] or 0
        
        # Calculate average assignment score for this class
        a_avg = AssignmentSubmission.objects.filter(student=student, assignment__classroom=c, status='Graded').aggregate(
            avg_score=Avg(ExpressionWrapper(F('grade') * 100.0 / F('assignment__max_marks'), output_field=FloatField()))
        )['avg_score'] or 0
        
        # Combined average
        if q_avg > 0 and a_avg > 0:
            combined = (q_avg + float(a_avg)) / 2
        else:
            combined = q_avg or float(a_avg)
            
        subject_averages.append(round(combined, 1))

    # AI Insights
    insights = LearningInsight.objects.filter(student=student)
    strength = insights.filter(insight_type='strength').first()
    weakness = insights.filter(insight_type='weakness').first()
    recommendation = insights.filter(insight_type='recommendation').first()

    return {
        'quiz_labels': json.dumps(quiz_labels),
        'quiz_scores': json.dumps(quiz_scores),
        'assignment_labels': json.dumps(assignment_labels),
        'assignment_scores': json.dumps(assignment_scores),
        'subject_labels': json.dumps(subject_labels),
        'subject_averages': json.dumps(subject_averages),
        'strength': strength.content if strength else None,
        'weakness': weakness.content if weakness else None,
        'recommendation': recommendation.content if recommendation else None,
    }

def get_teacher_analytics(teacher, classroom_id=None):
    """
    Fetches KPI and chart data for the teacher dashboard.
    """
    data = {}
    
    # Filter base objects
    if classroom_id:
        classes = Classroom.objects.filter(id=classroom_id, teacher=teacher)
        selected_class = classes.first()
        data['selected_class'] = selected_class
        base_enrollments = Enrollment.objects.filter(classroom=selected_class)
        base_quizzes = QuizAttempt.objects.filter(quiz__classroom=selected_class)
        base_assignments = AssignmentSubmission.objects.filter(assignment__classroom=selected_class)
    else:
        classes = Classroom.objects.filter(teacher=teacher)
        data['selected_class'] = None
        base_enrollments = Enrollment.objects.filter(classroom__in=classes)
        base_quizzes = QuizAttempt.objects.filter(quiz__classroom__in=classes)
        base_assignments = AssignmentSubmission.objects.filter(assignment__classroom__in=classes)

    # KPIs
    data['total_students'] = base_enrollments.values('student').distinct().count()
    data['total_classes'] = classes.count()
    
    # Participation rates (simplified for KPI display)
    total_quiz_count = classes.aggregate(total=Count('quizzes'))['total'] or 0
    if total_quiz_count > 0 and data['total_students'] > 0:
        expected_attempts = total_quiz_count * data['total_students']
        data['quiz_participation_rate'] = round((base_quizzes.count() / expected_attempts) * 100, 1)
    else:
        data['quiz_participation_rate'] = 0

    total_assignment_count = classes.aggregate(total=Count('assignments'))['total'] or 0
    if total_assignment_count > 0 and data['total_students'] > 0:
        expected_submissions = total_assignment_count * data['total_students']
        data['assignment_submission_rate'] = round((base_assignments.count() / expected_submissions) * 100, 1)
    else:
        data['assignment_submission_rate'] = 0
        
    # Averages
    data['avg_quiz_score'] = round(base_quizzes.aggregate(
        avg_score=Avg(ExpressionWrapper(F('score') * 100.0 / F('quiz__total_marks'), output_field=FloatField()))
    )['avg_score'] or 0, 1)
    
    data['avg_assignment_score'] = round(base_assignments.filter(status='Graded').aggregate(
        avg_score=Avg(ExpressionWrapper(F('grade') * 100.0 / F('assignment__max_marks'), output_field=FloatField()))
    )['avg_score'] or 0, 1)

    # Class Performance Trends (Average over time based on quiz attempts)
    trend_quizzes = base_quizzes.filter(status='Submitted').order_by('submitted_at')
    trend_labels = []
    trend_scores = []
    for qa in trend_quizzes:
        if qa.submitted_at:
            trend_labels.append(qa.submitted_at.strftime('%b %d'))
        else:
            trend_labels.append('Pending')
        score_pct = (float(qa.score) / qa.quiz.total_marks) * 100 if qa.quiz.total_marks > 0 else 0
        trend_scores.append(round(score_pct, 1))
        
    data['trend_labels'] = json.dumps(trend_labels[-20:]) # Last 20
    data['trend_scores'] = json.dumps(trend_scores[-20:])
    
    # Subject Performance Analysis
    if not classroom_id:
        subject_labels = []
        subject_scores = []
        for c in classes:
            subject_labels.append(c.name)
            q_avg = QuizAttempt.objects.filter(quiz__classroom=c).aggregate(
                avg_score=Avg(ExpressionWrapper(F('score') * 100.0 / F('quiz__total_marks'), output_field=FloatField()))
            )['avg_score'] or 0
            subject_scores.append(round(q_avg, 1))
        data['subject_labels'] = json.dumps(subject_labels)
        data['subject_scores'] = json.dumps(subject_scores)
    else:
        data['subject_labels'] = json.dumps([])
        data['subject_scores'] = json.dumps([])

    # AI Analytics
    if classroom_id and selected_class:
        ai_analytics = getattr(selected_class, 'ai_analytics', None)
        data['ai_analytics'] = ai_analytics

    return data

def generate_advanced_ai_analytics(classroom):
    """
    Generates advanced analytics using Gemini for a specific classroom.
    """
    client = get_gemini_client()
    
    # Gather summary data
    quiz_attempts = QuizAttempt.objects.filter(quiz__classroom=classroom).select_related('quiz', 'student')
    assignments = AssignmentSubmission.objects.filter(assignment__classroom=classroom, status='Graded').select_related('assignment', 'student')
    
    if not quiz_attempts.exists() and not assignments.exists():
        return False
        
    # Aggregate data for prompt
    student_scores = {}
    for qa in quiz_attempts:
        if qa.student.username not in student_scores:
            student_scores[qa.student.username] = []
        student_scores[qa.student.username].append((float(qa.score) / qa.quiz.total_marks) * 100)
        
    data_summary = f"Analytics Data for {classroom.name}:\n\nStudent Averages:\n"
    for username, scores in student_scores.items():
        avg = sum(scores) / len(scores)
        data_summary += f"- {username}: {avg:.1f}%\n"

    prompt = data_summary + """
    Based on the provided student performance data, act as an expert educational data analyst.
    Identify and generate exactly 4 short paragraphs in JSON format containing exactly these keys:
    1. "frequently_missed_topics": Hypothesize what topics might be frequently missed based on general low scores (invent plausible topics related to a general class if specific topics aren't clear, but focus on actionable insights).
    2. "at_risk_students": List the usernames of students who are scoring below 60%, and explain why they are at risk. If none, say "No students currently at high risk."
    3. "interventions": Suggest 2-3 specific teaching interventions for the at-risk students or the whole class.
    4. "learning_trends": Describe the overall performance trend of the class.
    """
    
    try:
        from pydantic import BaseModel
        class AnalyticsOutput(BaseModel):
            frequently_missed_topics: str
            at_risk_students: str
            interventions: str
            learning_trends: str

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': AnalyticsOutput,
                'temperature': 0.2,
            },
        )
        insights = json.loads(response.text)
        
        # Save to DB
        analytics, created = TeacherAIAnalytics.objects.get_or_create(classroom=classroom)
        analytics.frequently_missed_topics = insights['frequently_missed_topics']
        analytics.at_risk_students = insights['at_risk_students']
        analytics.interventions = insights['interventions']
        analytics.learning_trends = insights['learning_trends']
        analytics.save()
        
        return True
    except Exception as e:
        logger.error(f"Error generating AI analytics: {str(e)}")
        return False
