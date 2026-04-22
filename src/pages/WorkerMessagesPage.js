import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import messageService from '../services/messageService';
import { Colors } from '../styles/theme';

const WorkerMessagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const userId = user?.id || user?.email || 'worker';

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkerReservations(user.id).catch(() => null);
      const reservations = response?.data?.reservations || response?.reservations || response?.data || response || [];
      // Only show conversations for accepted reservations
      const acceptedReservations = (Array.isArray(reservations) ? reservations : []).filter(
        (reservation) => reservation.status === 'ACCEPTED' || reservation.status === 'accepted'
      );
      const seeded = acceptedReservations.map((reservation) => ({
        id: `worker_${reservation.id}`,
        reservationId: String(reservation.id),
        participantName: reservation.clientName || reservation.user?.name || 'Client',
        participantRole: 'USER',
        serviceName: reservation.service?.name || reservation.service || 'Service',
        lastMessage: 'Conversation disponible',
        lastMessageAt: reservation.createdAt || reservation.date || new Date().toISOString(),
        unreadCount: 0,
        status: reservation.status,
      }));
      await messageService.upsertConversations(userId, seeded);
      const convos = await messageService.getConversations(userId);
      setConversations(convos);
      const first = convos[0]?.id || null;
      setActiveConversationId(first);
      if (first) {
        const list = await messageService.getMessages(userId, first);
        setMessages(list);
      }
    } catch (error) {
      console.error('Failed to load worker messages:', error);
      setConversations([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const openConversation = async (id) => {
    setActiveConversationId(id);
    const list = await messageService.getMessages(userId, id);
    setMessages(list);
  };

  const onSend = async () => {
    if (!activeConversationId || !draft.trim()) return;
    await messageService.sendMessage(userId, activeConversationId, draft, 'WORKER', user?.name || 'Professionnel');
    setDraft('');
    const [list, convos] = await Promise.all([
      messageService.getMessages(userId, activeConversationId),
      messageService.getConversations(userId),
    ]);
    setMessages(list);
    setConversations(convos);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activeConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages clients</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="chatbubble-outline" size={42} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Aucune conversation</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages clients</Text>
      </View>

      <ScrollView horizontal style={styles.threadRow} showsHorizontalScrollIndicator={false}>
        {conversations.map((conversation) => (
          <TouchableOpacity
            key={conversation.id}
            style={[styles.threadChip, conversation.id === activeConversationId && styles.threadChipActive]}
            onPress={() => openConversation(conversation.id)}
          >
            <Text style={styles.threadText}>{conversation.participantName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.messages}>
        {messages.map((message) => {
          const mine = message.senderRole === 'WORKER';
          return (
            <View key={message.id} style={[styles.row, mine ? styles.right : styles.left]}>
              <View style={[styles.bubble, mine ? styles.workerBubble : styles.clientBubble]}>
                <Text style={[styles.messageText, mine && styles.workerMessageText]}>{message.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Répondre au client..."
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity style={styles.send} onPress={onSend}>
          <Ionicons name="send" size={17} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { backgroundColor: Colors.headerBackground, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: Colors.textLight, fontSize: 22, fontWeight: '700' },
  threadRow: { maxHeight: 54, paddingHorizontal: 10, marginTop: 8 },
  threadChip: { backgroundColor: Colors.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  threadChipActive: { borderColor: Colors.primary, borderWidth: 1.5 },
  threadText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  messages: { flex: 1, paddingHorizontal: 12, marginTop: 10 },
  row: { marginBottom: 8, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  workerBubble: { backgroundColor: Colors.primary },
  clientBubble: { backgroundColor: Colors.card, borderColor: Colors.border, borderWidth: 1 },
  messageText: { color: Colors.text, fontSize: 14 },
  workerMessageText: { color: Colors.textLight },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: Colors.card, borderTopColor: Colors.border, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: Colors.text },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10, color: Colors.textSecondary },
});

export default WorkerMessagesPage;
