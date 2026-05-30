from django.contrib import admin
from .models import Announcement, DiscussionPost, DiscussionReply, Conversation, Message

admin.site.register(Announcement)
admin.site.register(DiscussionPost)
admin.site.register(DiscussionReply)
admin.site.register(Conversation)
admin.site.register(Message)
