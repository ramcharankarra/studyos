from django import forms
from .models import Assignment, AssignmentSubmission
from django.core.exceptions import ValidationError
import os

class AssignmentForm(forms.ModelForm):
    class Meta:
        model = Assignment
        fields = ['title', 'description', 'instructions', 'max_marks', 'deadline', 'attachment']
        widgets = {
            'deadline': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'description': forms.Textarea(attrs={'rows': 3}),
            'instructions': forms.Textarea(attrs={'rows': 3}),
        }

    def clean_attachment(self):
        attachment = self.cleaned_data.get('attachment')
        if attachment:
            ext = os.path.splitext(attachment.name)[1].lower()
            valid_extensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip']
            if ext not in valid_extensions:
                raise ValidationError('Unsupported file extension. Allowed extensions: pdf, doc, docx, ppt, pptx, zip')
            if attachment.size > 10 * 1024 * 1024: # 10 MB limit
                raise ValidationError('File size must be under 10MB.')
        return attachment

class SubmissionForm(forms.ModelForm):
    class Meta:
        model = AssignmentSubmission
        fields = ['submitted_file']
        
    def clean_submitted_file(self):
        file = self.cleaned_data.get('submitted_file')
        if file:
            ext = os.path.splitext(file.name)[1].lower()
            valid_extensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip']
            if ext not in valid_extensions:
                raise ValidationError('Unsupported file extension. Allowed extensions: pdf, doc, docx, ppt, pptx, zip')
            if file.size > 10 * 1024 * 1024:
                raise ValidationError('File size must be under 10MB.')
        return file

class GradeForm(forms.ModelForm):
    class Meta:
        model = AssignmentSubmission
        fields = ['grade', 'feedback']
        widgets = {
            'feedback': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.assignment:
            self.fields['grade'].widget.attrs['max'] = self.instance.assignment.max_marks
            self.fields['grade'].widget.attrs['min'] = 0
            self.fields['grade'].help_text = f"Maximum marks: {self.instance.assignment.max_marks}"
