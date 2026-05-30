from django.db import models
from core.models import User

class Notification(models.Model):
    TYPE_CHOICES = (
        ('Quiz', 'Quiz'),
        ('Assignment', 'Assignment'),
        ('Attendance', 'Attendance'),
        ('Announcement', 'Announcement'),
        ('Grade', 'Grade'),
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Announcement')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} Notification for {self.recipient.username}"
