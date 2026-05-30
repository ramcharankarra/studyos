from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView, FormView, TemplateView
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from django.views import View
from core.mixins import TeacherRequiredMixin, StudentRequiredMixin
from .models import Quiz, Question, Choice, QuizAttempt, StudentAnswer
from .forms import QuizForm, AIGenerateQuizForm
from .services.ai_generator import generate_quiz_via_ai
from .services.evaluator import evaluate_attempt
from .services.leaderboard import get_leaderboard
from classroom.models import Enrollment
from django.db.models import Q
from django.utils import timezone

# --- TEACHER VIEWS ---

class TeacherQuizListView(TeacherRequiredMixin, ListView):
    model = Quiz
    template_name = 'quiz/teacher/quiz_list.html'
    context_object_name = 'quizzes'
    paginate_by = 10

    def get_queryset(self):
        qs = Quiz.objects.filter(teacher=self.request.user).select_related('classroom')
        query = self.request.GET.get('q')
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(classroom__name__icontains=query))
        return qs

class QuizCreateView(TeacherRequiredMixin, CreateView):
    model = Quiz
    form_class = QuizForm
    template_name = 'quiz/teacher/quiz_form.html'
    success_url = reverse_lazy('quiz:quiz_list')

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        form.instance.teacher = self.request.user
        messages.success(self.request, 'Quiz created successfully.')
        return super().form_valid(form)
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Create'
        return context

class AIGenerateQuizView(TeacherRequiredMixin, FormView):
    template_name = 'quiz/teacher/ai_generate.html'
    form_class = AIGenerateQuizForm
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        topic = form.cleaned_data['topic']
        difficulty = form.cleaned_data['difficulty']
        num_questions = form.cleaned_data['num_questions']
        classroom = form.cleaned_data['classroom']
        document = self.request.FILES.get('document')
        
        document_text = ""
        if document:
            from study_notes.services import extract_text_from_file
            import tempfile
            import os
            
            ext = os.path.splitext(document.name)[1].lower()
            if ext in ['.pdf', '.docx', '.pptx', '.txt']:
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                    for chunk in document.chunks():
                        temp_file.write(chunk)
                    temp_path = temp_file.name
                
                document_text = extract_text_from_file(temp_path, ext)
                os.remove(temp_path)
            else:
                messages.error(self.request, 'Invalid document format. Supported: PDF, DOCX, PPTX, TXT.')
                return self.form_invalid(form)
        
        quiz = Quiz.objects.create(
            title=f"{topic} Quiz",
            description=f"Generated via AI. Difficulty: {difficulty}.",
            classroom=classroom,
            teacher=self.request.user,
            time_limit_minutes=15,
            is_published=False
        )
        
        success = generate_quiz_via_ai(topic, difficulty, num_questions, quiz, document_text=document_text)
        
        if success:
            messages.success(self.request, 'Quiz generated successfully. Please review the questions.')
            return redirect('quiz:quiz_detail', pk=quiz.id)
        else:
            quiz.delete()
            messages.error(self.request, 'Failed to generate quiz. Please check your API key and try again.')
            return self.form_invalid(form)

class QuizUpdateView(TeacherRequiredMixin, UpdateView):
    model = Quiz
    form_class = QuizForm
    template_name = 'quiz/teacher/quiz_form.html'
    
    def get_queryset(self):
        return Quiz.objects.filter(teacher=self.request.user)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, 'Quiz updated successfully.')
        return super().form_valid(form)
        
    def get_success_url(self):
        return reverse('quiz:quiz_detail', kwargs={'pk': self.object.id})
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Update'
        return context

class QuizDeleteView(TeacherRequiredMixin, DeleteView):
    model = Quiz
    template_name = 'quiz/teacher/quiz_confirm_delete.html'
    success_url = reverse_lazy('quiz:quiz_list')

    def get_queryset(self):
        return Quiz.objects.filter(teacher=self.request.user)

class QuizDetailView(TeacherRequiredMixin, DetailView):
    model = Quiz
    template_name = 'quiz/teacher/quiz_detail.html'
    context_object_name = 'quiz'

    def get_queryset(self):
        return Quiz.objects.filter(teacher=self.request.user).select_related('classroom').prefetch_related('questions__choices')

