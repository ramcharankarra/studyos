from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom, Enrollment


class ClassroomModelTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1',
            password='password123',
            is_teacher=True,
            full_name='Test Teacher',
        )
        self.student = User.objects.create_user(
            username='student1',
            password='password123',
            is_student=True,
            full_name='Test Student',
        )
        self.classroom = Classroom.objects.create(
            name='Algebra Basics',
            teacher=self.teacher,
        )

    def test_classroom_created_with_code(self):
        """Classroom should auto-generate a unique class_code on creation."""
        self.assertIsNotNone(self.classroom.class_code)
        self.assertGreater(len(self.classroom.class_code), 0)

    def test_classroom_str(self):
        self.assertEqual(str(self.classroom), 'Algebra Basics')

    def test_enrollment_created(self):
        enrollment = Enrollment.objects.create(student=self.student, classroom=self.classroom)
        self.assertEqual(enrollment.student, self.student)
        self.assertEqual(enrollment.classroom, self.classroom)

    def test_duplicate_enrollment_raises(self):
        """A student should not be able to enroll in the same classroom twice."""
        from django.db import IntegrityError
        Enrollment.objects.create(student=self.student, classroom=self.classroom)
        with self.assertRaises(IntegrityError):
            Enrollment.objects.create(student=self.student, classroom=self.classroom)


class ClassroomViewTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher1', password='password123', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='password123', is_student=True)
        self.classroom = Classroom.objects.create(name='Algebra Basics', teacher=self.teacher)

    def test_teacher_can_view_classroom_list(self):
        self.client.login(username='teacher1', password='password123')
        response = self.client.get(reverse('classroom:class_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Algebra Basics')

    def test_teacher_can_view_classroom_detail(self):
        self.client.login(username='teacher1', password='password123')
        response = self.client.get(reverse('classroom:classroom_detail', args=[self.classroom.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Algebra Basics')

    def test_student_join_classroom_with_valid_code(self):
        self.client.login(username='student1', password='password123')
        response = self.client.post(
            reverse('classroom:join_class'),
            {'class_code': self.classroom.class_code},
        )
        # Should redirect on successful join
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Enrollment.objects.filter(student=self.student, classroom=self.classroom).exists())

    def test_student_join_classroom_with_invalid_code(self):
        self.client.login(username='student1', password='password123')
        response = self.client.post(reverse('classroom:join_class'), {'class_code': 'INVALID'})
        # Should stay on the same page with an error
        self.assertEqual(response.status_code, 200)
