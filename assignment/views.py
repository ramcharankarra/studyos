from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.utils.decorators import method_decorator
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy, reverse
from django.contrib import messages
from django.utils import timezone
from .models import Assignment, AssignmentSubmission
from .forms import AssignmentForm, SubmissionForm, GradeForm
from classroom.models import Classroom, Enrollment
from .services import can_student_submit, calculate_assignment_stats

from core.mixins import TeacherRequiredMixin, StudentRequiredMixin

# --- Teacher Views ---
class AssignmentCreateView(TeacherRequiredMixin, CreateView):
    model = Assignment
    form_class = AssignmentForm
    template_name = 'assignment/teacher/assignment_form.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Create'
        return context

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.fields['classroom'].queryset = Classroom.objects.filter(teacher=self.request.user)
        return form

    def form_valid(self, form):
        form.instance.teacher = self.request.user
        messages.success(self.request, "Assignment created successfully.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse('assignment:teacher_assignment_detail', kwargs={'pk': self.object.pk})

class AssignmentUpdateView(TeacherRequiredMixin, UpdateView):
    model = Assignment
    form_class = AssignmentForm
    template_name = 'assignment/teacher/assignment_form.html'

    def get_queryset(self):
        return Assignment.objects.filter(teacher=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Update'
        return context

    def form_valid(self, form):
        messages.success(self.request, "Assignment updated successfully.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse('assignment:teacher_assignment_detail', kwargs={'pk': self.object.pk})

class AssignmentDeleteView(TeacherRequiredMixin, DeleteView):
    model = Assignment
    template_name = 'assignment/teacher/assignment_confirm_delete.html'
    success_url = reverse_lazy('assignment:teacher_assignment_list')

    def get_queryset(self):
        return Assignment.objects.filter(teacher=self.request.user)

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, "Assignment deleted successfully.")
        return super().delete(request, *args, **kwargs)

class TeacherAssignmentListView(TeacherRequiredMixin, ListView):
    model = Assignment
    template_name = 'assignment/teacher/assignment_list.html'
    context_object_name = 'assignments'
    paginate_by = 10

    def get_queryset(self):
        queryset = Assignment.objects.filter(teacher=self.request.user).select_related('classroom').order_by('-created_at')
        q = self.request.GET.get('q')
        if q:
            queryset = queryset.filter(title__icontains=q)
        classroom_id = self.request.GET.get('classroom')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['classrooms'] = Classroom.objects.filter(teacher=self.request.user)
        return context

class TeacherAssignmentDetailView(TeacherRequiredMixin, DetailView):
    model = Assignment
    template_name = 'assignment/teacher/assignment_detail.html'
    context_object_name = 'assignment'

    def get_queryset(self):
        return Assignment.objects.filter(teacher=self.request.user).select_related('classroom')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['stats'] = calculate_assignment_stats(self.object)
        context['submissions'] = AssignmentSubmission.objects.filter(assignment=self.object).select_related('student')
        return context

@login_required
@user_passes_test(lambda u: u.is_teacher)
def publish_assignment(request, pk):
    assignment = get_object_or_404(Assignment, pk=pk, teacher=request.user)
    if request.method == 'POST':
        assignment.is_published = not assignment.is_published
        assignment.save()
        status = "published" if assignment.is_published else "unpublished"
        messages.success(request, f"Assignment successfully {status}.")
    return redirect('assignment:teacher_assignment_detail', pk=pk)

@login_required
@user_passes_test(lambda u: u.is_teacher)
def grade_submission(request, pk):
    submission = get_object_or_404(AssignmentSubmission.objects.select_related('assignment', 'student'), pk=pk, assignment__teacher=request.user)
    
    if request.method == 'POST':
        form = GradeForm(request.POST, instance=submission)
        if form.is_valid():
            sub = form.save(commit=False)
            sub.status = 'Graded'
            sub.save()
            messages.success(request, f"Grade saved for {submission.student.full_name}.")
            return redirect('assignment:teacher_assignment_detail', pk=submission.assignment.pk)
    else:
        form = GradeForm(instance=submission)
        
    return render(request, 'assignment/teacher/grade_form.html', {
        'form': form,
        'submission': submission,
        'assignment': submission.assignment
    })


# --- Student Views ---
class StudentAssignmentListView(StudentRequiredMixin, ListView):
    model = Assignment
    template_name = 'assignment/student/assignment_list.html'
    context_object_name = 'assignments'
    paginate_by = 10

    def get_queryset(self):
        enrolled_classrooms = Enrollment.objects.filter(student=self.request.user).values_list('classroom', flat=True)
        queryset = Assignment.objects.filter(classroom__in=enrolled_classrooms, is_published=True).select_related('classroom').order_by('deadline')
        
        status_filter = self.request.GET.get('status')
        if status_filter == 'pending':
            submitted_ids = AssignmentSubmission.objects.filter(student=self.request.user).values_list('assignment_id', flat=True)
            queryset = queryset.exclude(id__in=submitted_ids)
        elif status_filter == 'submitted':
            submitted_ids = AssignmentSubmission.objects.filter(student=self.request.user).values_list('assignment_id', flat=True)
            queryset = queryset.filter(id__in=submitted_ids)
            
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add submission dictionary for quick lookup
        submissions = AssignmentSubmission.objects.filter(student=self.request.user)
        sub_dict = {sub.assignment_id: sub for sub in submissions}
        context['submissions'] = sub_dict
        context['now'] = timezone.now()
        return context

@login_required
@user_passes_test(lambda u: not u.is_teacher)
def student_assignment_detail(request, pk):
    # Verify enrollment
    enrolled_classrooms = Enrollment.objects.filter(student=request.user).values_list('classroom', flat=True)
    assignment = get_object_or_404(Assignment.objects.select_related('classroom', 'teacher'), pk=pk, classroom__in=enrolled_classrooms, is_published=True)
    
    submission = AssignmentSubmission.objects.filter(assignment=assignment, student=request.user).first()
    can_submit = can_student_submit(assignment, request.user)
    
    form = None
    if can_submit and request.method == 'POST':
        form = SubmissionForm(request.POST, request.FILES, instance=submission)
        if form.is_valid():
            sub = form.save(commit=False)
            sub.assignment = assignment
            sub.student = request.user
            sub.status = 'Submitted'
            sub.save()
            messages.success(request, "Assignment submitted successfully.")
            return redirect('assignment:student_assignment_detail', pk=pk)
    elif can_submit:
        form = SubmissionForm(instance=submission)
        
    return render(request, 'assignment/student/assignment_detail.html', {
        'assignment': assignment,
        'submission': submission,
        'form': form,
        'can_submit': can_submit,
        'now': timezone.now()
    })
