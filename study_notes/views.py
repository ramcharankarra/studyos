import threading
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import StudyNote
from .services import generate_study_notes

@login_required
def notes_dashboard(request):
    notes = StudyNote.objects.filter(user=request.user)
    return render(request, 'study_notes/dashboard.html', {'notes': notes})

@login_required
def upload_note(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        uploaded_file = request.FILES.get('document')
        
        if not title or not uploaded_file:
            messages.error(request, "Please provide a title and a file.")
            return redirect('study_notes:upload_note')
            
        # Get extension
        ext = uploaded_file.name.split('.')[-1].lower()
        if ext not in ['pdf', 'docx', 'pptx', 'txt']:
            messages.error(request, "Invalid file format. Only PDF, DOCX, PPTX, and TXT are supported.")
            return redirect('study_notes:upload_note')
            
        note = StudyNote.objects.create(
            user=request.user,
            title=title,
            original_file=uploaded_file,
            file_type=ext
        )
        
        # Start AI generation in a background thread to prevent blocking
        thread = threading.Thread(target=generate_study_notes, args=(note.id,))
        thread.start()
        
        messages.success(request, "File uploaded successfully! AI is analyzing your document. This may take a minute.")
        return redirect('study_notes:note_detail', note_id=note.id)
        
    return render(request, 'study_notes/upload.html')

@login_required
def note_detail(request, note_id):
    note = get_object_or_404(StudyNote, id=note_id, user=request.user)
    
    # Check if AI has finished processing
    is_processing = note.summary == ""
    
    return render(request, 'study_notes/detail.html', {
        'note': note,
        'is_processing': is_processing
    })

@login_required
def delete_note(request, note_id):
    if request.method == 'POST':
        note = get_object_or_404(StudyNote, id=note_id, user=request.user)
        note.original_file.delete()
        note.delete()
        messages.success(request, "Study note deleted.")
    return redirect('study_notes:dashboard')
