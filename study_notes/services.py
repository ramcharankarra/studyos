import os
import json
from google import genai
from pypdf import PdfReader
from docx import Document
from pptx import Presentation
from .models import StudyNote

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=api_key)

def extract_text_from_file(file_path, file_extension):
    text = ""
    try:
        if file_extension == '.pdf':
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                if i > 40: break # Limit to first 40 pages to save tokens
                text += page.extract_text() + "\n"
                
        elif file_extension == '.docx':
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        elif file_extension == '.pptx':
            prs = Presentation(file_path)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
                        
        elif file_extension == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
    except Exception as e:
        print(f"Error extracting text: {e}")
        
    return text[:100000] # Hard limit to roughly fit in prompt limits safely

def generate_study_notes(study_note_id):
    """
    Background-compatible function to read file, prompt Gemini, and update DB.
    """
    try:
        note = StudyNote.objects.get(id=study_note_id)
        file_path = note.original_file.path
        
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        
        extracted_text = extract_text_from_file(file_path, ext)
        
        if not extracted_text.strip():
            note.summary = "Error: Could not extract text from the uploaded file."
            note.save()
            return False
            
        client = get_gemini_client()
        
        prompt = f"""
        You are an expert AI tutor. Based on the following extracted document text, generate comprehensive study materials.
        
        Return exactly 1 JSON object containing the following keys:
        1. "summary": A well-structured HTML summary of the document (use <h4>, <ul>, <p>, <strong>).
        2. "key_concepts": A well-structured HTML breakdown of the most important concepts/formulas/terms.
        3. "important_questions": A well-structured HTML list of 5-10 likely exam or review questions with brief answers.
        4. "revision_sheet": A condensed HTML cheat sheet summarizing everything to know the night before an exam.
        5. "flashcards": A list of JSON objects, each with "front" (question/term) and "back" (answer/definition). Provide 10-15 flashcards.
        
        Document Text:
        ---
        {extracted_text}
        ---
        """
        
        from pydantic import BaseModel
        from typing import List
        
        class Flashcard(BaseModel):
            front: str
            back: str
            
        class StudyMaterialOutput(BaseModel):
            summary: str
            key_concepts: str
            important_questions: str
            revision_sheet: str
            flashcards: List[Flashcard]

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': StudyMaterialOutput,
                'temperature': 0.3,
            },
        )
        
        result = json.loads(response.text)
        
        note.summary = result.get('summary', '')
        note.key_concepts = result.get('key_concepts', '')
        note.important_questions = result.get('important_questions', '')
        note.revision_sheet = result.get('revision_sheet', '')
        note.flashcards_json = result.get('flashcards', [])
        note.save()
        
        return True
        
    except Exception as e:
        print(f"Failed to generate study notes: {str(e)}")
        note = StudyNote.objects.get(id=study_note_id)
        note.summary = f"Error during AI generation: {str(e)}"
        note.save()
        return False
