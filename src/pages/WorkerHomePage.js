import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
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
      console.log("awiofjawoifj",user)
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
  const incomingRequests = reservations.filter((item) => item.status === 'pending').slice(0, 2);

  const onUpdateStatus = async (reservationId, status) => {
    try {
      await apiService.updateReservationStatus(reservationId, status);
      await loadData();
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>FixPro</Text>
        <Text style={styles.headerTitle}>Bonjour, {user?.name || 'Professionnel'} 👋</Text>
        <Text style={styles.headerSubtitle}>Simple · rapide · fiable</Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Revenus ce mois', value: `${stats.completed * 70} TND`, icon: 'stats-chart', color: Colors.primary, featured: true },
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
            <Ionicons name="calendar-outline" size={30} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune nouvelle demande</Text>
          </View>
        ) : (
          incomingRequests.map((reservation) => (
            <TouchableOpacity
              key={reservation.id}
              style={styles.activityCard}
              onPress={() => navigation.navigate('WorkerReservationDetails', { reservation })}
            >
              <Text style={styles.activityTitle}>{reservation.clientName || reservation.user?.name || 'Client'}</Text>
              <Text style={styles.activityMeta}>{reservation.service?.name || reservation.service || 'Service'}</Text>
              <Text style={styles.activityMeta}>{reservation.description || 'Réparation demandée'}</Text>
              <View style={styles.inlineActions}>
                <TouchableOpacity style={styles.refuseBtn} onPress={() => onUpdateStatus(reservation.id, 'cancelled')}>
                  <Text style={styles.refuseText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => onUpdateStatus(reservation.id, 'accepted')}>
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { backgroundColor: Colors.headerBackground, paddingTop: 56, paddingHorizontal: 56, paddingBottom: 18 },
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
  activityCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginTop: 8 },
  activityTitle: { color: Colors.text, fontWeight: '600' },
  activityMeta: { color: Colors.textSecondary, marginTop: 2, fontSize: 12 },
  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  acceptBtn: { backgroundColor: '#1f66d1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  acceptText: { color: Colors.textLight, fontWeight: '700' },
  refuseBtn: { backgroundColor: '#fde2e7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  refuseText: { color: '#9b3550', fontWeight: '700' },
  emptyCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  emptyText: { color: Colors.textSecondary, marginTop: 8 },
  interventionCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginTop: 8 },
  planningBtn: { marginTop: 10, backgroundColor: '#1f66d1', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  planningText: { color: Colors.textLight, fontWeight: '700' },
});

export default WorkerHomePage;
