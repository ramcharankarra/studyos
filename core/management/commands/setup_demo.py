import datetime
from django.utils import timezone
from django.core.management.base import BaseCommand
from core.models import User
from classroom.models import Classroom, Enrollment
from quiz.models import Quiz, Question, Choice, QuizAttempt
from assignment.models import Assignment
from django.db import transaction

class Command(BaseCommand):
    help = 'Sets up demo data for interviewers and recruiters'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write("Setting up demo data...")

        # 1. Create Demo Teacher
        teacher, created = User.objects.get_or_create(username='demo_teacher', defaults={
            'email': 'teacher@demo.com',
            'is_teacher': True,
            'is_student': False
        })
        if created:
            teacher.set_password('demo1234')
            teacher.save()
            self.stdout.write(self.style.SUCCESS('Created demo_teacher (pw: demo1234)'))

        # 2. Create Demo Student
        student, created = User.objects.get_or_create(username='demo_student', defaults={
            'email': 'student@demo.com',
            'is_teacher': False,
            'is_student': True
        })
        if created:
            student.set_password('demo1234')
            student.save()
            self.stdout.write(self.style.SUCCESS('Created demo_student (pw: demo1234)'))

        # 3. Create Classroom
        classroom, created = Classroom.objects.get_or_create(
            class_code='DEMO-CS101',
            defaults={
                'name': 'Introduction to Computer Science',
                'description': 'A comprehensive overview of CS fundamentals, Python, and data structures.',
                'teacher': teacher
            }
        )
        
        # 4. Enroll Student
        Enrollment.objects.get_or_create(student=student, classroom=classroom)

        # 5. Create AI Quiz Data (Mock)
        quiz, created = Quiz.objects.get_or_create(
            title='Python Fundamentals (AI Generated)',
            classroom=classroom,
            teacher=teacher,
            defaults={
                'description': 'AI generated quiz covering Python basics.',
                'total_marks': 20,
                'passing_marks': 10,
                'time_limit_minutes': 15,
                'is_published': True
            }
        )

        if created:
            q1 = Question.objects.create(quiz=quiz, question_text="What is a 'list' in Python?", marks=10)
            Choice.objects.create(question=q1, choice_text="A mutable, ordered sequence of items", is_correct=True)
            Choice.objects.create(question=q1, choice_text="An immutable collection of unique items", is_correct=False)
            
            q2 = Question.objects.create(quiz=quiz, question_text="Which keyword is used to define a function?", marks=10)
            Choice.objects.create(question=q2, choice_text="def", is_correct=True)
            Choice.objects.create(question=q2, choice_text="func", is_correct=False)
            
            # Simulate a student attempt
            attempt = QuizAttempt.objects.create(
                student=student, 
                quiz=quiz, 
                score=10, 
                percentage=50.0, 
                status='Submitted',
                submitted_at=timezone.now()
            )

        # 6. Create Assignment
        Assignment.objects.get_or_create(
            title='Build a Web Scraper',
            classroom=classroom,
            teacher=teacher,
            defaults={
                'description': 'Use BeautifulSoup to scrape a webpage.',
                'max_marks': 100,
                'deadline': timezone.now() + datetime.timedelta(days=7),
                'is_published': True
            }
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))
