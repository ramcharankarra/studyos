from django import forms

class ResumeUploadForm(forms.Form):
    resume = forms.FileField(
        label="Upload Resume",
        help_text="PDF or DOCX format",
        widget=forms.FileInput(attrs={'class': 'form-control', 'accept': '.pdf,.docx'})
    )

class CareerRoadmapForm(forms.Form):
    dream_job = forms.CharField(
        max_length=200,
        label="Your Dream Job / Role",
        help_text="e.g. Data Scientist, Backend Engineer, Product Manager",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter your dream job...'})
    )
