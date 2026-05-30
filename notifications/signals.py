from django.db.models.signals import post_save
from django.dispatch import receiver
from quiz.models import Quiz
from assignment.models import Assignment, AssignmentSubmission
from attendance.models import AttendanceSession
from classroom.models import Enrollment
from .models import Notification

@receiver(post_save, sender=Quiz)
def quiz_published_notification(sender, instance, created, **kwargs):
    if instance.is_published:
        # Check if we already sent this (simple check: was it just created, or we can check if it exists, 
        # but to keep it simple, we'll notify on publish. A more robust way is to track "has_been_published" 
        # but this works for phase 7 requirements).
        enrollments = Enrollment.objects.filter(classroom=instance.classroom)
        for enrollment in enrollments:
            Notification.objects.get_or_create(
                recipient=enrollment.student,
                title=f"New Quiz: {instance.title}",
                message=f"A new quiz '{instance.title}' has been published in {instance.classroom.name}.",
                notification_type='Quiz'
            )

@receiver(post_save, sender=Assignment)
def assignment_published_notification(sender, instance, created, **kwargs):
    if instance.is_published:
        enrollments = Enrollment.objects.filter(classroom=instance.classroom)
        for enrollment in enrollments:
            Notification.objects.get_or_create(
                recipient=enrollment.student,
                title=f"New Assignment: {instance.title}",
                message=f"A new assignment '{instance.title}' has been published in {instance.classroom.name}.",
                notification_type='Assignment'
            )

@receiver(post_save, sender=AssignmentSubmission)
def assignment_graded_notification(sender, instance, created, **kwargs):
    if instance.status == 'Graded':
        Notification.objects.get_or_create(
            recipient=instance.student,
            title=f"Assignment Graded: {instance.assignment.title}",
            message=f"Your submission for '{instance.assignment.title}' has been graded. You received {instance.grade}/{instance.assignment.max_marks}.",
            notification_type='Grade'
        )

@receiver(post_save, sender=AttendanceSession)
def attendance_session_notification(sender, instance, created, **kwargs):
    if created:
        enrollments = Enrollment.objects.filter(classroom=instance.classroom)
        for enrollment in enrollments:
            Notification.objects.create(
                recipient=enrollment.student,
                title=f"Attendance Open: {instance.classroom.name}",
                message=f"An attendance session for {instance.classroom.name} is now open from {instance.start_time.strftime('%I:%M %p')} to {instance.end_time.strftime('%I:%M %p')}.",
                notification_type='Attendance'
            )
