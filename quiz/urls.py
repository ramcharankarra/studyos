from django.urls import path
from . import views

app_name = 'quiz'

urlpatterns = [
    # Teacher URLs
    path('teacher/', views.TeacherQuizListView.as_view(), name='quiz_list'),
    path('teacher/create/', views.QuizCreateView.as_view(), name='quiz_create'),
    path('teacher/ai-generate/', views.AIGenerateQuizView.as_view(), name='ai_generate'),
    path('teacher/<int:pk>/', views.QuizDetailView.as_view(), name='quiz_detail'),
    path('teacher/<int:pk>/edit/', views.QuizUpdateView.as_view(), name='quiz_update'),
    path('teacher/<int:pk>/delete/', views.QuizDeleteView.as_view(), name='quiz_delete'),
    path('teacher/<int:pk>/publish/', views.PublishQuizView.as_view(), name='quiz_publish'),
    path('teacher/<int:pk>/leaderboard/', views.QuizLeaderboardView.as_view(), name='quiz_leaderboard'),
    
    # Student URLs
    path('student/', views.StudentQuizListView.as_view(), name='student_quiz_list'),
    path('student/<int:pk>/start/', views.StartQuizView.as_view(), name='start_quiz'),
    path('student/<int:pk>/take/', views.TakeQuizView.as_view(), name='take_quiz'),
    path('student/<int:pk>/result/', views.QuizResultView.as_view(), name='quiz_result'),
]
