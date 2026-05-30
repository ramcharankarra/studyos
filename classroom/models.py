from django.db import models
from django.conf import settings
from .services import generate_class_code

class Classroom(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    class_code = models.CharField(max_length=15, unique=True, default=generate_class_code)
    created_at = models.DateTimeField(auto_now_add=True)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='classrooms')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class Enrollment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['student', 'classroom'], name='unique_student_enrollment')
        ]
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.student.username} in {self.classroom.name}"
