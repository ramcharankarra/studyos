from django.urls import path
from . import views

app_name = 'career_assistant'

urlpatterns = [
    path('', views.career_dashboard, name='dashboard'),
]
