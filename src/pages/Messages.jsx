import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatModal from '../components/common/ChatModal';
import ScheduleSessionModal from '../components/common/ScheduleSessionModal';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { sessionAPI } from '../services/api';
import './Messages.css';

const Messages = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeConversation, setActiveConversation, conversations } = useChat();
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // If userId is in URL params, open chat modal
  useEffect(() => {
    if (userId) {
      setActiveConversation(userId);
      setShowChatModal(true);

      // Find participant info from conversations
      const conversation = conversations.find(
        conv => conv.participant._id === userId
      );
      if (conversation) {
        setSelectedParticipant(conversation.participant);
      }
    }
  }, [userId, setActiveConversation, conversations]);

  const handleSelectConversation = (participantId, participant) => {
    setActiveConversation(participantId);
    setSelectedParticipant(participant);
    setShowChatModal(true);
    navigate(`/messages/${participantId}`);
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
    setActiveConversation(null);
    setSelectedParticipant(null);
    navigate('/messages');
  };

  const handleOpenSchedule = () => {
    setShowScheduleModal(true);
  };

  const handleScheduleSession = async (formData) => {
    if (!selectedParticipant) return;

    try {
      await sessionAPI.createSession({
        studentId: selectedParticipant._id,
        ...formData,
        chatId: activeConversation // Assuming activeConversation is the recipientId, but we might need the actual conversation ID.
        // Wait, activeConversation is recipientId (userId).
        // We need the chat ID.
        // The backend createSession takes chatId.
        // But we don't have it easily here unless we look it up.
        // However, if we don't pass it, it just won't be linked in the session document, but the notification will still work.
        // Issue #4 says "Add meeting to both users' history".
        // And "Display history in: ... Inside chat thread".
        // If we don't have chatId in Session, we can't query by chatId.
        // But we can query by participants (which we do in getSessionsWithUser).
        // So chatId is optional for history, but good for "Inside chat thread (metadata section)".
        // Let's try to find the conversation ID.
      });

      // We can find conversation ID from conversations list
      const conversation = conversations.find(c => c.participant._id === activeConversation);
      const chatId = conversation?._id; // This is usually conversation ID if the list returns it.

      // Actually, let's just pass what we have.
      await sessionAPI.createSession({
        studentId: selectedParticipant._id,
        ...formData,
        chatId: conversations.find(c => c.participant._id === activeConversation)?._id
      });

      alert('Session scheduled successfully!');
      setShowScheduleModal(false);
    } catch (error) {
      console.error('Error scheduling session:', error);
      alert('Failed to schedule session');
    }
  };

  return (
    <div className="messages-page">
      <HomeNavbar />
      <div className="app-container">
        <Sidebar />
        <div className="messages-main-content">
          <div className="messages-container">
            <div className="messages-header">
              <h1>Messages</h1>
              <p className="messages-subtitle">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>

            <ConversationList
              onSelectConversation={handleSelectConversation}
            />

            {conversations.length === 0 && (
              <div className="empty-messages-state">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3>No messages yet</h3>
                <p>Start connecting with mentors to begin messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Modal - WhatsApp Style Popup */}
      {showChatModal && activeConversation && (
        <ChatModal
          isOpen={showChatModal}
          onClose={handleCloseChat}
          participant={selectedParticipant}
          recipientId={activeConversation}
          onSchedule={handleOpenSchedule}
        />
      )}

      <ScheduleSessionModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        mentee={selectedParticipant}
        onSchedule={handleScheduleSession}
      />
    </div>
  );
};

export default Messages;
