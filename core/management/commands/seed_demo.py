import datetime
import random
from django.utils import timezone
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction


class Command(BaseCommand):
    help = (
        'Seeds realistic demo data for development and portfolio demonstrations. '
        'Only works when DEBUG=True — cannot run in production.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete existing demo users and their data before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # ── PRODUCTION GUARD ────────────────────────────────────────
        if not settings.DEBUG:
            raise CommandError(
                'This command cannot be run in production (DEBUG=False). '
                'It is for development and portfolio demonstration only.'
            )

        from core.models import User
        from classroom.models import Classroom, Enrollment
        from quiz.models import Quiz, Question, Choice, QuizAttempt
        from assignment.models import Assignment
        from attendance.models import AttendanceSession, AttendanceRecord
        from notifications.models import Notification

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== StudyOS Demo Data Seeder ===\n'))

        if options['flush']:
            self.stdout.write('Flushing existing demo users...')
            User.objects.filter(username__startswith='demo_').delete()
            self.stdout.write(self.style.WARNING('  ✓ Demo users and related data flushed.\n'))

        # ── 1. USERS ────────────────────────────────────────────────
        self.stdout.write('Creating users...')
        teacher1, _ = User.objects.get_or_create(username='demo_teacher', defaults={
            'email': 'teacher@studyos.demo',
            'full_name': 'Dr. Priya Sharma',
            'is_teacher': True,
            'is_student': False,
        })
        teacher1.set_password('Demo@1234')
        teacher1.save()

        teacher2, _ = User.objects.get_or_create(username='demo_teacher2', defaults={
            'email': 'teacher2@studyos.demo',
            'full_name': 'Prof. Arjun Mehta',
            'is_teacher': True,
            'is_student': False,
        })
        teacher2.set_password('Demo@1234')
        teacher2.save()

        students = []
        student_data = [
            ('demo_student1', 'Ravi Kumar', 'ravi@studyos.demo'),
            ('demo_student2', 'Ananya Singh', 'ananya@studyos.demo'),
            ('demo_student3', 'Karan Patel', 'karan@studyos.demo'),
            ('demo_student4', 'Meera Nair', 'meera@studyos.demo'),
            ('demo_student5', 'Aditya Rao', 'aditya@studyos.demo'),
        ]
        for username, full_name, email in student_data:
            s, _ = User.objects.get_or_create(username=username, defaults={
                'email': email,
                'full_name': full_name,
                'is_teacher': False,
                'is_student': True,
            })
            s.set_password('Demo@1234')
            s.save()
            students.append(s)

        self.stdout.write(self.style.SUCCESS(f'  ✓ 2 teachers + {len(students)} students created'))

        # ── 2. CLASSROOMS ───────────────────────────────────────────
        self.stdout.write('Creating classrooms...')
        classroom1, _ = Classroom.objects.get_or_create(
            class_code='DEMO-PY101',
            defaults={
                'name': 'Python Programming',
                'description': 'Complete Python course from basics to OOP and beyond.',
                'teacher': teacher1,
            }
        )
        classroom2, _ = Classroom.objects.get_or_create(
            class_code='DEMO-ML201',
            defaults={
                'name': 'Machine Learning Fundamentals',
                'description': 'Supervised & unsupervised learning, scikit-learn, and real projects.',
                'teacher': teacher1,
            }
        )
        classroom3, _ = Classroom.objects.get_or_create(
            class_code='DEMO-DS301',
            defaults={
                'name': 'Data Structures & Algorithms',
                'description': 'Arrays, linked lists, trees, graphs, sorting, and dynamic programming.',
                'teacher': teacher2,
            }
        )

        for student in students:
            Enrollment.objects.get_or_create(student=student, classroom=classroom1)
        for student in students[:3]:
            Enrollment.objects.get_or_create(student=student, classroom=classroom2)
        for student in students[2:]:
            Enrollment.objects.get_or_create(student=student, classroom=classroom3)

        self.stdout.write(self.style.SUCCESS('  ✓ 3 classrooms + enrollments created'))

        # ── 3. QUIZZES ──────────────────────────────────────────────
        self.stdout.write('Creating quizzes...')
        quiz1, q1_created = Quiz.objects.get_or_create(
            title='Python Basics — AI Generated',
            classroom=classroom1,
            teacher=teacher1,
            defaults={
                'description': 'Auto-generated from Python course PDF via Gemini AI.',
                'total_marks': 30,
                'passing_marks': 15,
                'time_limit_minutes': 20,
                'is_published': True,
            }
        )
        if q1_created:
            for text, choices, correct_idx in [
                ("What is the output of `print(type([]))`?",
                 ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "None"], 0),
                ("Which method removes and returns the last item of a list?",
                 [".pop()", ".remove()", ".delete()", ".last()"], 0),
                ("What keyword defines a function in Python?",
                 ["def", "function", "fn", "lambda"], 0),
            ]:
                q = Question.objects.create(quiz=quiz1, question_text=text, marks=10)
                for i, ct in enumerate(choices):
                    Choice.objects.create(question=q, choice_text=ct, is_correct=(i == correct_idx))

        quiz2, q2_created = Quiz.objects.get_or_create(
            title='ML Concepts Quiz',
            classroom=classroom2,
            teacher=teacher1,
            defaults={
                'description': 'Core ML theory and algorithm identification.',
                'total_marks': 20,
                'passing_marks': 10,
                'time_limit_minutes': 15,
                'is_published': True,
            }
        )
        if q2_created:
            for text, choices, correct_idx in [
                ("What is Gradient Descent?",
                 ["An optimization algorithm", "A loss function", "A dataset split", "A regularization term"], 0),
                ("Which algorithm is used for classification?",
                 ["Logistic Regression", "Linear Regression", "K-Means", "PCA"], 0),
            ]:
                q = Question.objects.create(quiz=quiz2, question_text=text, marks=10)
                for i, ct in enumerate(choices):
                    Choice.objects.create(question=q, choice_text=ct, is_correct=(i == correct_idx))

        self.stdout.write(self.style.SUCCESS('  ✓ Quizzes and questions created'))

        # ── 4. QUIZ ATTEMPTS ────────────────────────────────────────
        self.stdout.write('Creating quiz attempts...')
        for student, score in zip(students, [30, 20, 10, 30, 20]):
            QuizAttempt.objects.get_or_create(
                student=student, quiz=quiz1,
                defaults={
                    'score': score,
                    'percentage': round(score / quiz1.total_marks * 100, 2),
                    'status': 'Submitted',
                    'submitted_at': timezone.now() - datetime.timedelta(days=random.randint(1, 10)),
                }
            )
        for student, score in zip(students[:3], [20, 10, 20]):
            QuizAttempt.objects.get_or_create(
                student=student, quiz=quiz2,
                defaults={
                    'score': score,
                    'percentage': round(score / quiz2.total_marks * 100, 2),
                    'status': 'Submitted',
                    'submitted_at': timezone.now() - datetime.timedelta(days=random.randint(1, 7)),
                }
            )
        self.stdout.write(self.style.SUCCESS('  ✓ Quiz attempts created'))

        # ── 5. ASSIGNMENTS ──────────────────────────────────────────
        self.stdout.write('Creating assignments...')
        Assignment.objects.get_or_create(
            title='Build a CLI Calculator',
            classroom=classroom1,
            teacher=teacher1,
            defaults={
                'description': 'Build a command-line calculator supporting +, -, *, / operations.',
                'max_marks': 100,
                'deadline': timezone.now() + datetime.timedelta(days=7),
                'is_published': True,
            }
        )
        Assignment.objects.get_or_create(
            title='K-Means Clustering Analysis',
            classroom=classroom2,
            teacher=teacher1,
            defaults={
                'description': 'Apply K-Means clustering on the Iris dataset and visualize clusters.',
                'max_marks': 100,
                'deadline': timezone.now() + datetime.timedelta(days=14),
                'is_published': True,
            }
        )
        self.stdout.write(self.style.SUCCESS('  ✓ Assignments created'))

        # ── 6. ATTENDANCE ───────────────────────────────────────────
        self.stdout.write('Creating attendance sessions...')
        import datetime as dt
        for i in range(3):
            session_date = (timezone.now() - datetime.timedelta(days=i * 7)).date()
            session_time = dt.time(10, 0)
            session, _ = AttendanceSession.objects.get_or_create(
                classroom=classroom1,
                date=session_date,
                defaults={
                    'title': f'Lecture {i + 1}: Python Basics',
                    'teacher': teacher1,
                    'start_time': session_time,
                    'end_time': dt.time(11, 0),
                }
            )
            for student in students:
                status = 'Present' if random.random() > 0.2 else 'Absent'
                AttendanceRecord.objects.get_or_create(
                    attendance_session=session, student=student,
                    defaults={'status': status}
                )
        self.stdout.write(self.style.SUCCESS('  ✓ Attendance sessions + records created'))

        # ── 7. NOTIFICATIONS ────────────────────────────────────────
        self.stdout.write('Creating notifications...')
        sample_notifications = [
            ('Quiz Available', 'New quiz published: Python Basics — AI Generated.', 'Quiz'),
            ('Assignment Posted', 'New assignment: Build a CLI Calculator.', 'Assignment'),
            ('Grade Received', 'Your quiz attempt has been graded.', 'Grade'),
        ]
        for student in students:
            for i, (title, message, ntype) in enumerate(sample_notifications):
                Notification.objects.get_or_create(
                    recipient=student,
                    title=title,
                    defaults={
                        'message': message,
                        'notification_type': ntype,
                        'is_read': i > 1,
                    }
                )
        self.stdout.write(self.style.SUCCESS('  ✓ Notifications created'))

        # ── SUMMARY ─────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 55)
        self.stdout.write(self.style.SUCCESS('✅ Demo data seeded successfully!\n'))
        self.stdout.write(self.style.MIGRATE_HEADING('Login Credentials (password: Demo@1234):'))
        self.stdout.write('  Teacher 1:  demo_teacher    (Dr. Priya Sharma)')
        self.stdout.write('  Teacher 2:  demo_teacher2   (Prof. Arjun Mehta)')
        self.stdout.write('  Students:   demo_student1 through demo_student5')
        self.stdout.write('\nTo flush and re-seed: python manage.py seed_demo --flush')
        self.stdout.write('=' * 55 + '\n')
