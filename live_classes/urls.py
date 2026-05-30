from django.urls import path
from . import views

app_name = 'live_classes'

urlpatterns = [
    path('teacher/', views.teacher_dashboard, name='teacher_dashboard'),
    path('teacher/create/', views.create_live_class, name='create_live_class'),
    path('teacher/<int:class_id>/edit/', views.edit_live_class, name='edit_live_class'),
    path('teacher/<int:class_id>/cancel/', views.cancel_live_class, name='cancel_live_class'),
    
    path('student/', views.student_dashboard, name='student_dashboard'),
    path('student/<int:class_id>/join/', views.join_live_class, name='join_live_class'),
]
