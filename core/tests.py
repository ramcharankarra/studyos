from django.test import TestCase
from django.urls import reverse
from core.models import User

class CoreAuthenticationTests(TestCase):
    def setUp(self):
        # Create a test teacher and student
        self.teacher = User.objects.create_user(
            username='teacher1', 
            password='password123', 
            is_teacher=True, 
            full_name='Test Teacher'
        )
        self.student = User.objects.create_user(
            username='student1', 
            password='password123', 
            is_student=True, 
            full_name='Test Student'
        )

    def test_login_page_loads(self):
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)

    def test_register_page_loads(self):
        response = self.client.get(reverse('register'))
        self.assertEqual(response.status_code, 200)

    def test_teacher_dashboard_redirect(self):
        self.client.login(username='teacher1', password='password123')
        response = self.client.get(reverse('dashboard'))
        self.assertTemplateUsed(response, 'dashboards/teacher_dashboard.html')
        self.assertEqual(response.status_code, 200)

    def test_student_dashboard_redirect(self):
        self.client.login(username='student1', password='password123')
        response = self.client.get(reverse('dashboard'))
        self.assertTemplateUsed(response, 'dashboards/student_dashboard.html')
        self.assertEqual(response.status_code, 200)

    def test_logout(self):
        self.client.login(username='student1', password='password123')
        response = self.client.post(reverse('logout'))
        self.assertEqual(response.status_code, 302)  # Redirects to login
