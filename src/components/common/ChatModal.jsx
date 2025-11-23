import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose, participant, recipientId, onSchedule }) => {
  const { user } = useAuth();
  const {
    messages,
    fetchMessages,
    sendMessage,
    markAsRead,
    onlineUsers,
    typingUsers,
    startTyping,
    stopTyping,
    loading
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isOnline = onlineUsers.has(recipientId);
  const isTyping = typingUsers.has(recipientId);

  // Fetch messages when modal opens
  useEffect(() => {
    if (isOpen && recipientId) {
      fetchMessages(recipientId);
      markAsRead(recipientId);
    }
  }, [isOpen, recipientId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    // Emit typing indicator
    if (e.target.value) {
      startTyping(recipientId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(recipientId);
      }, 2000);
    } else {
      stopTyping(recipientId);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageInput.trim() || sending) return;

    try {
      setSending(true);
      stopTyping(recipientId);

      await sendMessage(recipientId, messageInput.trim());

      setMessageInput('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.message && error.message.includes('accepted mentorship')) {
        alert('You can only send messages to accepted mentorship connections.');
      } else {
        alert('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    try {
      const messageDate = new Date(date);
      const now = new Date();
      const diffInHours = (now - messageDate) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return messageDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } else {
        return formatDistanceToNow(messageDate, { addSuffix: true });
      }
    } catch {
      return '';
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};

    messages.forEach(msg => {
      const date = new Date(msg.createdAt);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <button className="chat-back-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="chat-header-info">
            <div className="chat-avatar-wrapper">
              <img
                src={participant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                alt={participant?.name}
                className="chat-avatar"
              />
              {isOnline && <div className="chat-online-indicator"></div>}
            </div>
            <div className="chat-participant-info">
              <h2>{participant?.name || 'Unknown'}</h2>
              <span className="chat-status">
                {isTyping ? 'typing...' : isOnline ? 'online' : 'offline'}
              </span>
            </div>
          </div>

          <div className="chat-header-actions" style={{ display: 'flex', gap: '10px' }}>
            {onSchedule && (
              <button className="chat-options-btn" onClick={onSchedule} title="Schedule Session">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            )}
            <button className="chat-options-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="19" cy="12" r="1" fill="currentColor" />
                <circle cx="5" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="chat-messages-container">
          {loading && messages.length === 0 ? (
            <div className="chat-loading">
              <div className="spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>No messages yet</p>
              <span>Send a message to start the conversation!</span>
            </div>
          ) : (
            <div className="chat-messages-list">
              {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div className="chat-date-divider">
                    <span>{getDateLabel(dateKey)}</span>
                  </div>
                  {msgs.map((msg) => {
                    const isSent = msg.sender?._id === user?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`chat-message ${isSent ? 'sent' : 'received'}`}
                      >
                        <div className="chat-message-bubble">
                          <p className="chat-message-content">{msg.content}</p>
                          <div className="chat-message-meta">
                            <span className="chat-message-time">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {isSent && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`read-receipt ${msg.isRead ? 'read' : ''}`}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form className="chat-input-container" onSubmit={handleSendMessage}>
          <button type="button" className="chat-attach-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />

          <button
            type="submit"
            className="chat-send-btn"
            disabled={!messageInput.trim() || sending}
          >
            {sending ? (
              <div className="spinner-small"></div>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
