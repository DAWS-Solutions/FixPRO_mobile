import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import { Colors } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MessagesPage = ({ route }) => {
  const { conversationId } = route.params || {};
  const { user } = useAuth();
  const { resetUnreadMessages } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const activeConversationRef = useRef(null);
  const messagesScrollViewRef = useRef(null);

  const userId = user?.id || user?.userId || user?.email || 'guest';

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const sortConversations = (convs) => {
    return [...convs].sort((a, b) => {
      const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0);
      return dateB - dateA; // newest first
    });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConversations();
      const conversations = response.data?.conversations || response.conversations || response.data || response || [];
      const mapped = conversations.map(conv => ({
        ...conv,
        unreadCount: conv.unreadCount || conv.unread_count || 0
      }));
      setConversations(sortConversations(mapped));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Hook 1: listener setup (runs once on mount)
  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log('New message received:', data);
      if (data.reservationId === activeConversationRef.current) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id);
          return exists ? prev : [...prev, data.message];
        });
      } else {
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === data.reservationId
              ? { ...conv, lastMessage: { content: data.message.content, createdAt: data.message.createdAt }, unreadCount: Math.max(0, (conv.unreadCount || 0) + 1) }
              : conv
          );
          return sortConversations(updated);
        });
      }
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, []);

  // Hook 2: room join/leave (runs when active conversation changes)
  useEffect(() => {
    if (activeConversationId) {
      socketService.joinReservation(activeConversationId);
    }
    return () => {
      if (activeConversationId) {
        socketService.leaveReservation(activeConversationId);
      }
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
      loadMessages(conversationId);
      socketService.joinReservation(conversationId);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      resetUnreadMessages();
      // Only reload conversations if not currently viewing a chat
      if (!activeConversationId) {
        loadConversations();
      }
    }, [resetUnreadMessages, activeConversationId])
  );

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const term = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const name = (conversation.participantName || '').toLowerCase();
      const service = (conversation.serviceName || '').toLowerCase();
      return name.includes(term) || service.includes(term);
    });
  }, [conversations, search]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  const handleBack = () => {
    socketService.leaveReservation(activeConversationId);
    setActiveConversationId(null);
    activeConversationRef.current = null;
    setMessages([]);
  };

  const onOpenConversation = async (id) => {
    setActiveConversationId(id);
    activeConversationRef.current = id;
    setMessages([]);
    loadMessages(id);
    socketService.joinReservation(id);
    
    // Mark conversation as read in DB
    try {
      await apiService.markConversationAsRead(id);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
    
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === id
          ? { ...conv, unreadCount: 0 }
          : conv
      );
      // Reset tab badge if all conversations are now read
      const remainingUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      if (remainingUnread === 0) {
        resetUnreadMessages();
      }
      return updated;
    });
  };

  const loadMessages = async (conversationId) => {
    try {
      const messagesResponse = await apiService.getMessages(conversationId);
      const messages = messagesResponse.data?.messages || messagesResponse.messages || messagesResponse.data || messagesResponse || [];
      setMessages(messages);
      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const onSend = async () => {
    if (!activeConversationId || !draft.trim()) return;
    const messageContent = draft.trim();
    setDraft('');
    try {
      await apiService.sendMessage(activeConversationId, messageContent);
      // Append sent message locally instead of reloading
      const newMessage = {
        id: Date.now(), // temporary ID
        content: messageContent,
        senderId: userId,
        sender: {
          id: userId,
          name: user?.name || 'You',
          role: user?.role || 'USER',
          avatar: user?.avatar
        },
        createdAt: new Date().toISOString(),
        type: 'text'
      };
      setMessages(prev => [...prev, newMessage]);
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (error) {
      console.error('Failed to send message:', error);
      setDraft(messageContent); // restore draft on error
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.card} />
      {!activeConversation ? (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Messages</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="chatbubbles-outline" size={42} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>Aucune conversation</Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={styles.threadItem}
                  onPress={() => onOpenConversation(conversation.id)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.threadContent}>
                    <Text style={styles.threadName} numberOfLines={1}>
                      {conversation.participantName}
                    </Text>
                    <Text style={styles.threadPreview} numberOfLines={1}>
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </Text>
                  </View>
                  {conversation.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.chatBackButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.chatTitle}>{activeConversation.participantName}</Text>
              <Text style={styles.chatSubtitle}>{activeConversation.serviceName}</Text>
            </View>
          </View>
          <ScrollView ref={messagesScrollViewRef} style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
            {messages.map((message) => {
              const isUser = message.sender?.role === 'USER';
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isUser ? styles.messageUserRow : styles.messageOtherRow]}
                >
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="Écrire un message..."
              placeholderTextColor={Colors.textSecondary}
              value={draft}
              onChangeText={setDraft}
            />
            <TouchableOpacity style={styles.sendButton} onPress={onSend}>
              <Ionicons name="send" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  sidebar: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingTop: 45,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 38,
    color: Colors.text,
    fontSize: 13,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  threadContent: {
    flex: 1,
  },
  threadName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  threadPreview: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emptyList: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  chatSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatBackButton: {
    marginRight: 10,
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
  },
  messageRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  messageUserRow: {
    justifyContent: 'flex-end',
  },
  messageOtherRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  userBubble: {
    backgroundColor: Colors.primary,
  },
  otherBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  userMessageText: {
    color: Colors.textLight,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 90,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});

export default MessagesPage;
