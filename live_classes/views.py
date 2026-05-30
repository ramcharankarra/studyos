from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.utils import timezone
from .models import LiveClass
from classroom.models import Classroom, Enrollment
from attendance.models import AttendanceSession, AttendanceRecord
from notifications.models import Notification

def is_teacher(user):
    return getattr(user, 'is_teacher', False)

def is_student(user):
    return getattr(user, 'is_student', False)

# ----------------- TEACHER VIEWS ----------------- #

@login_required
@user_passes_test(is_teacher)
def teacher_dashboard(request):
    classes = LiveClass.objects.filter(teacher=request.user)
    upcoming_classes = classes.filter(date__gte=timezone.now().date()).order_by('date', 'start_time')
    past_classes = classes.filter(date__lt=timezone.now().date()).order_by('-date', '-start_time')[:10]
    
    return render(request, 'live_classes/teacher_dashboard.html', {
        'upcoming_classes': upcoming_classes,
        'past_classes': past_classes,
    })

@login_required
@user_passes_test(is_teacher)
def create_live_class(request):
    classrooms = Classroom.objects.filter(teacher=request.user)
    
    if request.method == 'POST':
        classroom_id = request.POST.get('classroom')
        title = request.POST.get('title')
        description = request.POST.get('description')
        date = request.POST.get('date')
        start_time = request.POST.get('start_time')
        end_time = request.POST.get('end_time')
        meeting_link = request.POST.get('meeting_link')
        
        classroom = get_object_or_404(Classroom, id=classroom_id, teacher=request.user)
        
        # Create Attendance Session
        attendance_session = AttendanceSession.objects.create(
            classroom=classroom,
            teacher=request.user,
            title=f"Live Class: {title}",
            date=date,
            start_time=start_time,
            end_time=end_time
        )
        
        # Create Live Class
        live_class = LiveClass.objects.create(
            classroom=classroom,
            teacher=request.user,
            title=title,
            description=description,
            date=date,
            start_time=start_time,
            end_time=end_time,
            meeting_link=meeting_link,
            attendance_session=attendance_session
        )
        
        # Notify Students
        enrollments = Enrollment.objects.filter(classroom=classroom)
        for enrollment in enrollments:
            Notification.objects.create(
                recipient=enrollment.student,
                title=f"New Live Class: {title}",
                message=f"A live class has been scheduled for {date} at {start_time}.",
                type='Announcement'
            )
            
        messages.success(request, 'Live class scheduled successfully!')
        return redirect('live_classes:teacher_dashboard')
        
    return render(request, 'live_classes/create_live_class.html', {'classrooms': classrooms})

@login_required
@user_passes_test(is_teacher)
def edit_live_class(request, class_id):
    live_class = get_object_or_404(LiveClass, id=class_id, teacher=request.user)
    classrooms = Classroom.objects.filter(teacher=request.user)
    
    if request.method == 'POST':
        classroom_id = request.POST.get('classroom')
        live_class.classroom = get_object_or_404(Classroom, id=classroom_id, teacher=request.user)
        live_class.title = request.POST.get('title')
        live_class.description = request.POST.get('description')
        live_class.date = request.POST.get('date')
        live_class.start_time = request.POST.get('start_time')
        live_class.end_time = request.POST.get('end_time')
        live_class.meeting_link = request.POST.get('meeting_link')
        live_class.save()
        
        # Update linked attendance session
        if live_class.attendance_session:
            live_class.attendance_session.title = f"Live Class: {live_class.title}"
            live_class.attendance_session.date = live_class.date
            live_class.attendance_session.start_time = live_class.start_time
            live_class.attendance_session.end_time = live_class.end_time
            live_class.attendance_session.save()
            
        messages.success(request, 'Live class updated successfully!')
        return redirect('live_classes:teacher_dashboard')
        
    return render(request, 'live_classes/edit_live_class.html', {
        'live_class': live_class,
        'classrooms': classrooms
    })

@login_required
@user_passes_test(is_teacher)
def cancel_live_class(request, class_id):
    if request.method == 'POST':
        live_class = get_object_or_404(LiveClass, id=class_id, teacher=request.user)
        # Delete attendance session (will also cascade if configured, but we do it explicitly to be safe if not)
        if live_class.attendance_session:
            live_class.attendance_session.delete()
        live_class.delete()
        messages.success(request, 'Live class cancelled.')
    return redirect('live_classes:teacher_dashboard')

# ----------------- STUDENT VIEWS ----------------- #

@login_required
@user_passes_test(is_student)
def student_dashboard(request):
    enrolled_classrooms = Classroom.objects.filter(enrollments__student=request.user)
    
    upcoming_classes = LiveClass.objects.filter(
        classroom__in=enrolled_classrooms,
        date__gte=timezone.now().date()
    ).order_by('date', 'start_time')
    
    past_classes = LiveClass.objects.filter(
        classroom__in=enrolled_classrooms,
        date__lt=timezone.now().date()
    ).order_by('-date', '-start_time')[:10]
    
    return render(request, 'live_classes/student_dashboard.html', {
        'upcoming_classes': upcoming_classes,
        'past_classes': past_classes,
    })

@login_required
@user_passes_test(is_student)
def join_live_class(request, class_id):
    live_class = get_object_or_404(LiveClass, id=class_id)
    
    # Security Check
    if not Enrollment.objects.filter(student=request.user, classroom=live_class.classroom).exists():
        messages.error(request, "You are not enrolled in this class.")
        return redirect('live_classes:student_dashboard')
        
    # Mark Attendance
    if live_class.attendance_session:
        AttendanceRecord.objects.update_or_create(
            attendance_session=live_class.attendance_session,
            student=request.user,
            defaults={'status': 'Present'}
        )
        
    return redirect(live_class.meeting_link)
