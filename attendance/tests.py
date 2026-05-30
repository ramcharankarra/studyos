import datetime
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from core.models import User
from classroom.models import Classroom
from attendance.models import AttendanceSession, AttendanceRecord


class AttendanceModelTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', password='pass', is_teacher=True, full_name='T1'
        )
        self.student = User.objects.create_user(
            username='student1', password='pass', is_student=True, full_name='S1'
        )
        self.classroom = Classroom.objects.create(name='Test Class', teacher=self.teacher)
        self.session = AttendanceSession.objects.create(
            classroom=self.classroom,
            teacher=self.teacher,
            title='Lecture 1',
            date=timezone.now().date(),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(11, 0),
        )

    def test_session_str(self):
        self.assertIn('Test Class', str(self.session))

    def test_attendance_record_created(self):
        record = AttendanceRecord.objects.create(
            attendance_session=self.session,
            student=self.student,
            status='Present',
        )
        self.assertEqual(record.status, 'Present')
        self.assertEqual(record.student, self.student)

    def test_duplicate_attendance_record_raises(self):
        from django.db import IntegrityError
        AttendanceRecord.objects.create(
            attendance_session=self.session, student=self.student, status='Present'
        )
        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                attendance_session=self.session, student=self.student, status='Absent'
            )

    def test_attendance_view_requires_teacher(self):
        self.client.login(username='student1', password='pass')
        # Students should not access teacher attendance session list
        response = self.client.get(reverse('attendance:session_list'))
        self.assertNotEqual(response.status_code, 200)

    def test_teacher_can_access_attendance_dashboard(self):
        self.client.login(username='teacher1', password='pass')
        response = self.client.get(reverse('attendance:session_list'))
        self.assertEqual(response.status_code, 200)
