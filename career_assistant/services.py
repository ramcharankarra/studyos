import os
import json
from google import genai
from pydantic import BaseModel, Field

class ResumeAnalysisOutput(BaseModel):
    ats_score: int = Field(description="Score out of 100 representing ATS compatibility")
    analysis_results: str = Field(description="HTML formatted detailed analysis of the resume strengths and weaknesses")
    improvement_suggestions: str = Field(description="HTML formatted list of actionable suggestions to improve the resume")

class CareerRoadmapOutput(BaseModel):
    roadmap_html: str = Field(description="HTML formatted step-by-step timeline or roadmap to achieve the dream job")
    skills_required: str = Field(description="HTML formatted list of required technical and soft skills")
    project_suggestions: str = Field(description="HTML formatted list of 2-3 project ideas to build portfolio")

def analyze_resume_via_ai(resume_text: str):
    """
    Analyzes a resume and returns a structured analysis using Gemini.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert technical recruiter and career coach.
    Please review the following resume text and provide an ATS score, an analysis, and improvement suggestions.
    
    Format the text output in clean, modern HTML suitable for embedding in a Bootstrap 5 card.
    Use tags like <ul>, <li>, <strong>, etc. Do NOT wrap the entire output in ```html blocks.
    
    Resume Text:
    {resume_text[:20000]}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': ResumeAnalysisOutput,
                'temperature': 0.4,
            },
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error analyzing resume: {e}")
        return None

def generate_career_roadmap_via_ai(dream_job: str):
    """
    Generates a career roadmap based on a dream job using Gemini.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an expert career counselor. A student wants to become a "{dream_job}".
    Generate a practical, step-by-step career roadmap.
    
    Provide the output in clean, modern HTML suitable for embedding in a Bootstrap 5 card.
    Use tags like <ul>, <li>, <strong>, etc. Do NOT wrap the entire output in ```html blocks.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': CareerRoadmapOutput,
                'temperature': 0.5,
            },
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating roadmap: {e}")
        return None
