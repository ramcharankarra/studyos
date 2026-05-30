from django.urls import path
from . import views

app_name = 'classroom'

urlpatterns = [
    # Teacher Classroom URLs
    path('classes/', views.ClassroomListView.as_view(), name='class_list'),
    path('classes/create/', views.ClassroomCreateView.as_view(), name='classroom_create'),
    path('classes/<int:pk>/', views.ClassroomDetailView.as_view(), name='classroom_detail'),
    path('classes/<int:pk>/edit/', views.ClassroomUpdateView.as_view(), name='classroom_update'),
    path('classes/<int:pk>/delete/', views.ClassroomDeleteView.as_view(), name='classroom_delete'),
    path('classes/<int:classroom_id>/remove-student/<int:student_id>/', views.RemoveStudentView.as_view(), name='remove_student'),
    
    # Student URLs
    path('my-classes/', views.StudentMyClassesView.as_view(), name='my_classes'),
    path('join-class/', views.JoinClassView.as_view(), name='join_class'),
    path('my-classes/<int:pk>/', views.StudentClassroomDetailView.as_view(), name='student_classroom_detail'),
    path('my-classes/<int:pk>/leave/', views.LeaveClassView.as_view(), name='leave_class'),
]
