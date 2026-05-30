from django.db import models
from django.conf import settings

class ResumeAnalysis(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resume_analyses')
    resume_file = models.FileField(upload_to='resumes/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    ats_score = models.IntegerField(null=True, blank=True)
    analysis_results = models.TextField(blank=True, help_text="HTML formatted analysis results")
    improvement_suggestions = models.TextField(blank=True, help_text="HTML formatted improvement suggestions")

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name_plural = 'Resume Analyses'

    def __str__(self):
        return f"{self.student.username} - Resume {self.id}"

class CareerRoadmap(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='career_roadmaps')
    dream_job = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    roadmap_html = models.TextField(blank=True, help_text="Generated roadmap in HTML")
    skills_required = models.TextField(blank=True, help_text="HTML formatted list of skills required")
    project_suggestions = models.TextField(blank=True, help_text="HTML formatted project suggestions")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.dream_job} Roadmap"
