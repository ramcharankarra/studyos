import datetime
from django.utils import timezone
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from core.models import User
from classroom.models import Classroom, Enrollment
from assignment.models import Assignment, AssignmentSubmission

class AssignmentTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher1', password='pass', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='pass', is_student=True)
        
        self.classroom = Classroom.objects.create(name='Class', class_code='CODE1', teacher=self.teacher)
        Enrollment.objects.create(student=self.student, classroom=self.classroom)
        
        self.assignment = Assignment.objects.create(
            title='Test Assignment',
            classroom=self.classroom,
            teacher=self.teacher,
            max_marks=100,
            deadline=timezone.now() + datetime.timedelta(days=1),
            is_published=True
        )

    def test_teacher_grade_assignment(self):
        # Create a submission
        mock_file = SimpleUploadedFile("test_file.txt", b"file_content")
        sub = AssignmentSubmission.objects.create(
            assignment=self.assignment,
            student=self.student,
            submitted_file=mock_file,
            status='Submitted'
        )
        
        self.client.login(username='teacher1', password='pass')
        response = self.client.post(reverse('assignment:grade_submission', args=[sub.id]), {
            'grade': 95,
            'feedback': 'Great work!'
        })
        
        self.assertRedirects(response, reverse('assignment:teacher_assignment_detail', args=[self.assignment.id]))
        sub.refresh_from_db()
        self.assertEqual(sub.grade, 95)
        self.assertEqual(sub.status, 'Graded')
