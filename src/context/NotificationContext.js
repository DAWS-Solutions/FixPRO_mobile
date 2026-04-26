import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { Alert } from 'react-native';

const API_BASE_URL = process.env.EXPO_API_URL || 'http://10.58.224.226:3001/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [reservationUnread, setReservationUnread] = useState(0);
  const [newConversation, setNewConversation] = useState(null);

  useEffect(() => {
    // Load unread counts from AsyncStorage on mount
    const loadUnreadCounts = async () => {
      try {
        // Load message unread count
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const response = await fetch(`${API_BASE_URL}/messages/unread-count`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUnreadMessages(data.data?.unreadCount || 0);
            await AsyncStorage.setItem('unreadCount', String(data.data?.unreadCount || 0));
          }
        }
        // Load reservation unread count
        const storedReservation = await AsyncStorage.getItem('reservationUnreadCount');
        if (storedReservation) setReservationUnread(parseInt(storedReservation));
      } catch (error) {
        console.error('Failed to load unread counts:', error);
        // Fall back to AsyncStorage
        const stored = await AsyncStorage.getItem('unreadCount');
        if (stored) setUnreadMessages(parseInt(stored));
        const storedReservation = await AsyncStorage.getItem('reservationUnreadCount');
        if (storedReservation) setReservationUnread(parseInt(storedReservation));
      }
    };

    loadUnreadCounts();

    // Global new_message listener for tab badge updates
    const handleNewMessage = async (data) => {
      setUnreadMessages(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('unreadCount', String(newCount));
        return newCount;
      });
    };

    // new_reservation listener for workers
    const handleNewReservation = async (data) => {
      setReservationUnread(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('reservationUnreadCount', String(newCount));
        return newCount;
      });
    };

    // reservation_status_changed listener for users and workers
    const handleStatusChanged = async (data) => {
      setReservationUnread(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('reservationUnreadCount', String(newCount));
        return newCount;
      });

      // Show alert based on status
      const { newStatus, workerName, userName, serviceType } = data;
      let message = '';
      
      switch (newStatus) {
        case 'ACCEPTED':
          message = `Your reservation has been accepted by ${workerName}`;
          break;
        case 'REJECTED':
          message = `Your reservation was declined by ${workerName}`;
          break;
        case 'COMPLETED':
          message = `Your job has been marked as completed`;
          break;
        case 'CANCELLED':
          message = `Your reservation was cancelled`;
          break;
        default:
          message = `Reservation status changed to ${newStatus}`;
      }

      Alert.alert('Reservation Update', message);
    };

    // job_completed listener with review prompt
    const handleJobCompleted = async (data) => {
      const { reservationId, workerId, workerName, serviceType } = data;
      
      Alert.alert(
        'Job Completed!',
        `${workerName} has completed your ${serviceType} job. Would you like to leave a review?`,
        [
          {
            text: 'Later',
            onPress: async () => {
              // Store pending review for later
              await AsyncStorage.setItem('pendingReview', JSON.stringify({
                reservationId,
                workerId,
                workerName,
                serviceType
              }));
            },
            style: 'cancel'
          },
          {
            text: 'Review Now',
            onPress: () => {
              // Navigate to review page - this will be handled by navigation
              // Store in AsyncStorage for App.js to pick up
              AsyncStorage.setItem('pendingReview', JSON.stringify({
                reservationId,
                workerId,
                workerName,
                serviceType,
                navigateNow: true
              }));
            }
          }
        ]
      );
    };

    // conversation_started listener for real-time conversation updates
    const handleConversationStarted = async (data) => {
      console.log('New conversation started:', data);
      setNewConversation(data);
    };

    // Register all listeners on socket connect
    const registerListeners = () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_reservation', handleNewReservation);
      socketService.off('reservation_status_changed', handleStatusChanged);
      socketService.off('job_completed', handleJobCompleted);
      socketService.off('conversation_started', handleConversationStarted);
      
      socketService.on('new_message', handleNewMessage);
      socketService.on('new_reservation', handleNewReservation);
      socketService.on('reservation_status_changed', handleStatusChanged);
      socketService.on('job_completed', handleJobCompleted);
      socketService.on('conversation_started', handleConversationStarted);
      
      console.log('All notification listeners registered');
    };

    // Listen to connect event to register listeners
    socketService.on('connect', registerListeners);

    // If socket is already connected, register immediately
    if (socketService.isConnected()) {
      registerListeners();
    }

    return () => {
      socketService.off('connect', registerListeners);
      socketService.off('new_message', handleNewMessage);
      socketService.off('new_reservation', handleNewReservation);
      socketService.off('reservation_status_changed', handleStatusChanged);
      socketService.off('job_completed', handleJobCompleted);
      socketService.off('conversation_started', handleConversationStarted);
    };
  }, []);

  const resetUnreadMessages = async () => {
    setUnreadMessages(0);
    await AsyncStorage.setItem('unreadCount', '0');
  };

  const resetReservationUnread = async () => {
    setReservationUnread(0);
    await AsyncStorage.setItem('reservationUnreadCount', '0');
  };

  return (
    <NotificationContext.Provider value={{ 
      unreadMessages, 
      setUnreadMessages, 
      resetUnreadMessages,
      reservationUnread,
      setReservationUnread,
      resetReservationUnread,
      newConversation,
      setNewConversation
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
