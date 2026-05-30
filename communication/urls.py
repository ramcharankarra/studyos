from django.urls import path
from . import views

app_name = 'communication'

urlpatterns = [
    # Inbox and Direct Messaging
    path('inbox/', views.inbox, name='inbox'),
    path('inbox/<int:conversation_id>/', views.inbox, name='chat_detail'),
    path('inbox/api/send/<int:conversation_id>/', views.send_message_api, name='send_message_api'),
    path('inbox/api/fetch/<int:conversation_id>/', views.fetch_messages_api, name='fetch_messages_api'),
    path('inbox/new/<int:user_id>/', views.start_conversation, name='start_conversation'),
    
    # Classroom Feed (Announcements & Discussions)
    path('classroom/<int:classroom_id>/feed/', views.classroom_feed, name='classroom_feed'),
    
    # Announcements
    path('classroom/<int:classroom_id>/announcement/create/', views.create_announcement, name='create_announcement'),
    path('announcement/<int:announcement_id>/delete/', views.delete_announcement, name='delete_announcement'),
    path('announcement/<int:announcement_id>/pin/', views.pin_announcement, name='pin_announcement'),
    
    # Discussions
    path('classroom/<int:classroom_id>/discussion/create/', views.create_discussion, name='create_discussion'),
    path('discussion/<int:post_id>/reply/', views.create_reply, name='create_reply'),
    path('discussion/<int:post_id>/delete/', views.delete_discussion, name='delete_discussion'),
]
