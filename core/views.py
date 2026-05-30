from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from .forms import CustomUserCreationForm
from django.contrib.auth.decorators import login_required, user_passes_test
from classroom.models import Classroom, Enrollment
from quiz.models import Quiz, QuizAttempt
from assignment.models import Assignment, AssignmentSubmission

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Welcome {user.full_name}! Account created successfully.")
            return redirect('dashboard')
    else:
        form = CustomUserCreationForm()
    return render(request, 'auth/register.html', {'form': form})

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Welcome back, {user.full_name}!")
            return redirect('dashboard')
        else:
            messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()
    return render(request, 'auth/login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('login')

@login_required
def dashboard_view(request):
    if request.user.is_teacher:
        return teacher_dashboard(request)
    elif request.user.is_student:
        return student_dashboard(request)
    else:
        return render(request, 'dashboards/admin_dashboard.html')

@login_required
@user_passes_test(lambda u: u.is_teacher)
def teacher_dashboard(request):
    classes_count = Classroom.objects.filter(teacher=request.user).count()
    students_count = Enrollment.objects.filter(classroom__teacher=request.user).values('student').distinct().count()
    quizzes_count = Quiz.objects.filter(teacher=request.user).count()
    assignments_count = Assignment.objects.filter(teacher=request.user).count()
    pending_grading = AssignmentSubmission.objects.filter(assignment__teacher=request.user, status='Submitted').count()
    
    context = {
        'classes_count': classes_count,
        'students_count': students_count,
        'quizzes_count': quizzes_count,
        'assignments_count': assignments_count,
        'pending_grading': pending_grading,
    }
    return render(request, 'dashboards/teacher_dashboard.html', context)

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def student_dashboard(request):
    classes_count = Enrollment.objects.filter(student=request.user).count()
    
    available_quizzes = Quiz.objects.filter(classroom__enrollments__student=request.user, is_published=True).distinct().count()
    completed_quizzes = QuizAttempt.objects.filter(student=request.user).values('quiz').distinct().count()
    
    enrolled_classrooms = Enrollment.objects.filter(student=request.user).values_list('classroom', flat=True)
    available_assignments = Assignment.objects.filter(classroom__in=enrolled_classrooms, is_published=True).count()
    completed_assignments = AssignmentSubmission.objects.filter(student=request.user).values('assignment').distinct().count()
    
    context = {
        'classes_count': classes_count,
        'available_quizzes': available_quizzes,
        'completed_quizzes': completed_quizzes,
        'available_assignments': available_assignments,
        'completed_assignments': completed_assignments,
    }
    return render(request, 'dashboards/student_dashboard.html', context)

def profile_view(request, username):
    from django.shortcuts import get_object_or_404
    from django.db.models import Avg
    from .models import User
    from career_assistant.models import CareerRoadmap
    
    profile_user = get_object_or_404(User, username=username)
    
    if profile_user.is_teacher:
        context = {'profile_user': profile_user}
        return render(request, 'profile/teacher_profile.html', context)
        
    # Student profile — use aggregation to avoid N+1 queries
    quiz_attempts = (
        QuizAttempt.objects
        .filter(student=profile_user, status='Submitted')
        .select_related('quiz', 'quiz__classroom')
        .order_by('-submitted_at')
    )
    assignment_submissions = (
        AssignmentSubmission.objects
        .filter(student=profile_user, status='Graded')
        .select_related('assignment', 'assignment__classroom')
        .order_by('-submitted_at')
    )
    latest_roadmap = CareerRoadmap.objects.filter(student=profile_user).first()
    
    total_quizzes = quiz_attempts.count()
    avg_score = quiz_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
        
    context = {
        'profile_user': profile_user,
        'quiz_attempts': quiz_attempts[:5],
        'assignment_submissions': assignment_submissions[:5],
        'latest_roadmap': latest_roadmap,
        'stats': {
            'total_quizzes': total_quizzes,
            'avg_score': round(avg_score, 1),
            'total_assignments': assignment_submissions.count(),
        }
    }
    return render(request, 'profile/student_profile.html', context)
