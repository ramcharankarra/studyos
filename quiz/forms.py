from django import forms
from .models import Quiz, Question, Choice
from classroom.models import Classroom

class QuizForm(forms.ModelForm):
    class Meta:
        model = Quiz
        fields = ['title', 'description', 'classroom', 'time_limit_minutes']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if user:
            self.fields['classroom'].queryset = Classroom.objects.filter(teacher=user)

class AIGenerateQuizForm(forms.Form):
    classroom = forms.ModelChoiceField(queryset=Classroom.objects.none())
    topic = forms.CharField(max_length=200, help_text="What should the quiz be about?")
    difficulty = forms.ChoiceField(choices=[
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced')
    ])
    num_questions = forms.IntegerField(min_value=1, max_value=20, initial=5, label="Number of Questions")
    document = forms.FileField(
        required=False, 
        help_text="Optional: Upload a PDF, PPT, or DOCX file to generate questions based on its content."
    )

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if user:
            self.fields['classroom'].queryset = Classroom.objects.filter(teacher=user)
