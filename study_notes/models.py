from django.db import models
from django.conf import settings

class StudyNote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_notes')
    title = models.CharField(max_length=255)
    
    # Original Upload
    original_file = models.FileField(upload_to='study_notes_uploads/')
    file_type = models.CharField(max_length=10, blank=True)
    
    # Generated Content
    summary = models.TextField(blank=True)
    key_concepts = models.TextField(blank=True)
    important_questions = models.TextField(blank=True)
    revision_sheet = models.TextField(blank=True)
    flashcards_json = models.JSONField(default=list, blank=True) # List of dicts: [{'front': '...', 'back': '...'}]
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"
