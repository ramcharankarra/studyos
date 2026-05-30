from django.db import models
from django.conf import settings
from classroom.models import Classroom
from attendance.models import AttendanceSession

class LiveClass(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='live_classes')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_classes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    meeting_link = models.URLField(max_length=500)
    
    # Linked attendance session (created automatically)
    attendance_session = models.OneToOneField(AttendanceSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='live_class')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-start_time']

    def __str__(self):
        return f"{self.title} - {self.date} ({self.classroom.name})"
