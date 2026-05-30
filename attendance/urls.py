from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    # Teacher URLs
    path('teacher/', views.TeacherSessionListView.as_view(), name='session_list'),
    path('teacher/create/', views.SessionCreateView.as_view(), name='session_create'),
    path('teacher/<int:pk>/', views.SessionDetailView.as_view(), name='session_detail'),
    
    # Student URLs
    path('student/', views.StudentAttendanceDashboard.as_view(), name='student_dashboard'),
    path('student/mark/<int:pk>/', views.MarkAttendanceView.as_view(), name='mark_attendance'),
]
