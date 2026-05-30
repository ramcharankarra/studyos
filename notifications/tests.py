from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom
from notifications.models import Notification


class NotificationModelTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='student1', password='pass', is_student=True, full_name='S1'
        )

    def test_notification_creation(self):
        n = Notification.objects.create(
            recipient=self.student,
            title='Quiz Published',
            message='A new quiz has been published.',
            notification_type='Quiz',
        )
        self.assertEqual(n.recipient, self.student)
        self.assertFalse(n.is_read)

    def test_notification_str(self):
        n = Notification.objects.create(
            recipient=self.student,
            title='Test',
            message='Test message.',
            notification_type='Announcement',
        )
        self.assertIn('student1', str(n))

    def test_mark_read(self):
        n = Notification.objects.create(
            recipient=self.student,
            title='Test',
            message='Test message.',
            notification_type='Grade',
        )
        n.is_read = True
        n.save()
        refreshed = Notification.objects.get(pk=n.pk)
        self.assertTrue(refreshed.is_read)

    def test_notification_list_view_requires_login(self):
        response = self.client.get(reverse('notifications:notification_list'))
        self.assertEqual(response.status_code, 302)

    def test_notification_list_view_logged_in(self):
        self.client.login(username='student1', password='pass')
        response = self.client.get(reverse('notifications:notification_list'))
        self.assertEqual(response.status_code, 200)
