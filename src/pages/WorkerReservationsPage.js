import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import { Colors } from '../styles/theme';
import { useNotifications } from '../context/NotificationContext';

const WorkerReservationsPage = ({ navigation }) => {
  const { resetReservationUnread } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      // Get worker profile first to obtain worker ID
      const workerProfile = await apiService.getWorkerProfile();
      const workerId = workerProfile.data?.userId || workerProfile.id;
      console.log('Worker ID:', workerId);
      
      if (workerId) {
        const response = await apiService.getWorkerReservations(workerId);
        console.log(response);
        const list = response.data?.reservations || response.reservations || response.data || response || [];
        setReservations(Array.isArray(list) ? list : []);
      } else {
        console.error('Worker ID not found in profile');
        setReservations([]);
      }
    } catch (error) {
      console.error('Failed to load worker reservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // Reset reservation badge when entering this tab
  useFocusEffect(
    React.useCallback(() => {
      resetReservationUnread();
    }, [resetReservationUnread])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const onUpdateStatus = async (reservationId, status) => {
    try {
      await apiService.updateReservationStatus(reservationId, status);
      
      // If accepting reservation, navigate to messages
      if (status === 'accepted') {
        navigation.navigate('Messages', { 
          conversationId: reservationId 
        });
      } else {
        await loadReservations();
      }
    } catch (error) {
      console.error('Failed to update reservation status:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le statut de la réservation.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demandes reçues</Text>
        <Text style={styles.headerSubtitle}>Gérez les nouvelles missions</Text>
      </View>

      <View style={styles.listContainer}>
        {reservations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={42} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune réservation pour le moment</Text>
          </View>
        ) : (
          reservations.map((reservation) => (
            <TouchableOpacity
              key={reservation.id}
              style={styles.card}
              onPress={() => navigation.navigate('WorkerReservationDetails', { reservation })}
            >
              <Text style={styles.title}>{reservation.clientName || reservation.user?.name || 'Client'}</Text>
              <Text style={styles.meta}>{reservation.service?.name || reservation.service || 'Service'}</Text>
              <Text style={styles.meta}>
                {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR') : 'Date non spécifiée'} - {reservation.time || '--:--'}
              </Text>
              <Text style={styles.status}>{reservation.status || 'pending'}</Text>

              {(reservation.status === 'pending' || reservation.status === 'PENDING') && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => onUpdateStatus(reservation.id, 'cancelled')}>
                    <Text style={styles.actionText}>Décliner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => onUpdateStatus(reservation.id, 'accepted')}>
                    <Text style={styles.actionText}>Accepter</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(reservation.status === 'accepted' || reservation.status === 'ACCEPTED' || reservation.status === 'in_progress' || reservation.status === 'IN_PROGRESS') && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate('Messages', { conversationId: reservation.id })}>
                    <Text style={styles.actionText}>Contacter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.finishBtn} onPress={() => onUpdateStatus(reservation.id, 'completed')}>
                    <Text style={styles.actionText}>Terminer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { backgroundColor: Colors.headerBackground, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: Colors.textLight, fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: Colors.textLight, opacity: 0.9, marginTop: 4 },
  listContainer: { padding: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 12, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  status: { marginTop: 8, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, borderRadius: 10, backgroundColor: Colors.success, paddingVertical: 10, alignItems: 'center' },
  declineBtn: { flex: 1, borderRadius: 10, backgroundColor: Colors.error, paddingVertical: 10, alignItems: 'center' },
  contactBtn: { flex: 1, borderRadius: 10, backgroundColor: Colors.secondary || '#8b5cf6', paddingVertical: 10, alignItems: 'center' },
  finishBtn: { flex: 1, borderRadius: 10, backgroundColor: Colors.primary, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: Colors.textLight, fontWeight: '700' },
  emptyCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, marginTop: 10 },
});

export default WorkerReservationsPage;
