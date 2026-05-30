from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    is_teacher = models.BooleanField(default=False)
    is_student = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def get_role_display(self):
        if self.is_teacher:
            return "Teacher"
        elif self.is_student:
            return "Student"
        return "Admin"
