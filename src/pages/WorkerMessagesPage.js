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

const WorkerMessagesPage = ({ route }) => {
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

  const userId = user?.id || user?.userId || user?.email || 'worker';

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

  const openConversation = async (id) => {
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

  const loadMessages = async (id) => {
    try {
      const messagesResponse = await apiService.getMessages(id);
      const messages = messagesResponse.data?.messages || messagesResponse.messages || messagesResponse.data || messagesResponse || [];
      setMessages(messages);
      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
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
          role: user?.role || 'WORKER',
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
                  onPress={() => openConversation(conversation.id)}
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
              const isWorker = message.sender?.role === 'WORKER';
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isWorker ? styles.messageWorkerRow : styles.messageUserRow]}
                >
                  <View style={[styles.bubble, isWorker ? styles.workerBubble : styles.userBubble]}>
                    <Text style={[styles.messageText, isWorker && styles.workerMessageText]}>
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
              <Ionicons name="send" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  sidebar: {
    flex: 1,
    backgroundColor: Colors.card,
    paddingTop: 50,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: Colors.text,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threadContent: {
    flex: 1,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  threadPreview: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatBackButton: {
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  chatSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  messageWorkerRow: {
    justifyContent: 'flex-end',
  },
  messageUserRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  workerBubble: {
    backgroundColor: Colors.primary,
  },
  userBubble: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  messageText: {
    color: Colors.text,
    fontSize: 14,
  },
  workerMessageText: {
    color: Colors.textLight,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    color: Colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WorkerMessagesPage;
