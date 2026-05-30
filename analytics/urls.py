from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    path('student/', views.student_analytics, name='student_analytics'),
    
    path('teacher/', views.teacher_analytics, name='teacher_analytics'),
    path('teacher/generate/<int:class_id>/', views.generate_teacher_ai_analytics_api, name='generate_ai_analytics'),
    path('teacher/export/csv/', views.export_teacher_analytics_csv, name='export_csv'),
    path('teacher/export/pdf/', views.export_teacher_analytics_pdf, name='export_pdf'),
]
