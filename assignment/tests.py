from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom
from assignment.models import Assignment, AssignmentSubmission
from django.utils import timezone
import datetime


class AssignmentModelTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', password='pass', is_teacher=True, full_name='T1'
        )
        self.student = User.objects.create_user(
            username='student1', password='pass', is_student=True, full_name='S1'
        )
        self.classroom = Classroom.objects.create(name='Test Class', teacher=self.teacher)
        self.assignment = Assignment.objects.create(
            title='Test Assignment',
            classroom=self.classroom,
            teacher=self.teacher,
            max_marks=100,
            deadline=timezone.now() + datetime.timedelta(days=7),
            is_published=True,
        )

    def test_assignment_str(self):
        self.assertEqual(str(self.assignment), 'Test Assignment')

    def test_assignment_is_published(self):
        self.assertTrue(self.assignment.is_published)

    def test_assignment_deadline_is_future(self):
        self.assertGreater(self.assignment.deadline, timezone.now())


class AssignmentViewTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', password='pass', is_teacher=True, full_name='T1'
        )
        self.student = User.objects.create_user(
            username='student1', password='pass', is_student=True, full_name='S1'
        )
        self.classroom = Classroom.objects.create(name='Test Class', teacher=self.teacher)
        self.assignment = Assignment.objects.create(
            title='Test Assignment',
            classroom=self.classroom,
            teacher=self.teacher,
            max_marks=100,
            deadline=timezone.now() + datetime.timedelta(days=7),
            is_published=True,
        )

    def test_teacher_can_view_assignment_list(self):
        self.client.login(username='teacher1', password='pass')
        response = self.client.get(reverse('assignment:teacher_assignment_list'))
        self.assertEqual(response.status_code, 200)

    def test_student_cannot_access_teacher_assignment_list(self):
        self.client.login(username='student1', password='pass')
        response = self.client.get(reverse('assignment:teacher_assignment_list'))
        self.assertNotEqual(response.status_code, 200)

    def test_unauthenticated_redirected(self):
        response = self.client.get(reverse('assignment:teacher_assignment_list'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.url)
