from django.urls import path
from . import views

app_name = 'study_notes'

urlpatterns = [
    path('', views.notes_dashboard, name='dashboard'),
    path('upload/', views.upload_note, name='upload_note'),
    path('<int:note_id>/', views.note_detail, name='note_detail'),
    path('<int:note_id>/delete/', views.delete_note, name='delete_note'),
]
