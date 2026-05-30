import logging
logger = logging.getLogger(__name__)

import os
import json
from google import genai
from pydantic import BaseModel, Field
from typing import List
from django.conf import settings
from ..models import Quiz, Question, Choice

class ChoiceModel(BaseModel):
    text: str = Field(description="The text of the choice")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise")

class QuestionModel(BaseModel):
    question_text: str = Field(description="The text of the question")
    choices: List[ChoiceModel] = Field(description="Exactly 4 choices for the question, with exactly 1 correct answer")

class ShortLongQuestionModel(BaseModel):
    question_text: str = Field(description="The text of the question")
    expected_answer: str = Field(description="Brief expected answer or grading rubric")
    type: str = Field(description="Either 'SHORT' or 'LONG'")

class QuizOutputModel(BaseModel):
    questions: List[QuestionModel] = Field(description="List of multiple choice questions")
    extra_questions: List[ShortLongQuestionModel] = Field(description="List of Short and Long Answer questions", default_factory=list)

def generate_quiz_via_ai(topic: str, difficulty: str, num_questions: int, quiz_instance: Quiz, document_text: str = ""):
    """
    Calls the Gemini API to generate a quiz and saves the Question/Choice records to the DB.
    Optionally uses `document_text` to extract context.
    Returns True if successful, False otherwise.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
        
    client = genai.Client(api_key=api_key)
    
    context_str = f"Document Context: {document_text[:100000]}\n" if document_text else ""
    
    prompt = f"""
    You are an expert educator. Generate a quiz about "{topic}".
    {context_str}
    Difficulty level: {difficulty}.
    We need exactly {num_questions} Multiple Choice Questions (MCQs). Each MCQ MUST have exactly 4 choices, with exactly 1 correct answer.
    ALSO, generate 3 Short Answer Questions and 2 Long Answer Questions based on the same topic/document.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': QuizOutputModel,
                'temperature': 0.5,
            },
        )
        
        data = json.loads(response.text)
        
        # Save to DB
        for i, q_data in enumerate(data.get('questions', [])):
            question = Question.objects.create(
                quiz=quiz_instance,
                question_text=q_data['question_text'],
                marks=1,
                order=i+1
            )
            for c_data in q_data.get('choices', []):
                Choice.objects.create(
                    question=question,
                    choice_text=c_data['text'],
                    is_correct=c_data['is_correct']
                )
                
        # Handle extra questions
        if data.get('extra_questions'):
            html = "<h4>Generated Written Questions</h4><ul>"
            for eq in data['extra_questions']:
                html += f"<li><strong>[{eq['type']}]</strong> {eq['question_text']}<br><em class='text-muted'>Expected: {eq['expected_answer']}</em></li>"
            html += "</ul>"
            quiz_instance.extra_questions = html
            
        # Update quiz total marks
        quiz_instance.total_marks = num_questions
        quiz_instance.passing_marks = max(1, int(num_questions * 0.5)) # 50% pass mark default
        quiz_instance.save()
        return True
        
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}")
        return False
