from django.utils import timezone
from .models import AssignmentSubmission

def is_past_deadline(assignment):
    return timezone.now() > assignment.deadline

def can_student_submit(assignment, student):
    if not assignment.is_published:
        return False
    if is_past_deadline(assignment):
        return False
    return True

def get_submission_status(assignment, student):
    submission = AssignmentSubmission.objects.filter(assignment=assignment, student=student).first()
    if not submission:
        return 'Not Submitted'
    return submission.status

def calculate_assignment_stats(assignment):
    total_students = assignment.classroom.enrollments.count()
    submissions = AssignmentSubmission.objects.filter(assignment=assignment)
    submitted_count = submissions.count()
    graded_count = submissions.filter(status='Graded').count()
    
    submission_rate = (submitted_count / total_students * 100) if total_students > 0 else 0
    
    avg_grade = 0
    highest_grade = 0
    lowest_grade = 0
    
    graded_submissions = submissions.filter(status='Graded')
    if graded_submissions.exists():
        grades = [sub.grade for sub in graded_submissions if sub.grade is not None]
        if grades:
            avg_grade = sum(grades) / len(grades)
            highest_grade = max(grades)
            lowest_grade = min(grades)
            
    return {
        'total_students': total_students,
        'submitted_count': submitted_count,
        'graded_count': graded_count,
        'submission_rate': round(submission_rate, 2),
        'avg_grade': round(avg_grade, 2),
        'highest_grade': highest_grade,
        'lowest_grade': lowest_grade,
    }
