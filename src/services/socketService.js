import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, skipping socket connection');
        return;
      }

      // Temporarily disable socket connection due to polling errors
      console.log('Socket connection temporarily disabled');
      return;

      this.socket = io(process.env.EXPO_PUBLIC_API_URL || 'http://10.90.13.226:3001', {
        auth: {
          token: token
        },
        transports: ['polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        console.error('Full error:', error);
        this.connected = false;
      });

      // Listen for reservation updates
      this.socket.on('reservation_update', (data) => {
        console.log('Reservation update received:', data);
        // Handle reservation status updates in real-time
        // This could trigger a refresh of reservations list or update UI
      });

      // Listen for job completion notifications
      this.socket.on('job_completed_for_review', (data) => {
        console.log('Job completed for review:', data);
        
        // Show alert to user about job completion
        Alert.alert(
          'Travail terminé',
          data.message || 'Le travail est terminé. Veuillez évaluer le travailleur.',
          [
            {
              text: 'Évaluer maintenant',
              onPress: () => {
                // Navigate to rating page
                // This will need to be handled by the navigation system
                // You can emit an event or use a callback
                this.emit('navigate_to_review', {
                  reservationId: data.reservationId,
                  workerId: data.workerId
                });
              }
            },
            {
              text: 'Plus tard',
              style: 'cancel'
            }
          ]
        );
      });

      // Listen for new messages
      this.socket.on('new_message', (data) => {
        console.log('New message received:', data);
        // Handle new messages in real-time
        // This could update the messages list or show a notification
      });

      // Listen for worker location updates
      this.socket.on('worker_location_update', (data) => {
        console.log('Worker location update:', data);
        // Handle real-time location tracking
        // This could update a map or show worker's current location
      });

      // Listen for typing indicators
      this.socket.on('user_typing', (data) => {
        console.log('User typing indicator:', data);
        // Handle typing indicators in chat
      });

      // Listen for errors
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        Alert.alert('Erreur', error.message || 'Une erreur est survenue');
      });

    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Join a reservation room for real-time updates
  joinReservation(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_reservation', reservationId);
    }
  }

  // Leave a reservation room
  leaveReservation(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_reservation', reservationId);
    }
  }

  // Send a message
  sendMessage(reservationId, message, type = 'text') {
    if (this.socket && this.connected) {
      this.socket.emit('send_message', {
        reservationId,
        message,
        type
      });
    }
  }

  // Update reservation status
  updateStatus(reservationId, status, note) {
    if (this.socket && this.connected) {
      this.socket.emit('update_status', {
        reservationId,
        status,
        note
      });
    }
  }

  // Update worker location
  updateLocation(reservationId, location, status) {
    if (this.socket && this.connected) {
      this.socket.emit('update_location', {
        reservationId,
        location,
        status
      });
    }
  }

  // Start typing indicator
  startTyping(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { reservationId });
    }
  }

  // Stop typing indicator
  stopTyping(reservationId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { reservationId });
    }
  }

  // Check if socket is connected
  isConnected() {
    return this.connected;
  }

  // Emit custom events
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  // Listen to custom events
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService();
