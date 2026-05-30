# StudyOS: Future Roadmap

While StudyOS is feature-complete for its primary goals, there are several exciting avenues for future expansion.

## Phase 1: Video Infrastructure
- **WebRTC Integration**: Replace external Google Meet/Zoom links with a native, in-browser WebRTC video conferencing system utilizing WebSocket signaling.
- **Automated Lecture Transcription**: Pipe live video audio through an external Speech-to-Text API (like Whisper) to generate live captions and save transcripts automatically.

## Phase 2: Advanced Gamification
- **Global Leaderboards**: Expand the classroom-level leaderboard to a global, platform-wide ranking system based on total EXP points.
- **Dynamic Badges**: Issue verifiable digital certificates or badges when a student achieves a 100% score on major assessments.

## Phase 3: Plagiarism & Proctoring
- **AI Plagiarism Detection**: Run assignment submissions through an LLM to detect AI-generated content or cross-reference it against existing web materials.
- **Browser Lockdown**: Implement strict JavaScript event listeners (e.g., detecting `visibilitychange`, preventing copy/paste) during Quiz taking.

## Phase 4: Mobile Application
- **React Native / Flutter Port**: Build a dedicated mobile application consuming the Django backend via Django REST Framework (DRF) APIs.
- **Push Notifications**: Implement Firebase Cloud Messaging (FCM) to send native push notifications for upcoming assignments and live classes.
