import os
import tempfile
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import ResumeAnalysis, CareerRoadmap
from .forms import ResumeUploadForm, CareerRoadmapForm
from .services import analyze_resume_via_ai, generate_career_roadmap_via_ai
from study_notes.services import extract_text_from_file

@login_required
def career_dashboard(request):
    resumes = ResumeAnalysis.objects.filter(student=request.user)
    roadmaps = CareerRoadmap.objects.filter(student=request.user)
    
    resume_form = ResumeUploadForm()
    roadmap_form = CareerRoadmapForm()
    
    if request.method == 'POST':
        if 'analyze_resume' in request.POST:
            resume_form = ResumeUploadForm(request.POST, request.FILES)
            if resume_form.is_valid():
                resume_file = request.FILES['resume']
                ext = os.path.splitext(resume_file.name)[1].lower()
                
                if ext in ['.pdf', '.docx']:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                        for chunk in resume_file.chunks():
                            temp_file.write(chunk)
                        temp_path = temp_file.name
                        
                    resume_text = extract_text_from_file(temp_path, ext)
                    os.remove(temp_path)
                    
                    if resume_text:
                        analysis_data = analyze_resume_via_ai(resume_text)
                        if analysis_data:
                            analysis = ResumeAnalysis.objects.create(
                                student=request.user,
                                resume_file=resume_file,
                                ats_score=analysis_data.get('ats_score'),
                                analysis_results=analysis_data.get('analysis_results', ''),
                                improvement_suggestions=analysis_data.get('improvement_suggestions', '')
                            )
                            messages.success(request, 'Resume analyzed successfully!')
                            return redirect('career_assistant:dashboard')
                        else:
                            messages.error(request, 'Failed to analyze resume with AI.')
                    else:
                        messages.error(request, 'Could not extract text from the resume.')
                else:
                    messages.error(request, 'Invalid file format. Only PDF and DOCX are allowed.')
                    
        elif 'generate_roadmap' in request.POST:
            roadmap_form = CareerRoadmapForm(request.POST)
            if roadmap_form.is_valid():
                dream_job = roadmap_form.cleaned_data['dream_job']
                roadmap_data = generate_career_roadmap_via_ai(dream_job)
                
                if roadmap_data:
                    roadmap = CareerRoadmap.objects.create(
                        student=request.user,
                        dream_job=dream_job,
                        roadmap_html=roadmap_data.get('roadmap_html', ''),
                        skills_required=roadmap_data.get('skills_required', ''),
                        project_suggestions=roadmap_data.get('project_suggestions', '')
                    )
                    messages.success(request, f'Career Roadmap for {dream_job} generated successfully!')
                    return redirect('career_assistant:dashboard')
                else:
                    messages.error(request, 'Failed to generate career roadmap with AI.')

    context = {
        'resumes': resumes,
        'roadmaps': roadmaps,
        'resume_form': resume_form,
        'roadmap_form': roadmap_form,
    }
    return render(request, 'career_assistant/dashboard.html', context)
