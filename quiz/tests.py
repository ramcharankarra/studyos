from django.test import TestCase
from django.urls import reverse
from core.models import User
from classroom.models import Classroom, Enrollment
from quiz.models import Quiz, Question, Choice, QuizAttempt

class QuizTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher1', password='pass', is_teacher=True)
        self.student = User.objects.create_user(username='student1', password='pass', is_student=True)
        
        self.classroom = Classroom.objects.create(name='Class', class_code='CODE1', teacher=self.teacher)
        Enrollment.objects.create(student=self.student, classroom=self.classroom)
        
        self.quiz = Quiz.objects.create(
            title='Test Quiz',
            classroom=self.classroom,
            teacher=self.teacher,
            total_marks=10,
            passing_marks=5,
            time_limit_minutes=10,
            is_published=True
        )
        
        self.q1 = Question.objects.create(quiz=self.quiz, question_text='What is 2+2?', marks=10)
        self.c1 = Choice.objects.create(question=self.q1, choice_text='3', is_correct=False)
        self.c2 = Choice.objects.create(question=self.q1, choice_text='4', is_correct=True)

    def test_student_take_quiz(self):
        self.client.login(username='student1', password='pass')
        
        # Create attempt
        QuizAttempt.objects.create(quiz=self.quiz, student=self.student, status='In Progress')
        
        # Test Quiz Submission
        response = self.client.post(reverse('quiz:take_quiz', args=[self.quiz.id]), {
            str(self.q1.id): self.c2.id
        })
        
        # Should redirect to results
        self.assertRedirects(response, reverse('quiz:quiz_result', args=[self.quiz.id]))
        
        # Verify score
        attempt = QuizAttempt.objects.get(quiz=self.quiz, student=self.student)
        self.assertEqual(attempt.score, 10)
