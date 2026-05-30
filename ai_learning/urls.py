from django.urls import path
from . import views

app_name = 'ai_learning'

urlpatterns = [
    path('tutor/', views.tutor_chat, name='tutor_chat_new'),
    path('tutor/<int:session_id>/', views.tutor_chat, name='tutor_chat'),
    path('tutor/delete/<int:session_id>/', views.delete_chat_session, name='delete_chat_session'),
    path('tutor/delete-all/', views.delete_all_chat_sessions, name='delete_all_chat_sessions'),
    
    path('student/dashboard/', views.student_learning_dashboard, name='student_learning_dashboard'),
    path('student/generate-insights/', views.generate_insights_api, name='generate_insights_api'),
    
    path('teacher/', views.teacher_insights, name='teacher_insights'),
    path('teacher/class/<int:classroom_id>/generate-insights/', views.generate_class_insights_api, name='generate_class_insights_api'),
]
