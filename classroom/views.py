from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, DetailView, FormView
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.views import View
from core.mixins import TeacherRequiredMixin, StudentRequiredMixin
from .models import Classroom, Enrollment
from .forms import ClassroomForm, JoinClassForm
from .services import enroll_student
from django.db.models import Q

# --- TEACHER VIEWS ---

class ClassroomListView(TeacherRequiredMixin, ListView):
    model = Classroom
    template_name = 'classroom/teacher/classroom_list.html'
    context_object_name = 'classrooms'
    paginate_by = 10

    def get_queryset(self):
        qs = Classroom.objects.filter(teacher=self.request.user).prefetch_related('enrollments')
        query = self.request.GET.get('q')
        if query:
            qs = qs.filter(name__icontains=query)
        return qs

class ClassroomCreateView(TeacherRequiredMixin, CreateView):
    model = Classroom
    form_class = ClassroomForm
    template_name = 'classroom/teacher/classroom_form.html'
    success_url = reverse_lazy('classroom:class_list')

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        form.instance.teacher = self.request.user
        messages.success(self.request, 'Classroom created successfully.')
        return super().form_valid(form)
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Create'
        return context

class ClassroomUpdateView(TeacherRequiredMixin, UpdateView):
    model = Classroom
    form_class = ClassroomForm
    template_name = 'classroom/teacher/classroom_form.html'
    success_url = reverse_lazy('classroom:class_list')

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, 'Classroom updated successfully.')
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['action'] = 'Update'
        return context

class ClassroomDeleteView(TeacherRequiredMixin, DeleteView):
    model = Classroom
    template_name = 'classroom/teacher/classroom_confirm_delete.html'
    success_url = reverse_lazy('classroom:class_list')

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, 'Classroom deleted successfully.')
        return super().delete(request, *args, **kwargs)

class ClassroomDetailView(TeacherRequiredMixin, DetailView):
    model = Classroom
    template_name = 'classroom/teacher/classroom_detail.html'
    context_object_name = 'classroom'

    def get_queryset(self):
        return Classroom.objects.filter(teacher=self.request.user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        search_query = self.request.GET.get('q', '')
        
        enrollments = self.object.enrollments.select_related('student')
        if search_query:
            enrollments = enrollments.filter(Q(student__full_name__icontains=search_query) | Q(student__username__icontains=search_query))
        
        context['enrollments'] = enrollments
        context['search_query'] = search_query
        return context

class RemoveStudentView(TeacherRequiredMixin, View):
    def post(self, request, classroom_id, student_id):
        classroom = get_object_or_404(Classroom, pk=classroom_id, teacher=request.user)
        enrollment = get_object_or_404(Enrollment, classroom=classroom, student_id=student_id)
        enrollment.delete()
        messages.success(request, 'Student removed from class.')
        return redirect('classroom:classroom_detail', pk=classroom_id)


# --- STUDENT VIEWS ---

class StudentMyClassesView(StudentRequiredMixin, ListView):
    model = Enrollment
    template_name = 'classroom/student/my_classes.html'
    context_object_name = 'enrollments'
    paginate_by = 10

    def get_queryset(self):
        qs = Enrollment.objects.filter(student=self.request.user).select_related('classroom', 'classroom__teacher')
        query = self.request.GET.get('q')
        if query:
            qs = qs.filter(classroom__name__icontains=query)
        return qs

class JoinClassView(StudentRequiredMixin, FormView):
    template_name = 'classroom/student/join_class.html'
    form_class = JoinClassForm
    success_url = reverse_lazy('classroom:my_classes')

    def form_valid(self, form):
        code = form.cleaned_data['class_code']
        success, msg, classroom = enroll_student(self.request.user, code)
        if success:
            messages.success(self.request, msg)
            return super().form_valid(form)
        else:
            messages.error(self.request, msg)
            return self.form_invalid(form)

class StudentClassroomDetailView(StudentRequiredMixin, DetailView):
    model = Enrollment
    template_name = 'classroom/student/classroom_detail.html'
    context_object_name = 'enrollment'

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user).select_related('classroom__teacher', 'classroom')

class LeaveClassView(StudentRequiredMixin, DeleteView):
    model = Enrollment
    template_name = 'classroom/student/leave_confirm.html'
    success_url = reverse_lazy('classroom:my_classes')
    context_object_name = 'enrollment'

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user).select_related('classroom')

    def delete(self, request, *args, **kwargs):
        messages.success(self.request, 'You have left the class.')
        return super().delete(request, *args, **kwargs)
