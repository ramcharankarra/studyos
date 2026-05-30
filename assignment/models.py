from django.db import models
from core.models import User
from classroom.models import Classroom
import os

def assignment_upload_path(instance, filename):
    return f'assignment_uploads/classroom_{instance.assignment.classroom.id}/student_{instance.student.id}/{filename}'

def assignment_attachment_path(instance, filename):
    return f'assignment_attachments/classroom_{instance.classroom.id}/{filename}'

class Assignment(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='assignments')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assignments')
    max_marks = models.PositiveIntegerField(default=100)
    deadline = models.DateTimeField()
    attachment = models.FileField(upload_to=assignment_attachment_path, blank=True, null=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class AssignmentSubmission(models.Model):
    STATUS_CHOICES = (
        ('Not Submitted', 'Not Submitted'),
        ('Submitted', 'Submitted'),
        ('Graded', 'Graded'),
    )

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignment_submissions')
    submitted_file = models.FileField(upload_to=assignment_upload_path)
    submitted_at = models.DateTimeField(auto_now=True)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted')

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.student.username} - {self.assignment.title}"
