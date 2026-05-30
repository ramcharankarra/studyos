import csv
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import HttpResponse
from classroom.models import Classroom
from quiz.models import QuizAttempt
from assignment.models import AssignmentSubmission
from .services import get_student_analytics, get_teacher_analytics, generate_advanced_ai_analytics

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def student_analytics(request):
    data = get_student_analytics(request.user)
    return render(request, 'analytics/student_dashboard.html', {'data': data})

@login_required
@user_passes_test(lambda u: u.is_teacher)
def teacher_analytics(request):
    classrooms = Classroom.objects.filter(teacher=request.user)
    selected_class_id = request.GET.get('classroom')
    
    data = get_teacher_analytics(request.user, selected_class_id)
    
    return render(request, 'analytics/teacher_dashboard.html', {
        'classrooms': classrooms,
        'selected_class_id': int(selected_class_id) if selected_class_id else None,
        'data': data
    })

@login_required
@user_passes_test(lambda u: u.is_teacher)
def generate_teacher_ai_analytics_api(request, class_id):
    if request.method == 'POST':
        classroom = get_object_or_404(Classroom, id=class_id, teacher=request.user)
        success = generate_advanced_ai_analytics(classroom)
        if success:
            messages.success(request, f"Advanced Analytics generated for {classroom.name}.")
        else:
            messages.error(request, "Failed to generate analytics. Please ensure there is enough student data.")
    return redirect(f"{request.build_absolute_uri('/')}analytics/teacher/?classroom={class_id}")

@login_required
@user_passes_test(lambda u: u.is_teacher)
def export_teacher_analytics_csv(request):
    classrooms = Classroom.objects.filter(teacher=request.user)
    selected_class_id = request.GET.get('classroom')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="analytics_report.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Type', 'Title', 'Student', 'Score/Grade', 'Max Marks', 'Date'])
    
    if selected_class_id:
        classes = classrooms.filter(id=selected_class_id)
    else:
        classes = classrooms
        
    for c in classes:
        # Export Quizzes
        qas = QuizAttempt.objects.filter(quiz__classroom=c).select_related('quiz', 'student')
        for qa in qas:
            date_str = qa.submitted_at.strftime('%Y-%m-%d') if qa.submitted_at else 'Pending'
            writer.writerow(['Quiz', qa.quiz.title, qa.student.username, qa.score, qa.quiz.total_marks, date_str])
            
        # Export Assignments
        subs = AssignmentSubmission.objects.filter(assignment__classroom=c, status='Graded').select_related('assignment', 'student')
        for sub in subs:
            writer.writerow(['Assignment', sub.assignment.title, sub.student.username, sub.grade, sub.assignment.max_marks, sub.submitted_at.strftime('%Y-%m-%d')])
            
    return response

@login_required
@user_passes_test(lambda u: u.is_teacher)
def export_teacher_analytics_pdf(request):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    classrooms = Classroom.objects.filter(teacher=request.user)
    selected_class_id = request.GET.get('classroom')
    
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="analytics_report.pdf"'
    
    p = canvas.Canvas(response, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, "StudyOS - Teacher Analytics Report")
    
    p.setFont("Helvetica", 12)
    y_position = 720
    
    if selected_class_id:
        classes = classrooms.filter(id=selected_class_id)
    else:
        classes = classrooms
        
    for c in classes:
        p.setFont("Helvetica-Bold", 14)
        if y_position < 100:
            p.showPage()
            y_position = 750
        p.drawString(50, y_position, f"Classroom: {c.name}")
        y_position -= 20
        
        p.setFont("Helvetica", 12)
        qas = QuizAttempt.objects.filter(quiz__classroom=c).select_related('quiz', 'student')
        for qa in qas:
            if y_position < 50:
                p.showPage()
                y_position = 750
            date_str = qa.submitted_at.strftime('%Y-%m-%d') if qa.submitted_at else 'Pending'
            text = f"Quiz: {qa.quiz.title} | Student: {qa.student.username} | Score: {qa.score}/{qa.quiz.total_marks} | Date: {date_str}"
            p.drawString(70, y_position, text)
            y_position -= 15
            
        subs = AssignmentSubmission.objects.filter(assignment__classroom=c, status='Graded').select_related('assignment', 'student')
        for sub in subs:
            if y_position < 50:
                p.showPage()
                y_position = 750
            text = f"Assignment: {sub.assignment.title} | Student: {sub.student.username} | Grade: {sub.grade}/{sub.assignment.max_marks}"
            p.drawString(70, y_position, text)
            y_position -= 15
            
        y_position -= 20
        
    p.showPage()
    p.save()
    return response
