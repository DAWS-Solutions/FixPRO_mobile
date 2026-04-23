import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ActivityIndicator, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import socketService from './src/services/socketService';
import { Colors } from './src/styles/theme';

export default function App() {
  const [socketReady, setSocketReady] = useState(false);

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
