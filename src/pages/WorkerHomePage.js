import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Colors } from '../styles/theme';

const WorkerHomePage = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("awiofjawoifj", user)
      const response = await apiService.getWorkerReservations(user.id);
      const list = response.data?.reservations || response.reservations || response.data || response || [];
      setReservations(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load worker dashboard data:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const pending = reservations.filter((r) => r.status === 'pending').length;
    const accepted = reservations.filter((r) => ['accepted', 'in_progress'].includes(r.status)).length;
    const completed = reservations.filter((r) => r.status === 'completed').length;
    const cancelled = reservations.filter((r) => r.status === 'cancelled').length;
    return { total: reservations.length, pending, accepted, completed, cancelled };
  }, [reservations]);

  const recentReservations = reservations.slice(0, 5);
  const incomingRequests = reservations.filter((item) => item.status === 'PENDING').slice(0, 2);
  console.log(reservations)

  const onUpdateStatus = async (reservationId, status) => {
    try {
      await apiService.updateReservationStatus(reservationId, status);
      await loadData();
      
      // If accepting reservation, redirect to messages
      if (status === 'accepted') {
        // Find the reservation from current data to avoid extra API call
        const currentReservation = reservations.find(r => r.id === reservationId);
        
        if (currentReservation) {
          // Navigate to messages with specific reservation
          navigation.navigate('Messages', { 
            conversationId: currentReservation.id 
          });
        }
      }
    } catch (error) {
      console.error('Failed to update reservation status from dashboard:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour la demande.");
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBackground} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>FixPro</Text>
          <Text style={styles.headerTitle}>Bonjour, {user?.name || 'Professionnel'} 👋</Text>
          <Text style={styles.headerSubtitle}>Simple · rapide · fiable</Text>
        </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Credits', value: `${stats.total * 2} TND`, icon: 'stats-chart', color: Colors.primary, featured: true },
          { label: 'Missions', value: stats.total, icon: 'calendar-clear', color: Colors.primary },
          { label: 'Note', value: '4.8', icon: 'star', color: '#eab308' },
          { label: 'Prix', value: '80 - 110 TND', icon: 'pricetag', color: '#f59e0b' },
        ].map((item) => (
          <View key={item.label} style={[styles.statCard, item.featured && styles.featuredCard]}>
            <View style={[styles.iconWrap, { backgroundColor: item.featured ? '#ffffff30' : `${item.color}20` }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[styles.statLabel, item.featured && styles.featuredText]}>{item.label}</Text>
            <Text style={[styles.statValue, item.featured && styles.featuredText]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nouvelles demandes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Demandes')}>
            <Text style={styles.linkText}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {incomingRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune nouvelle demande</Text>
            <Text style={styles.emptySubtitle}>Vous serez notifié ici des nouvelles réservations</Text>
          </View>
        ) : (
          incomingRequests.map((reservation) => (
            <TouchableOpacity
              key={reservation.id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('WorkerReservationDetails', { reservation })}
            >
              {/* Header with urgency indicator */}
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <View style={styles.clientInfo}>
                    <View style={styles.clientAvatar}>
                      <Ionicons name="person" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.clientDetails}>
                      <Text style={styles.clientName}>{reservation.clientName || reservation.user?.name || 'Client'}</Text>
                      <Text style={styles.requestTime}>
                        {new Date(reservation.createdAt).toLocaleDateString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  {reservation.emergency && (
                    <View style={styles.urgencyBadge}>
                      <Ionicons name="alert-circle" size={14} color="#fff" />
                      <Text style={styles.urgencyText}>Urgent</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Service details */}
              <View style={styles.requestBody}>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="construct" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceName}>{reservation.service?.name || reservation.service || 'Service'}</Text>
                    <Text style={styles.description}>{reservation.description || 'Réparation demandée'}</Text>
                  </View>
                </View>

                {/* Location info */}
                <View style={styles.locationInfo}>
                  <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.locationText}>
                    {reservation.address || reservation.location?.address || 'Adresse client'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={styles.declineBtn} 
                  onPress={() => onUpdateStatus(reservation.id, 'cancelled')}
                >
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.declineText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptBtn} 
                  onPress={() => onUpdateStatus(reservation.id, 'accepted')}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.acceptText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes interventions</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </View>
        {recentReservations.length > 0 ? (
          <TouchableOpacity style={styles.interventionCard} onPress={() => navigation.navigate('Demandes')}>
            <Text style={styles.activityTitle}>{recentReservations[0].clientName || recentReservations[0].user?.name || 'Client'}</Text>
            <Text style={styles.activityMeta}>
              {recentReservations[0].date ? new Date(recentReservations[0].date).toLocaleDateString('fr-FR') : "Aujourd'hui"} à {recentReservations[0].time || '--:--'}
            </Text>
            <Text style={styles.activityMeta}>{recentReservations[0].address || recentReservations[0].location?.address || 'Adresse client'}</Text>
            <TouchableOpacity style={styles.planningBtn}>
              <Text style={styles.planningText}>Voir le planning</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={30} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune intervention planifiée</Text>
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { backgroundColor: Colors.headerBackground, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18 },
  logo: { color: Colors.textLight, fontSize: 38, fontWeight: '700' },
  headerTitle: { color: Colors.textLight, fontSize: 28, fontWeight: '700', marginTop: 8 },
  headerSubtitle: { color: Colors.textLight, opacity: 0.9, marginTop: 6, fontSize: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '47%', backgroundColor: Colors.card, borderRadius: 14, padding: 12 },
  featuredCard: { backgroundColor: '#1f66d1' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 2 },
  statLabel: { color: Colors.textSecondary, marginTop: 2, fontSize: 13, fontWeight: '600' },
  featuredText: { color: Colors.textLight },
  section: { paddingHorizontal: 14, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  linkText: { color: Colors.primary, fontWeight: '600' },
  requestCard: { 
    backgroundColor: Colors.card, 
    borderRadius: 16, 
    padding: 16, 
    marginTop: 12, 
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  requestBody: {
    marginBottom: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde2e7',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9b3550',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f66d1',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  emptyText: { color: Colors.textSecondary, marginTop: 8 },
  interventionCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginTop: 8 },
  planningBtn: { marginTop: 10, backgroundColor: '#1f66d1', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  planningText: { color: Colors.textLight, fontWeight: '700' },
});

export default WorkerHomePage;
