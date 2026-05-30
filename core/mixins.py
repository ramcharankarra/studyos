from django.contrib.auth.mixins import AccessMixin
from django.shortcuts import redirect
from django.contrib import messages

class TeacherRequiredMixin(AccessMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not request.user.is_teacher:
            messages.error(request, "You do not have permission to access this page.")
            return redirect('dashboard')
        return super().dispatch(request, *args, **kwargs)

class StudentRequiredMixin(AccessMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not request.user.is_student:
            messages.error(request, "You do not have permission to access this page.")
            return redirect('dashboard')
        return super().dispatch(request, *args, **kwargs)
