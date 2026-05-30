from django.db import models
from core.models import User
from classroom.models import Classroom

class AttendanceSession(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='attendance_sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_attendance_sessions')
    title = models.CharField(max_length=200, default="Daily Attendance")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-start_time']

    def __str__(self):
        return f"{self.classroom.name} - {self.date}"

class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
    )

    attendance_session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Absent')
    marked_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('attendance_session', 'student')

    def __str__(self):
        return f"{self.student.username} - {self.status}"
