import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const UserHomePage = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    
    // Initialize socket connection
    socketService.connect();
    
    // Listen for navigation to review page
    socketService.on('navigate_to_review', (data) => {
      navigation.navigate('Rating', {
        reservationId: data.reservationId,
        workerId: data.workerId
      });
    });
    
    // Cleanup on unmount
    return () => {
      socketService.off('navigate_to_review');
    };
  }, []);

  const loadUserData = async () => {
    try {
      const profileResponse = await apiService.getUserProfile();
      const profileData = profileResponse.data || profileResponse;
      setUserData(profileData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Fallback to auth context user data
      setUserData(user);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, topWorkersData, userProfile] = await Promise.all([
        apiService.getServices(),
        apiService.getWorkers({ limit: 4, minRating: 4.0 }),
        apiService.getUserProfile().catch(() => null)
      ]);
      
      setServices(servicesData.data || servicesData);
      
      // Debug: Log the API response structure
      console.log('Top Workers API Response:', JSON.stringify(topWorkersData, null, 2));
      
      // Process workers data to ensure proper structure
      const workersData = topWorkersData.data?.workers || topWorkersData.workers || topWorkersData.data || topWorkersData || [];
      console.log('Workers Data Array:', JSON.stringify(workersData, null, 2));
      const processedWorkers = workersData.map(worker => {
        console.log('Processing worker:', JSON.stringify(worker, null, 2));
        return {
          ...worker,
          name: worker.user?.name || worker.name || worker.firstName && worker.lastName ? `${worker.firstName} ${worker.lastName}` : worker.fullName || worker.username || 'Technicien',
          profession: worker.services?.[0]?.name || worker.profession || worker.specialty || worker.service || worker.category || 'Professionnel',
          averageRating: worker.averageRating || worker.rating || 0,
          totalReviews: worker.totalReviews || worker.reviewCount || 0,
          experience: worker.experience || 0,
          basePrice: worker.hourlyRate || worker.basePrice || 30,
          isVerified: worker.isVerified || worker.verified || false,
          userId: worker.id || worker.userId || worker._id
        };
      });
      console.log('Processed Workers:', JSON.stringify(processedWorkers, null, 2));
      setWorkers(processedWorkers);

      // Set user data
      if (userProfile) {
        setUserData(userProfile.data || userProfile);
      } else {
        setUserData(user);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
      // Fallback to auth context user data
      setUserData(user);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWorkerClick = (worker) => {
    console.log(worker.id)
    navigation.navigate('WorkerProfile', { workerId: worker.id });
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={14}
          color={Colors.star}
        />
      );
    }
    return stars;
  };

  const handleCategoryClick = (categoryId) => {
    navigation.navigate('ServiceWorkers', { category: categoryId });
  };

  const handleReservationClick = (categoryId) => {
    navigation.navigate('ServiceWorkers', { category: categoryId });
  };

  const handleSeeAllProfessionals = () => {
    navigation.navigate('Professionals');
  };

  const categories = [
    {
      id: 'plumbing',
      title: 'Plomberie',
      subtitle: 'Réparation et installation',
      description: 'Services complets de plomberie',
      availability: '24/7',
      icon: 'construct',
      color: '#3b82f6',
    },
    {
      id: 'electrical',
      title: 'Électricité',
      subtitle: 'Services électriques',
      description: 'Électriciens certifiés',
      availability: 'Lun-Sam 8h-20h',
      icon: 'flash',
      color: '#eab308',
    },
    {
      id: 'hvac',
      title: 'Climatisation',
      subtitle: 'Installation HVAC',
      description: 'Techniciens HVAC expérimentés',
      availability: 'Lun-Dim 7h-22h',
      icon: 'snow',
      color: '#22c55e',
    },
    {
      id: 'locksmith',
      title: 'Serrurerie',
      subtitle: 'Dépannage serrures',
      description: 'Serruriers disponibles 24/7',
      availability: '24/7',
      icon: 'lock-closed',
      color: '#ef4444',
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>FixPro</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="notifications" size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>
          Bonjour {userData?.name || user?.name || ''}, Comment pouvons-nous vous aider?
        </Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.categoriesGrid}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryClick(category.id)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `#ffff` || '#fff' }]}>
                <Ionicons name={category.icon} size={35} color={Colors.iconLight} />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Workers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Techniciens certifiés</Text>
          <TouchableOpacity onPress={handleSeeAllProfessionals}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {workers.map(worker => (
          <TouchableOpacity
            key={worker.id || worker.userId}
            style={styles.workerCard}
            onPress={() => handleWorkerClick(worker)}
          >
            <View style={styles.workerHeader}>
              <View style={styles.workerAvatar}>
                <Ionicons name="person" size={28} color={Colors.primary} />
                {worker.isVerified && (
                  <View style={styles.verifiedBadge} />
                )}
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{worker.user.name}</Text>
                <Text style={styles.workerProfession}>
                  {worker.services && worker.services[0] ? worker.services[0].name : 'Service non spécifié'}
                </Text>
              </View>
            </View>
            
            <View style={styles.workerRating}>
              <View style={styles.stars}>
                {renderStars(worker.averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {worker.averageRating || 0} ({worker.totalReviews || 0} avis)
              </Text>
            </View>
            
            <View style={styles.workerDetails}>
              <Text style={styles.experienceText}>
                {worker.experience || 0} ans d'expérience
              </Text>
              <Text style={styles.priceText}>
                À partir de {worker.basePrice || 30} TND
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.headerBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.03,
    paddingBottom: height * 0.03,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: Colors.textLight,
    textAlign: 'left',
  },
  notificationButton: {
    padding: width * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: width * 0.045,
    color: Colors.textLight,
    marginBottom: height * 0.025,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.03,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.015,
    gap: width * 0.025,
  },
  searchInput: {
    padding:2,
    height: height * 0.03,
    flex: 1,
    fontSize: width * 0.04,
    color: Colors.text,
  },
  filterButton: {
    backgroundColor: Colors.primaryDark,
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.03,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: width * 0.025,
    marginBottom: height * 0.03,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  seeAllText: {
    fontSize: width * 0.04,
    color: Colors.textLight,
    fontWeight: '600',
  },
  categoriesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: width * 0.025,
    paddingLeft: width * 0.0125,
    paddingRight: width * 0.0125,
  },
  categoryCard: {
    width: '22%',
    backgroundColor: Colors.card,
    borderRadius: width * 0.04,
    padding: width * 0.025,
    alignItems: 'center',
    marginBottom: height * 0.02,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  categoryTitle: {
    fontSize: width * 0.03,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  workerCard: {
    backgroundColor: Colors.card,
    borderRadius: width * 0.04,
    padding: width * 0.03,
    marginBottom: height * 0.03,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.03,
  },
  workerAvatar: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: width * 0.04,
    height: width * 0.04,
    borderRadius: width * 0.02,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: height * 0.005,
  },
  workerProfession: {
    fontSize: width * 0.035,
    color: Colors.textSecondary,
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  stars: {
    flexDirection: 'row',
    marginRight: width * 0.02,
  },
  ratingText: {
    fontSize: width * 0.035,
    color: Colors.textSecondary,
  },
  workerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceText: {
    fontSize: width * 0.035,
    color: Colors.textSecondary,
  },
  priceText: {
    fontSize: width * 0.035,
    color: Colors.textSecondary,
  },
});

export default UserHomePage;