class PublishQuizView(TeacherRequiredMixin, View):
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk, teacher=request.user)
        quiz.is_published = not quiz.is_published
        quiz.save()
        status = "published" if quiz.is_published else "unpublished"
        messages.success(request, f'Quiz successfully {status}.')
        return redirect('quiz:quiz_detail', pk=pk)

class QuizLeaderboardView(TeacherRequiredMixin, TemplateView):
    template_name = 'quiz/teacher/leaderboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        quiz = get_object_or_404(Quiz, pk=self.kwargs['pk'], teacher=self.request.user)
        context['quiz'] = quiz
        context['leaderboard'] = get_leaderboard(quiz)
        return context

# --- STUDENT VIEWS ---

class StudentQuizListView(StudentRequiredMixin, ListView):
    model = Quiz
    template_name = 'quiz/student/quiz_list.html'
    context_object_name = 'quizzes'
    paginate_by = 10

    def get_queryset(self):
        enrolled_classrooms = Enrollment.objects.filter(student=self.request.user).values_list('classroom_id', flat=True)
        qs = Quiz.objects.filter(classroom__in=enrolled_classrooms, is_published=True).select_related('classroom', 'teacher')
        
        query = self.request.GET.get('q')
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(classroom__name__icontains=query))
        return qs

class StartQuizView(StudentRequiredMixin, View):
    def get(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk, is_published=True)
        if not Enrollment.objects.filter(student=request.user, classroom=quiz.classroom).exists():
            messages.error(request, 'You are not enrolled in this classroom.')
            return redirect('quiz:student_quiz_list')
            
        attempt, created = QuizAttempt.objects.get_or_create(
            student=request.user,
            quiz=quiz,
            defaults={'status': 'Not Started'}
        )
        
        if attempt.status == 'Submitted':
            messages.info(request, 'You have already completed this quiz.')
            return redirect('quiz:quiz_result', pk=quiz.id)
            
        return render(request, 'quiz/student/quiz_start.html', {'quiz': quiz, 'attempt': attempt})
        
    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk, is_published=True)
        attempt = get_object_or_404(QuizAttempt, student=request.user, quiz=quiz)
        
        if attempt.status == 'Not Started':
            attempt.status = 'In Progress'
            attempt.started_at = timezone.now()
            attempt.save()
            
        return redirect('quiz:take_quiz', pk=quiz.id)

class TakeQuizView(StudentRequiredMixin, DetailView):
    model = Quiz
    template_name = 'quiz/student/take_quiz.html'
    context_object_name = 'quiz'
    
    def get_queryset(self):
        return Quiz.objects.filter(is_published=True).prefetch_related('questions__choices')
        
    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        attempt = get_object_or_404(QuizAttempt, student=request.user, quiz=self.object)
        
        if attempt.status == 'Submitted':
            messages.error(request, 'You have already submitted this quiz.')
            return redirect('quiz:quiz_result', pk=self.object.id)
            
        if attempt.status == 'Not Started':
            return redirect('quiz:start_quiz', pk=self.object.id)
            
        return super().get(request, *args, **kwargs)
        
    def post(self, request, *args, **kwargs):
        quiz = self.get_object()
        attempt = get_object_or_404(QuizAttempt, student=request.user, quiz=quiz)
        
        if attempt.status == 'Submitted':
            return redirect('quiz:quiz_result', pk=quiz.id)
            
        evaluate_attempt(attempt, request.POST)
        messages.success(request, 'Quiz submitted successfully!')
        return redirect('quiz:quiz_result', pk=quiz.id)

class QuizResultView(StudentRequiredMixin, DetailView):
    model = QuizAttempt
    template_name = 'quiz/student/quiz_result.html'
    context_object_name = 'attempt'
    
    def get_object(self):
        quiz = get_object_or_404(Quiz, pk=self.kwargs['pk'])
        return get_object_or_404(QuizAttempt, quiz=quiz, student=self.request.user)
