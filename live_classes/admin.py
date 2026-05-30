from django.contrib import admin
from .models import LiveClass

@admin.register(LiveClass)
class LiveClassAdmin(admin.ModelAdmin):
    list_display = ('title', 'classroom', 'teacher', 'date', 'start_time')
    list_filter = ('date', 'classroom')
    search_fields = ('title', 'classroom__name', 'teacher__username')
