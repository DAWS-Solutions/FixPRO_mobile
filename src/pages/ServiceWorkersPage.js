import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const ServiceWorkersPage = ({ route, navigation }) => {
  const { category } = route.params || {};
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [filterAvailable, setFilterAvailable] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, [category, filterAvailable]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const params = {
        category: category,
        minRating: 0,
        limit: 50
      };
      
      if (filterAvailable) {
        params.isActive = true;
      }
      
      const data = await apiService.getWorkers(params);
      setWorkers(data.data?.workers || data.workers || data.data || data);
    } catch (error) {
      console.error('Failed to load workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const getCategoryInfo = () => {
    const categories = {
      plumbing: {
        title: 'Plomberie',
        icon: 'construct',
        color: '#3b82f6',
        description: 'Plombiers professionnels disponibles'
      },
      electrical: {
        title: 'Électricité',
        icon: 'flash',
        color: '#eab308',
        description: 'Électriciens certifiés à votre service'
      },
      hvac: {
        title: 'Climatisation',
        icon: 'air',
        color: '#22c55e',
        description: 'Techniciens HVAC expérimentés'
      },
      locksmith: {
        title: 'Serrurerie',
        icon: 'lock-closed',
        color: '#ef4444',
        description: 'Serruriers disponibles 24/7'
      }
    };
    return categories[category] || categories.plumbing;
  };

  const categoryInfo = getCategoryInfo();

  const filteredWorkers = workers
    .filter(worker => {
      const matchesSearch = worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          worker.bio?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAvailability = !filterAvailable || worker.isActive;
      return matchesSearch && matchesAvailability;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'experience') return (b.experience || 0) - (a.experience || 0);
      if (sortBy === 'jobs') return (b.jobsCompleted || 0) - (a.jobsCompleted || 0);
      return 0;
    });

  const handleWorkerClick = (workerId) => {
    navigation.navigate('WorkerProfile', { workerId });
  };

  const handleReservationClick = (workerId) => {
    navigation.navigate('ReservationDetails', { workerId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color }]}>
            <Ionicons name={categoryInfo.icon} size={20} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
            <Text style={styles.headerSubtitle}>{categoryInfo.description}</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un professionnel..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Trier par:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { value: 'rating', label: 'Note' },
                { value: 'experience', label: 'Expérience' },
                { value: 'jobs', label: 'Jobs' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    sortBy === option.value && styles.activeFilterChip
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.filterChipText,
                    sortBy === option.value && styles.activeFilterChipText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={styles.availableFilter}
            onPress={() => setFilterAvailable(!filterAvailable)}
          >
            <View style={[styles.checkbox, filterAvailable && styles.checkboxChecked]} />
            <Text style={styles.availableText}>Uniquement les disponibles</Text>
          </TouchableOpacity>
          
          <Text style={styles.resultCount}>
            {filteredWorkers.length} professionnel{filteredWorkers.length > 1 ? 's' : ''} trouvé{filteredWorkers.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Workers List */}
        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun professionnel trouvé</Text>
            <Text style={styles.emptySubtext}>
              Essayez de modifier vos filtres ou votre recherche
            </Text>
          </View>
        ) : (
          filteredWorkers.map(worker => (
            <View key={worker.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <View style={styles.workerAvatar}>
                  <Ionicons name="person" size={28} color="#667eea" />
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <View style={styles.workerStatus}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: worker.isActive ? '#22c55e' : '#9ca3af' }
                    ]} />
                    <Text style={styles.statusText}>
                      {worker.isActive ? 'Disponible' : 'Indisponible'}
                    </Text>
                  </View>
                </View>
                {worker.isVerified && (
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                )}
              </View>
              
              {worker.bio && (
                <Text style={styles.workerBio} numberOfLines={2}>
                  {worker.bio}
                </Text>
              )}
              
              <View style={styles.workerRating}>
                <Ionicons name="star" size={16} color="#eab308" />
                <Text style={styles.ratingText}>
                  {worker.averageRating || 'N/A'} ({worker.totalReviews || 0} avis)
                </Text>
              </View>
              
              <View style={styles.workerDetails}>
                {worker.experience && (
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#666" />
                    <Text style={styles.detailText}>{worker.experience} ans</Text>
                  </View>
                )}
                {worker.jobsCompleted && (
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#666" />
                    <Text style={styles.detailText}>{worker.jobsCompleted} jobs</Text>
                  </View>
                )}
                {worker.hourlyRate && (
                  <View style={styles.detailItem}>
                    <Text style={styles.rateText}>{worker.hourlyRate}$/h</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.workerActions}>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleWorkerClick(worker.id)}
                >
                  <Text style={styles.viewProfileButtonText}>Voir profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: categoryInfo.color }]}
                  onPress={() => handleReservationClick(worker.id)}
                >
                  <Text style={styles.bookButtonText}>Réserver</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#667eea',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  availableFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  availableText: {
    fontSize: 14,
    color: '#333',
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  workerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  workerBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
  },
  workerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  rateText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  bookButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ServiceWorkersPage;
