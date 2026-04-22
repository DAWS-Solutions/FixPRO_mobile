import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import messageService from '../services/messageService';
import { Colors } from '../styles/theme';

const MessagesPage = ({ route }) => {
  const { conversationId } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(conversationId || null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');

  const userId = user?.id || user?.userId || user?.email || 'guest';

  const loadConversations = async () => {
    try {
      setLoading(true);
      const reservationsResponse = await apiService.getUserReservations(user.id).catch(() => null);
      const reservations =
        reservationsResponse?.data?.reservations ||
        reservationsResponse?.reservations ||
        reservationsResponse?.data ||
        reservationsResponse ||
        [];
      // Only show conversations for accepted reservations
      const acceptedReservations = Array.isArray(reservations) ? reservations.filter(
        (reservation) => reservation.status === 'ACCEPTED' || reservation.status === 'accepted'
      ) : [];

      await messageService.syncConversationsFromReservations(userId, acceptedReservations);
      const nextConversations = await messageService.getConversations(userId);
      setConversations(nextConversations);

      const fallbackConversationId = nextConversations[0]?.id || null;
      const nextActiveId = conversationId || activeConversationId || fallbackConversationId;
      setActiveConversationId(nextActiveId);

      if (nextActiveId) {
        const nextMessages = await messageService.getMessages(userId, nextActiveId);
        setMessages(nextMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    messageService.getMessages(userId, activeConversationId).then(setMessages);
  }, [activeConversationId, userId]);

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

  const onOpenConversation = async (id) => {
    setActiveConversationId(id);
    const nextMessages = await messageService.getMessages(userId, id);
    setMessages(nextMessages);
  };

  const onSend = async () => {
    if (!activeConversationId || !draft.trim()) return;
    const sent = await messageService.sendMessage(userId, activeConversationId, draft, 'USER', 'Vous');
    if (!sent) return;
    setDraft('');
    const [nextMessages, nextConversations] = await Promise.all([
      messageService.getMessages(userId, activeConversationId),
      messageService.getConversations(userId),
    ]);
    setMessages(nextMessages);
    setConversations(nextConversations);
  };

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
                      {conversation.lastMessage}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setActiveConversationId(null)} style={styles.chatBackButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.chatTitle}>{activeConversation.participantName}</Text>
              <Text style={styles.chatSubtitle}>{activeConversation.serviceName}</Text>
            </View>
          </View>
          <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
            {messages.map((message) => {
              const isUser = message.senderRole === 'USER';
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isUser ? styles.messageUserRow : styles.messageOtherRow]}
                >
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                      {message.text}
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
    paddingTop: 14,
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
  chatPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
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
