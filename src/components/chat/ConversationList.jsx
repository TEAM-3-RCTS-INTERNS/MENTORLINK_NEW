import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import './ConversationList.css';

const ConversationList = ({ onSelectConversation }) => {
  const { conversations, activeConversation, onlineUsers, loading } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.participant?.name?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase());
  });

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'No messages yet';

    if (lastMessage.messageType === 'image') {
      return '📷 Image';
    } else if (lastMessage.messageType === 'file') {
      return '📎 File';
    }

    return lastMessage.content || 'New message';
  };

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="conversations-wrapper">
        {loading && conversations.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p className="empty-text">No conversations yet</p>
            <p className="empty-subtext">
              {searchQuery ? 'No results found' : 'Start messaging mentors or students!'}
            </p>
          </div>
        ) : (
          <div className="conversations-list">
            {filteredConversations.map((conv) => {
              const participant = conv.participant;
              const isActive = activeConversation === participant?._id;
              const isOnline = onlineUsers.has(participant?._id);
              const hasUnread = conv.unreadCount > 0;

              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                  onClick={() => onSelectConversation(participant?._id, participant)}
                >
                  <div className="conversation-avatar-wrapper">
                    <img
                      src={participant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                      alt={participant?.name}
                      className="conversation-avatar"
                    />
                    {isOnline && <div className="online-indicator"></div>}
                  </div>

                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h3 className="conversation-name">{participant?.name || 'Unknown'}</h3>
                      <span className="conversation-time">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="conversation-footer">
                      <p className="conversation-preview">
                        {getMessagePreview(conv.lastMessage)}
                      </p>
                      {hasUnread && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
