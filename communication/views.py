from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q
from .models import Announcement, DiscussionPost, DiscussionReply, Conversation, Message
from classroom.models import Classroom, Enrollment
from core.models import User
from notifications.models import Notification

# ----------------- INBOX & MESSAGING ----------------- #

@login_required
def inbox(request, conversation_id=None):
    conversations = Conversation.objects.filter(participants=request.user)
    
    current_chat = None
    messages_list = []
    other_participant = None

    if conversation_id:
        current_chat = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
        messages_list = current_chat.messages.all()
        # Mark unread messages as read
        current_chat.messages.exclude(sender=request.user).update(is_read=True)
        
        if not current_chat.is_group:
            other_participant = current_chat.participants.exclude(id=request.user.id).first()
            
    # Find all eligible users to message
    # Teachers can message their students, Students can message their teachers.
    users_to_message = set()
    if request.user.is_teacher:
        classrooms = Classroom.objects.filter(teacher=request.user)
        for c in classrooms:
            for e in c.enrollments.all():
                users_to_message.add(e.student)
    else:
        enrollments = Enrollment.objects.filter(student=request.user)
        for e in enrollments:
            users_to_message.add(e.classroom.teacher)
    # Calculate unread messages count for each conversation
    for conv in conversations:
        conv.unread_count = conv.messages.filter(is_read=False).exclude(sender=request.user).count()
            
    return render(request, 'communication/inbox.html', {
        'conversations': conversations,
        'current_chat': current_chat,
        'messages': messages_list,
        'other_participant': other_participant,
        'users_to_message': users_to_message
    })

@login_required
def start_conversation(request, user_id):
    target_user = get_object_or_404(User, id=user_id)
    
    # Check if a 1-on-1 conversation already exists
    existing_chat = Conversation.objects.filter(is_group=False, participants=request.user).filter(participants=target_user).first()
    
    if existing_chat:
        return redirect('communication:chat_detail', conversation_id=existing_chat.id)
        
    # Create new conversation
    new_chat = Conversation.objects.create(is_group=False)
    new_chat.participants.add(request.user, target_user)
    return redirect('communication:chat_detail', conversation_id=new_chat.id)

@login_required
def send_message_api(request, conversation_id):
    if request.method == 'POST':
        conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
        content = request.POST.get('content', '').strip()
        
        if content:
            msg = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=content
            )
            
            # Notify other participants
            for p in conversation.participants.exclude(id=request.user.id):
                Notification.objects.create(
                    recipient=p,
                    title=f"New message from {request.user.full_name}",
                    message=content[:50] + ("..." if len(content) > 50 else ""),
                    type='Announcement', # Reuse type or add 'Message'
                )
            
            # Touch conversation to update 'updated_at'
            conversation.save()
            
            return JsonResponse({
                'status': 'success', 
                'message_id': msg.id,
                'content': msg.content,
                'sender': msg.sender.full_name,
                'created_at': msg.created_at.strftime("%I:%M %p")
            })
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def fetch_messages_api(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
    last_id = request.GET.get('last_id', 0)
    
    messages = conversation.messages.filter(id__gt=last_id).order_by('created_at')
    
    data = []
    for msg in messages:
        data.append({
            'id': msg.id,
            'content': msg.content,
            'sender_id': msg.sender.id,
            'sender': msg.sender.full_name,
            'created_at': msg.created_at.strftime("%I:%M %p")
        })
        
    return JsonResponse({'status': 'success', 'messages': data})

# ----------------- FEED (Announcements & Discussions) ----------------- #

@login_required
def classroom_feed(request, classroom_id):
    classroom = get_object_or_404(Classroom, id=classroom_id)
    
    # Check permissions
    if not request.user.is_teacher and not Enrollment.objects.filter(student=request.user, classroom=classroom).exists():
        messages.error(request, "You are not enrolled in this class.")
        return redirect('dashboard')
        
    announcements = classroom.announcements.all()
    discussions = classroom.discussion_posts.all()
    
    return render(request, 'communication/classroom_feed.html', {
        'classroom': classroom,
        'announcements': announcements,
        'discussions': discussions,
    })

@login_required
def create_announcement(request, classroom_id):
    if request.method == 'POST' and request.user.is_teacher:
        classroom = get_object_or_404(Classroom, id=classroom_id, teacher=request.user)
        title = request.POST.get('title')
        content = request.POST.get('content')
        is_pinned = request.POST.get('is_pinned') == 'on'
        
        if title and content:
            Announcement.objects.create(
                classroom=classroom,
                teacher=request.user,
                title=title,
                content=content,
                is_pinned=is_pinned
            )
            # Notify all students
            for enrollment in classroom.enrollments.all():
                Notification.objects.create(
                    recipient=enrollment.student,
                    title=f"New Announcement in {classroom.name}",
                    message=title,
                    type='Announcement'
                )
            messages.success(request, "Announcement posted.")
    return redirect('communication:classroom_feed', classroom_id=classroom_id)

@login_required
def delete_announcement(request, announcement_id):
    if request.method == 'POST' and request.user.is_teacher:
        announcement = get_object_or_404(Announcement, id=announcement_id, teacher=request.user)
        classroom_id = announcement.classroom.id
        announcement.delete()
        messages.success(request, "Announcement deleted.")
        return redirect('communication:classroom_feed', classroom_id=classroom_id)
    return redirect('dashboard')

@login_required
def pin_announcement(request, announcement_id):
    if request.method == 'POST' and request.user.is_teacher:
        announcement = get_object_or_404(Announcement, id=announcement_id, teacher=request.user)
        announcement.is_pinned = not announcement.is_pinned
        announcement.save()
    return redirect('communication:classroom_feed', classroom_id=announcement.classroom.id)

@login_required
def create_discussion(request, classroom_id):
    if request.method == 'POST':
        classroom = get_object_or_404(Classroom, id=classroom_id)
        content = request.POST.get('content')
        
        if content:
            DiscussionPost.objects.create(
                classroom=classroom,
                author=request.user,
                content=content
            )
            messages.success(request, "Discussion post created.")
    return redirect('communication:classroom_feed', classroom_id=classroom_id)

@login_required
def create_reply(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(DiscussionPost, id=post_id)
        content = request.POST.get('content')
        
        if content:
            DiscussionReply.objects.create(
                post=post,
                author=request.user,
                content=content
            )
            
            # Notify post author if someone else replies
            if post.author != request.user:
                Notification.objects.create(
                    recipient=post.author,
                    title="New Reply to your Discussion Post",
                    message=f"{request.user.full_name} replied: {content[:50]}",
                    type='Announcement'
                )
    return redirect('communication:classroom_feed', classroom_id=post.classroom.id)

@login_required
def delete_discussion(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(DiscussionPost, id=post_id, author=request.user)
        classroom_id = post.classroom.id
        post.delete()
        messages.success(request, "Post deleted.")
        return redirect('communication:classroom_feed', classroom_id=classroom_id)
    return redirect('dashboard')
