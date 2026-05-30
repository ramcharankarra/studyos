from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q
from .models import ChatSession, ChatMessage, LearningInsight
from classroom.models import Classroom, Enrollment
from .services import chat_with_tutor, generate_student_insights, generate_class_insights

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def tutor_chat(request, session_id=None):
    if session_id:
        session = get_object_or_404(ChatSession, id=session_id, student=request.user)
    else:
        # Don't create a blank session automatically unless explicitly starting a new chat
        if request.GET.get('new') == '1' or not ChatSession.objects.filter(student=request.user).exists():
            session = ChatSession.objects.create(student=request.user)
            return redirect('ai_learning:tutor_chat', session_id=session.id)
        else:
            # Redirect to most recent session
            latest_session = ChatSession.objects.filter(student=request.user).order_by('-updated_at').first()
            if latest_session:
                return redirect('ai_learning:tutor_chat', session_id=latest_session.id)
            else:
                session = ChatSession.objects.create(student=request.user)
                return redirect('ai_learning:tutor_chat', session_id=session.id)
        
    if request.method == 'POST':
        message_text = request.POST.get('message', '').strip()
        if message_text:
            reply_text = chat_with_tutor(session, message_text)
            
            # Handle AJAX request
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'status': 'success',
                    'reply': reply_text,
                    'title': session.title
                })
            
            return redirect('ai_learning:tutor_chat', session_id=session.id)
        
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'status': 'error', 'message': 'Empty message'}, status=400)

    # Sidebar sessions with Search
    search_query = request.GET.get('q', '').strip()
    sessions = ChatSession.objects.filter(student=request.user)
    
    if search_query:
        sessions = sessions.filter(
            Q(title__icontains=search_query) | 
            Q(messages__content__icontains=search_query)
        ).distinct()
        
    sessions = sessions.order_by('-updated_at')
    messages_list = session.messages.all()

    return render(request, 'ai_learning/student/tutor_chat.html', {
        'current_session': session,
        'sessions': sessions,
        'messages': messages_list,
        'search_query': search_query,
    })

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def delete_chat_session(request, session_id):
    if request.method == 'POST':
        session = get_object_or_404(ChatSession, id=session_id, student=request.user)
        session.delete()
        messages.success(request, "Conversation deleted.")
    return redirect('ai_learning:tutor_chat_new')

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def delete_all_chat_sessions(request):
    if request.method == 'POST':
        ChatSession.objects.filter(student=request.user).delete()
        messages.success(request, "All conversations deleted.")
    return redirect('ai_learning:tutor_chat_new')

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def student_learning_dashboard(request):
    insights = LearningInsight.objects.filter(student=request.user)
    
    strength = insights.filter(insight_type='strength').first()
    weakness = insights.filter(insight_type='weakness').first()
    recommendation = insights.filter(insight_type='recommendation').first()
    
    # We could also fetch recent grades here if we want to show a chart
    
    return render(request, 'ai_learning/student/learning_dashboard.html', {
        'strength': strength,
        'weakness': weakness,
        'recommendation': recommendation,
    })

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def generate_insights_api(request):
    if request.method == 'POST':
        success = generate_student_insights(request.user)
        if success:
            messages.success(request, "Your learning insights have been updated!")
        else:
            messages.error(request, "Failed to generate insights. You may need more quiz/assignment data.")
    return redirect('ai_learning:student_learning_dashboard')

@login_required
@user_passes_test(lambda u: u.is_teacher)
def teacher_insights(request):
    classrooms = Classroom.objects.filter(teacher=request.user)
    
    selected_class_id = request.GET.get('classroom')
    selected_class = None
    insights = None
    
    if selected_class_id:
        selected_class = get_object_or_404(Classroom, id=selected_class_id, teacher=request.user)
        insights_qs = LearningInsight.objects.filter(classroom=selected_class)
        insights = {
            'strength': insights_qs.filter(insight_type='strength').first(),
            'weakness': insights_qs.filter(insight_type='weakness').first(),
            'recommendation': insights_qs.filter(insight_type='recommendation').first(),
        }
        
    return render(request, 'ai_learning/teacher/insights_dashboard.html', {
        'classrooms': classrooms,
        'selected_class': selected_class,
        'insights': insights,
    })

@login_required
@user_passes_test(lambda u: u.is_teacher)
def generate_class_insights_api(request, classroom_id):
    if request.method == 'POST':
        classroom = get_object_or_404(Classroom, id=classroom_id, teacher=request.user)
        success = generate_class_insights(classroom)
        if success:
            messages.success(request, f"Insights updated for {classroom.name}.")
        else:
            messages.error(request, "Failed to generate class insights. More data may be needed.")
    return redirect(f"{request.build_absolute_uri('/')}ai/teacher/?classroom={classroom_id}")
