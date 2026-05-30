from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom
from quiz.models import Quiz, Question, Choice, QuizAttempt


class QuizModelTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', password='password123', is_teacher=True
        )
        self.student = User.objects.create_user(
            username='student1', password='password123', is_student=True
        )
        self.classroom = Classroom.objects.create(name='Algebra Basics', teacher=self.teacher)
        self.quiz = Quiz.objects.create(
            title='Algebra Quiz 1',
            classroom=self.classroom,
            teacher=self.teacher,
            passing_marks=50,
            total_marks=2,
        )
        self.question = Question.objects.create(
            quiz=self.quiz, question_text='What is 2 + 2?', marks=1
        )
        self.correct_choice = Choice.objects.create(
            question=self.question, choice_text='4', is_correct=True
        )
        Choice.objects.create(question=self.question, choice_text='3', is_correct=False)
        Choice.objects.create(question=self.question, choice_text='5', is_correct=False)

    def test_quiz_str(self):
        self.assertEqual(str(self.quiz), 'Algebra Quiz 1')

    def test_quiz_has_questions(self):
        self.assertEqual(self.quiz.questions.count(), 1)

    def test_question_has_choices(self):
        self.assertEqual(self.question.choices.count(), 3)

    def test_only_one_correct_choice(self):
        correct = self.question.choices.filter(is_correct=True)
        self.assertEqual(correct.count(), 1)
        self.assertEqual(correct.first().choice_text, '4')

    def test_quiz_is_unpublished_by_default(self):
        self.assertFalse(self.quiz.is_published)


class QuizViewTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher1', password='password123', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='password123', is_student=True)
        self.classroom = Classroom.objects.create(name='Algebra Basics', teacher=self.teacher)
        self.quiz = Quiz.objects.create(
            title='Algebra Quiz 1',
            classroom=self.classroom,
            teacher=self.teacher,
            passing_marks=50,
            total_marks=1,
            is_published=True,
        )

    def test_teacher_can_view_quiz_list(self):
        self.client.login(username='teacher1', password='password123')
        response = self.client.get(reverse('quiz:quiz_list'))
        self.assertEqual(response.status_code, 200)

    def test_teacher_can_view_quiz_detail(self):
        self.client.login(username='teacher1', password='password123')
        response = self.client.get(reverse('quiz:quiz_detail', args=[self.quiz.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Algebra Quiz 1')

    def test_student_cannot_access_teacher_quiz_detail(self):
        """Students should be blocked from the teacher quiz detail view."""
        self.client.login(username='student1', password='password123')
        response = self.client.get(reverse('quiz:quiz_detail', args=[self.quiz.pk]))
        # Should redirect (403 or redirect to dashboard)
        self.assertNotEqual(response.status_code, 200)

    def test_unauthenticated_redirected_to_login(self):
        response = self.client.get(reverse('quiz:quiz_list'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.url)
