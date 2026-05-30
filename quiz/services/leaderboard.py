from django.db.models import F
from ..models import QuizAttempt, Quiz

def get_leaderboard(quiz: Quiz):
    """
    Returns the leaderboard for a specific quiz.
    Rules:
    - Only show if at least 2 students have completed attempts.
    - Rank by: Score (DESC), Percentage (DESC), Submission Time (ASC)
    """
    completed_attempts = QuizAttempt.objects.filter(
        quiz=quiz, 
        status='Submitted'
    ).select_related('student')
    
    if completed_attempts.count() < 2:
        return None # Not enough data for a leaderboard
        
    # Apply ordering rules
    ranked_attempts = completed_attempts.order_by(
        '-score',
        '-percentage',
        'submitted_at'
    )
    
    # Assign ranks
    leaderboard = []
    current_rank = 1
    for attempt in ranked_attempts:
        leaderboard.append({
            'rank': current_rank,
            'student_name': attempt.student.full_name,
            'score': attempt.score,
            'percentage': attempt.percentage,
            'submitted_at': attempt.submitted_at
        })
        current_rank += 1
        
    return leaderboard
