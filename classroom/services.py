import random
import string

def generate_class_code():
    """
    Generates a unique collision-safe class code in the format: SUBJ-AB12CD
    """
    from .models import Classroom
    
    while True:
        prefix = "SUBJ"
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"{prefix}-{suffix}"
        
        if not Classroom.objects.filter(class_code=code).exists():
            return code

def enroll_student(student, class_code):
    """
    Handles logic for enrolling a student securely.
    Returns (success_bool, message, classroom_obj)
    """
    from .models import Classroom, Enrollment
    try:
        classroom = Classroom.objects.get(class_code=class_code)
        if Enrollment.objects.filter(student=student, classroom=classroom).exists():
            return False, 'You are already enrolled in this class.', None
        
        enrollment = Enrollment.objects.create(student=student, classroom=classroom)
        return True, f'Successfully joined {classroom.name}!', classroom
    except Classroom.DoesNotExist:
        return False, 'Invalid class code.', None
