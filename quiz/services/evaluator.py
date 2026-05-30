from ..models import QuizAttempt, StudentAnswer, Choice
from django.utils import timezone

def evaluate_attempt(attempt: QuizAttempt, answers_dict: dict):
    """
    Evaluates a submitted quiz attempt.
    answers_dict format: { question_id_str: choice_id_str }
    """
    total_score = 0
    
    # Process each submitted answer
    for question_id_str, choice_id_str in answers_dict.items():
        if not question_id_str.isdigit() or not choice_id_str.isdigit():
            continue
            
        question_id = int(question_id_str)
        choice_id = int(choice_id_str)
        
        try:
            choice = Choice.objects.get(id=choice_id, question_id=question_id)
            StudentAnswer.objects.create(
                attempt=attempt,
                question_id=question_id,
                selected_choice=choice
            )
            
            if choice.is_correct:
                total_score += choice.question.marks
        except Choice.DoesNotExist:
            continue
            
    # Finalize attempt stats
    attempt.score = total_score
    
    total_possible = attempt.quiz.total_marks
    if total_possible > 0:
        attempt.percentage = (total_score / total_possible) * 100
    else:
        attempt.percentage = 0
        
    attempt.status = 'Submitted'
    attempt.submitted_at = timezone.now()
    attempt.save()
    return attempt
