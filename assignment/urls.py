from django.urls import path
from . import views

app_name = 'assignment'

urlpatterns = [
    # Teacher URLs
    path('teacher/', views.TeacherAssignmentListView.as_view(), name='teacher_assignment_list'),
    path('teacher/create/', views.AssignmentCreateView.as_view(), name='assignment_create'),
    path('teacher/<int:pk>/', views.TeacherAssignmentDetailView.as_view(), name='teacher_assignment_detail'),
    path('teacher/<int:pk>/edit/', views.AssignmentUpdateView.as_view(), name='assignment_update'),
    path('teacher/<int:pk>/delete/', views.AssignmentDeleteView.as_view(), name='assignment_delete'),
    path('teacher/<int:pk>/publish/', views.publish_assignment, name='assignment_publish'),
    path('teacher/submission/<int:pk>/grade/', views.grade_submission, name='grade_submission'),

    # Student URLs
    path('student/', views.StudentAssignmentListView.as_view(), name='student_assignment_list'),
    path('student/<int:pk>/', views.student_assignment_detail, name='student_assignment_detail'),
]
