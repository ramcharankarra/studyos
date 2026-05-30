from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, CreateView, DetailView, View
from django.urls import reverse_lazy, reverse
from django.contrib import messages
from django.utils import timezone
from core.mixins import TeacherRequiredMixin, StudentRequiredMixin
from classroom.models import Classroom, Enrollment
from .models import AttendanceSession, AttendanceRecord

# --- TEACHER VIEWS ---

class TeacherSessionListView(TeacherRequiredMixin, ListView):
    model = AttendanceSession
    template_name = 'attendance/teacher/session_list.html'
    context_object_name = 'sessions'

    def get_queryset(self):
        return AttendanceSession.objects.filter(teacher=self.request.user).select_related('classroom')

class SessionCreateView(TeacherRequiredMixin, CreateView):
    model = AttendanceSession
    template_name = 'attendance/teacher/session_form.html'
    fields = ['classroom', 'title', 'date', 'start_time', 'end_time']
    success_url = reverse_lazy('attendance:session_list')

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.fields['classroom'].queryset = Classroom.objects.filter(teacher=self.request.user)
        return form

    def form_valid(self, form):
        form.instance.teacher = self.request.user
        response = super().form_valid(form)
        
        # Pre-populate records as Absent
        enrollments = Enrollment.objects.filter(classroom=self.object.classroom)
        records = [
            AttendanceRecord(attendance_session=self.object, student=e.student, status='Absent')
            for e in enrollments
        ]
        AttendanceRecord.objects.bulk_create(records)
        
        messages.success(self.request, 'Attendance Session Created.')
        return response

class SessionDetailView(TeacherRequiredMixin, DetailView):
    model = AttendanceSession
    template_name = 'attendance/teacher/session_detail.html'
    context_object_name = 'session'
    
    def get_queryset(self):
        return AttendanceSession.objects.filter(teacher=self.request.user).prefetch_related('records__student')

# --- STUDENT VIEWS ---

class StudentAttendanceDashboard(StudentRequiredMixin, ListView):
    model = AttendanceRecord
    template_name = 'attendance/student/dashboard.html'
    context_object_name = 'records'
    
    def get_queryset(self):
        return AttendanceRecord.objects.filter(student=self.request.user).select_related('attendance_session__classroom').order_by('-attendance_session__date')

class MarkAttendanceView(StudentRequiredMixin, View):
    def post(self, request, pk):
        record = get_object_or_404(AttendanceRecord, pk=pk, student=request.user)
        session = record.attendance_session
        
        # Validate time
        now = timezone.now().time()
        today = timezone.now().date()
        
        if session.date == today and session.start_time <= now <= session.end_time:
            record.status = 'Present'
            record.save()
            messages.success(request, f'Attendance marked present for {session.classroom.name}')
        else:
            messages.error(request, 'Attendance session is currently closed.')
            
        return redirect('attendance:student_dashboard')
