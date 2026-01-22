import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ScheduleSessionModal from '../components/common/ScheduleSessionModal';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { sessionAPI, chatAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import './Messages.css';

const Messages = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    activeConversation, 
    setActiveConversation, 
    conversations,
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
  const { sidebarCollapsed } = useLayout();
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // If userId is in URL params, open chat
  useEffect(() => {
    if (userId) {
      setActiveConversation(userId);

      // Find participant info from conversations
      const conversation = conversations.find(
        conv => conv.participant._id === userId
      );
      if (conversation) {
        setSelectedParticipant(conversation.participant);
      }
    }
  }, [userId, setActiveConversation, conversations]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      markAsRead(activeConversation);
    }
  }, [activeConversation]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (activeConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation]);

  const handleSelectConversation = (participantId, participant) => {
    setActiveConversation(participantId);
    setSelectedParticipant(participant);
    navigate(`/messages/${participantId}`);
  };

  const handleCloseChat = () => {
    setActiveConversation(null);
    setSelectedParticipant(null);
    navigate('/messages');
  };

  const handleOpenSchedule = () => {
    setShowScheduleModal(true);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (e.target.value) {
      startTyping(activeConversation);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(activeConversation);
      }, 2000);
    } else {
      stopTyping(activeConversation);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ type: 'image', url: e.target.result, name: file.name });
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: 'file', name: file.name, size: file.size });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || sending) return;

    try {
      setSending(true);
      stopTyping(activeConversation);

      let attachments = [];
      let messageType = 'text';
      let content = messageInput.trim();

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        try {
          const uploadResult = await chatAPI.uploadAttachment(selectedFile);
          attachments = [{
            fileUrl: uploadResult.url,
            fileType: selectedFile.type.startsWith('image/') ? 'image' : 'file',
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
          }];
          messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
          if (!content) {
            content = selectedFile.type.startsWith('image/') ? '📷 Image' : `📎 ${selectedFile.name}`;
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload file. Please try again.');
          setUploading(false);
          setSending(false);
          return;
        }
        setUploading(false);
      }

      await sendMessage(activeConversation, content, messageType, attachments);
      setMessageInput('');
      handleRemoveFile();
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.message?.includes('accepted mentorship')) {
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

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
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

  const handleScheduleSession = async (formData) => {
    if (!selectedParticipant) return;

    try {
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

  const isOnline = activeConversation ? onlineUsers.has(activeConversation) : false;
  const isTyping = activeConversation ? typingUsers.has(activeConversation) : false;
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="messages-page">
      <HomeNavbar />
      <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar />
        <div className="messages-layout">
          {/* Left Panel - Conversation List */}
          <div className={`messages-left-panel ${activeConversation ? 'has-active-chat' : ''}`}>
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

          {/* Right Panel - Chat Area */}
          <div className={`messages-right-panel ${activeConversation ? 'active' : ''}`}>
            {activeConversation && selectedParticipant ? (
              <>
                {/* Chat Header */}
                <div className="chat-panel-header">
                  <button className="chat-back-btn-mobile" onClick={handleCloseChat}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <div className="chat-header-info">
                    <div className="chat-avatar-wrapper">
                      <img
                        src={selectedParticipant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                        alt={selectedParticipant?.name}
                        className="chat-avatar"
                      />
                      {isOnline && <div className="chat-online-indicator"></div>}
                    </div>
                    <div className="chat-participant-info">
                      <h2>{selectedParticipant?.name || 'Unknown'}</h2>
                      <span className="chat-status">
                        {isTyping ? 'typing...' : isOnline ? 'online' : 'offline'}
                      </span>
                    </div>
                  </div>

                  <div className="chat-header-actions">
                    <button className="chat-action-btn" onClick={handleOpenSchedule} title="Schedule Session">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </button>
                    <button className="chat-action-btn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                        <circle cx="19" cy="12" r="1" fill="currentColor" />
                        <circle cx="5" cy="12" r="1" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="chat-panel-messages">
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
                            const hasAttachment = msg.attachments && msg.attachments.length > 0;
                            const attachment = hasAttachment ? msg.attachments[0] : null;
                            return (
                              <div key={msg._id} className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                                <div className="chat-message-bubble">
                                  {/* Show image attachment */}
                                  {attachment && attachment.fileType === 'image' && (
                                    <div className="chat-message-image">
                                      <img src={attachment.fileUrl} alt="Shared" onClick={() => window.open(attachment.fileUrl, '_blank')} />
                                    </div>
                                  )}
                                  {/* Show file attachment */}
                                  {attachment && attachment.fileType === 'file' && (
                                    <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="chat-message-file">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                      <span>{attachment.fileName}</span>
                                    </a>
                                  )}
                                  {/* Show text content if not just an attachment placeholder */}
                                  {msg.content && !msg.content.startsWith('📷') && !msg.content.startsWith('📎') && (
                                    <p className="chat-message-content">{msg.content}</p>
                                  )}
                                  <div className="chat-message-meta">
                                    <span className="chat-message-time">{formatMessageTime(msg.createdAt)}</span>
                                    {isSent && (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`read-receipt ${msg.isRead ? 'read' : ''}`}>
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
                <form className="chat-panel-input" onSubmit={handleSendMessage}>
                  {/* File Preview */}
                  {filePreview && (
                    <div className="chat-file-preview">
                      {filePreview.type === 'image' ? (
                        <img src={filePreview.url} alt="Preview" className="chat-file-preview-img" />
                      ) : (
                        <div className="chat-file-preview-doc">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>{filePreview.name}</span>
                        </div>
                      )}
                      <button type="button" className="chat-file-preview-remove" onClick={handleRemoveFile}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="chat-input-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      style={{ display: 'none' }}
                    />
                    <button type="button" className="chat-attach-btn" onClick={handleAttachClick} disabled={uploading}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                    <button type="submit" className="chat-send-btn" disabled={(!messageInput.trim() && !selectedFile) || sending}>
                      {sending || uploading ? (
                        <div className="spinner-small"></div>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="chat-no-selection">
                <div className="chat-no-selection-content">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3>Select a conversation</h3>
                  <p>Choose a contact from the left to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
