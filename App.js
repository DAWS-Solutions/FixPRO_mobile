import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ActivityIndicator, View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import socketService from './src/services/socketService';
import { Colors } from './src/styles/theme';

export default function App() {
  const [socketReady, setSocketReady] = useState(false);
  const [pendingReview, setPendingReview] = useState(null);

  useEffect(() => {
    socketService.connect();

    // Listen to socket connect event to know when it's actually connected
    const handleConnect = () => {
      console.log('Socket connected, setting socketReady to true');
      setSocketReady(true);
    };

    socketService.on('connect', handleConnect);

    // Fallback: if socket doesn't connect within 5 seconds, proceed anyway
    const fallbackTimer = setTimeout(() => {
      if (!socketReady) {
        console.log('Socket connection timeout, proceeding anyway');
        setSocketReady(true);
      }
    }, 5000);

    return () => {
      socketService.off('connect', handleConnect);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Check for pending review on app launch
  useEffect(() => {
    if (socketReady) {
      const checkPendingReview = async () => {
        try {
          const pendingReviewData = await AsyncStorage.getItem('pendingReview');
          if (pendingReviewData) {
            const review = JSON.parse(pendingReviewData);
            setPendingReview(review);
            
            Alert.alert(
              'Job Completed!',
              `${review.workerName} has completed your ${review.serviceType} job. Would you like to leave a review?`,
              [
                {
                  text: 'Later',
                  onPress: () => {
                    // Keep it in AsyncStorage for later
                  },
                  style: 'cancel'
                },
                {
                  text: 'Review Now',
                  onPress: () => {
                    // Navigate to review page - this will be handled by navigation
                    // Update the flag to trigger navigation
                    AsyncStorage.setItem('pendingReview', JSON.stringify({
                      ...review,
                      navigateNow: true
                    }));
                    setPendingReview({ ...review, navigateNow: true });
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Failed to check pending review:', error);
        }
      };

      checkPendingReview();
    }
  }, [socketReady]);

  if (!socketReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={['top']}>
          <StatusBar style="auto" />
          <AppNavigator />
        </SafeAreaView>
      </NotificationProvider>
    </AuthProvider>
  );
}
