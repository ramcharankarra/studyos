from django.db import models
from classroom.models import Classroom

class TeacherAIAnalytics(models.Model):
    classroom = models.OneToOneField(Classroom, on_delete=models.CASCADE, related_name='ai_analytics')
    frequently_missed_topics = models.TextField(blank=True)
    at_risk_students = models.TextField(blank=True)
    interventions = models.TextField(blank=True)
    learning_trends = models.TextField(blank=True)
    generated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AI Analytics for {self.classroom.name}"
