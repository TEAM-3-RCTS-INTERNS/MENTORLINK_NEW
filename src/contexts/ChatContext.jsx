import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/api';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!isAuthenticated() || !user?._id) {
      return;
    }

    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      // Notify server that user is online
      newSocket.emit('user_online', user._id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Handle user status changes
    newSocket.on('user_status_changed', (data) => {
      const { userId, status } = data;
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        if (status === 'online') {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    // Handle incoming messages
    newSocket.on('receive_message', (message) => {
      // Add message to messages if it's for active conversation
      setMessages(prev => {
        const conversationId = [message.sender._id, message.recipient._id].sort().join('_');
        if (activeConversation === message.sender._id) {
          return [...prev, message];
        }
        return prev;
      });

      // Update conversation list
      fetchConversations();

      // Update unread count
      fetchUnreadCount();
    });

    // Handle typing indicators
    newSocket.on('user_typing', ({ userId }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    });

    newSocket.on('user_stopped_typing', ({ userId }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Handle read receipts
    newSocket.on('messages_marked_read', ({ readBy }) => {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.recipient._id === readBy) {
            return { ...msg, isRead: true, readAt: new Date() };
          }
          return msg;
        })
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, activeConversation]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatAPI.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await chatAPI.getUnreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (recipientId, before = null) => {
    try {
      setLoading(true);
      const params = before ? { before } : {};
      const data = await chatAPI.getMessages(recipientId, params);
      setMessages(data.messages || []);
      setActiveConversation(recipientId);
    } catch (error) {
      // Handle 403 errors (no mentorship connection) gracefully
      if (error.message && error.message.includes('accepted mentorship')) {
        console.warn('Cannot load messages: No accepted mentorship connection');
        setMessages([]);
        setActiveConversation(null);
        // Don't retry for mentorship connection errors
        return;
      }
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (recipientId, content, messageType = 'text', attachments = []) => {
    try {
      const data = await chatAPI.sendMessage({
        recipientId,
        content,
        messageType,
        attachments,
      });

      // Emit socket event
      if (socket) {
        socket.emit('send_message', {
          recipientId,
          message: data.message,
        });
      }

      // Add to messages
      setMessages(prev => [...prev, data.message]);

      // Update conversations
      fetchConversations();

      return data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [socket, fetchConversations]);

  // Mark messages as read
  const markAsRead = useCallback(async (recipientId) => {
    try {
      await chatAPI.markAsRead(recipientId);

      // Update local state
      setMessages(prev =>
        prev.map(msg => {
          if (msg.sender._id === recipientId) {
            return { ...msg, isRead: true, readAt: new Date() };
          }
          return msg;
        })
      );

      // Emit socket event
      if (socket) {
        socket.emit('messages_read', {
          senderId: recipientId,
          readBy: user._id,
        });
      }

      // Update conversations and unread count
      fetchConversations();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [socket, user, fetchConversations, fetchUnreadCount]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await chatAPI.deleteMessage(messageId);

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg._id !== messageId));

      // Update conversations
      fetchConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [fetchConversations]);

  // Start typing
  const startTyping = useCallback((recipientId) => {
    if (socket) {
      socket.emit('typing_start', {
        recipientId,
        senderId: user._id,
      });
    }
  }, [socket, user]);

  // Stop typing
  const stopTyping = useCallback((recipientId) => {
    if (socket) {
      socket.emit('typing_stop', {
        recipientId,
        senderId: user._id,
      });
    }
  }, [socket, user]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated() && user) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [isAuthenticated, user, fetchConversations, fetchUnreadCount]);

  const value = {
    socket,
    conversations,
    onlineUsers,
    activeConversation,
    messages,
    unreadCount,
    typingUsers,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    startTyping,
    stopTyping,
    setActiveConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
