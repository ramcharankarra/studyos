from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom, Enrollment

class ClassroomTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher1', password='password123', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='password123', is_student=True)
        
        self.classroom = Classroom.objects.create(
            name='Test Subject',
            class_code='TEST-1234',
            teacher=self.teacher
        )

    def test_classroom_creation_permissions(self):
        # Teacher should be able to create
        self.client.login(username='teacher1', password='password123')
        response = self.client.post(reverse('classroom:classroom_create'), {
            'name': 'New Class',
            'description': 'Description'
        })
        self.assertRedirects(response, reverse('classroom:class_list'))
        self.assertTrue(Classroom.objects.filter(name='New Class').exists())
        self.client.logout()
        
        # Student should NOT be able to create
        self.client.login(username='student1', password='password123')
        response = self.client.post(reverse('classroom:classroom_create'), {
            'name': 'Hacked Class'
        })
        self.assertEqual(response.status_code, 302) # Redirects to login page due to user_passes_test

    def test_student_enrollment(self):
        self.client.login(username='student1', password='password123')
        
        # Initial state: not enrolled
        self.assertFalse(Enrollment.objects.filter(student=self.student, classroom=self.classroom).exists())
        
        # Enroll
        response = self.client.post(reverse('classroom:join_class'), {
            'class_code': 'TEST-1234'
        })
        self.assertRedirects(response, reverse('classroom:my_classes'))
        self.assertTrue(Enrollment.objects.filter(student=self.student, classroom=self.classroom).exists())
