from django.test import TestCase
from django.urls import reverse
from core.models import User

class AuthenticationTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='testteacher',
            password='password123',
            email='teacher@example.com',
            is_teacher=True
        )
        self.student = User.objects.create_user(
            username='teststudent',
            password='password123',
            email='student@example.com',
            is_student=True
        )

    def test_login_teacher(self):
        response = self.client.post(reverse('login'), {
            'username': 'testteacher',
            'password': 'password123'
        })
        self.assertRedirects(response, reverse('dashboard'))
        self.assertTrue('_auth_user_id' in self.client.session)

    def test_login_student(self):
        response = self.client.post(reverse('login'), {
            'username': 'teststudent',
            'password': 'password123'
        })
        self.assertRedirects(response, reverse('dashboard'))
        self.assertTrue('_auth_user_id' in self.client.session)

    def test_login_invalid(self):
        response = self.client.post(reverse('login'), {
            'username': 'teststudent',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Invalid username or password")

    def test_logout(self):
        self.client.login(username='testteacher', password='password123')
        response = self.client.post(reverse('logout'))
        self.assertRedirects(response, reverse('login'))
        self.assertFalse('_auth_user_id' in self.client.session)
