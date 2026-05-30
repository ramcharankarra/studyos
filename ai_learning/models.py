from django.db import models
from core.models import User
from classroom.models import Classroom

class ChatSession(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_chat_sessions')
    title = models.CharField(max_length=200, default="New Conversation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username} - {self.title}"

class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('model', 'Model'),
    )
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.role} at {self.timestamp}"

class LearningInsight(models.Model):
    INSIGHT_TYPES = (
        ('strength', 'Strength'),
        ('weakness', 'Weakness'),
        ('recommendation', 'Recommendation'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_insights', null=True, blank=True)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='class_insights', null=True, blank=True)
    insight_type = models.CharField(max_length=20, choices=INSIGHT_TYPES)
    content = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.student:
            return f"{self.insight_type.capitalize()} for {self.student.username}"
        return f"Class {self.insight_type.capitalize()} for {self.classroom.name}"

class AILog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    question = models.TextField()
    response_time_ms = models.IntegerField(default=0)
    is_error = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        status = "ERROR" if self.is_error else "SUCCESS"
        return f"[{status}] Log at {self.timestamp} ({self.response_time_ms}ms)"
