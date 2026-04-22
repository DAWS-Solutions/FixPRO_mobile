import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Colors } from '../styles/theme';

const WorkerProfilePage = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [profileMeta, setProfileMeta] = useState({
    isVerified: false,
    rating: 4.8,
    interventions: 0,
    profession: 'Professionnel',
  });
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    experience: '',
    hourlyRate: '',
    currentPassword: '',
    newPassword: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileResponse, reservationsResponse] = await Promise.all([
        apiService.getWorkerProfile().catch(() => null),
        apiService.getWorkerReservations(user.id).catch(() => null),
      ]);
      const profile = profileResponse?.data || profileResponse || user || {};
      const list =
        reservationsResponse?.data?.reservations ||
        reservationsResponse?.reservations ||
        reservationsResponse?.data ||
        reservationsResponse ||
        [];
      setReservations(Array.isArray(list) ? list : []);
      setProfileMeta({
        isVerified: profile.isVerified || profile.verified || false,
        rating: profile.averageRating || profile.rating || 4.8,
        interventions: profile.jobsCompleted || Array.isArray(list) ? list.length : 0,
        profession: profile.services?.[0]?.name || profile.profession || 'Professionnel',
      });
      setForm((prev) => ({
        ...prev,
        name: profile.user?.name || profile.name || user?.name || '',
        email: profile.user?.email || profile.email || user?.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        experience: String(profile.experience || ''),
        hourlyRate: String(profile.hourlyRate || ''),
      }));
      console.log('WorkerProfilePage', profile);
    } catch (error) {
      console.error('Failed to load worker profile page:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const stats = useMemo(() => {
    const pending = reservations.filter((r) => ['pending', 'accepted', 'in_progress'].includes(r.status)).length;
    const completed = reservations.filter((r) => r.status === 'completed').length;
    return { pending, completed, total: reservations.length };
  }, [reservations]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      await apiService.updateWorkerProfile({
        phone: form.phone,
        bio: form.bio,
        experience: Number(form.experience || 0),
        hourlyRate: Number(form.hourlyRate || 0),
      });
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error) {
      console.error('Failed to save worker profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!form.currentPassword || !form.newPassword) {
      Alert.alert('Erreur', 'Veuillez remplir les champs mot de passe');
      return;
    }
    try {
      setSaving(true);
      await apiService.request('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      Alert.alert('Succès', 'Mot de passe modifié');
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Erreur', 'Modification du mot de passe non disponible pour le moment');
    } finally {
      setSaving(false);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil du technicien</Text>
      </View>

      <View style={styles.profileTop}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={54} color={Colors.primary} />
        </View>
        {profileMeta.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.textLight} />
            <Text style={styles.verifiedText}>Certifié</Text>
          </View>
        )}
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.name}>{form.name || 'Professionnel'}</Text>
        <Text style={styles.profession}>{profileMeta.profession}</Text>
        <Text style={styles.ratingLine}>
          {profileMeta.rating} ({stats.completed} avis) · {form.experience || 0} ans d'expérience
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Interventions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profileMeta.rating}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.pending > 0 ? `${Math.max(70, 100 - stats.pending * 5)}%` : '100%'}</Text>
            <Text style={styles.statLabel}>Clients satisfaits</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.aboutText}>{form.bio || 'Spécialiste en plomberie et installations sanitaires.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modifier mes informations</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="Téléphone" />
        <TextInput style={styles.input} value={form.bio} onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))} placeholder="Bio" multiline />
        <TextInput style={styles.input} value={form.experience} onChangeText={(v) => setForm((p) => ({ ...p, experience: v }))} placeholder="Expérience (années)" keyboardType="number-pad" />
        <TextInput style={styles.input} value={form.hourlyRate} onChangeText={(v) => setForm((p) => ({ ...p, hourlyRate: v }))} placeholder="Tarif horaire" keyboardType="number-pad" />
        <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
          <Text style={styles.primaryButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Changer mot de passe</Text>
        <TextInput
          style={styles.input}
          value={form.currentPassword}
          onChangeText={(v) => setForm((p) => ({ ...p, currentPassword: v }))}
          placeholder="Mot de passe actuel"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={form.newPassword}
          onChangeText={(v) => setForm((p) => ({ ...p, newPassword: v }))}
          placeholder="Nouveau mot de passe"
          secureTextEntry
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={changePassword} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Mettre à jour le mot de passe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { backgroundColor: Colors.headerBackground, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 36, alignItems: 'center' },
  headerTitle: { color: Colors.textLight, fontSize: 18, fontWeight: '700' },
  profileTop: { alignItems: 'center', marginTop: -24, marginBottom: -12 },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  verifiedBadge: {
    marginTop: 8,
    backgroundColor: '#0ea36f',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: { color: Colors.textLight, fontSize: 11, fontWeight: '700' },
  mainCard: { backgroundColor: Colors.card, margin: 14, borderRadius: 14, padding: 14, paddingTop: 18 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text },
  profession: { color: Colors.textSecondary, marginTop: 2 },
  ratingLine: { color: Colors.textSecondary, marginTop: 6, fontWeight: '600', fontSize: 12 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  stat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  section: { marginHorizontal: 14, marginBottom: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 10, color: Colors.text },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  primaryButtonText: { color: Colors.textLight, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: Colors.textLight, fontWeight: '700' },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { color: Colors.error, fontWeight: '700' },
  aboutText: { color: Colors.textSecondary, lineHeight: 20 },
});

export default WorkerProfilePage;
