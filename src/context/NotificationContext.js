import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';

const API_BASE_URL = process.env.EXPO_API_URL || 'http://10.132.59.226:3001/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    // Load unread count from API on mount, fall back to AsyncStorage
    const loadUnreadCount = async () => {
      try {
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
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load unread count from API:', error);
      }
      // Fall back to AsyncStorage
      const stored = await AsyncStorage.getItem('unreadCount');
      if (stored) setUnreadMessages(parseInt(stored));
    };

    loadUnreadCount();

    // Global new_message listener for tab badge updates
    const handleNewMessage = async (data) => {
      setUnreadMessages(prev => {
        const newCount = prev + 1;
        AsyncStorage.setItem('unreadCount', String(newCount));
        return newCount;
      });
    };

    // Register listener on socket connect (handles initial connection and reconnections)
    const registerListener = () => {
      socketService.off('new_message', handleNewMessage); // remove first to prevent duplicates
      socketService.on('new_message', handleNewMessage);
      console.log('new_message listener registered');
    };

    // Listen to connect event to register listener
    socketService.on('connect', registerListener);

    // If socket is already connected, register immediately
    if (socketService.isConnected()) {
      registerListener();
    }

    return () => {
      socketService.off('connect', registerListener);
      socketService.off('new_message', handleNewMessage);
    };
  }, []);

  const resetUnreadMessages = async () => {
    setUnreadMessages(0);
    await AsyncStorage.setItem('unreadCount', '0');
  };

  return (
    <NotificationContext.Provider value={{ unreadMessages, setUnreadMessages, resetUnreadMessages }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
