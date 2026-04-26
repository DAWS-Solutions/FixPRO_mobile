import { useState, useEffect } from 'react';
import socketService from '../services/socketService';

export const usePresence = (userId) => {
  const [isOnline, setIsOnline] = useState(() => socketService.isOnline(userId));

  useEffect(() => {
    if (!userId) return;
    
    setIsOnline(socketService.isOnline(userId));
    const unsubscribe = socketService.onPresenceChange((changedUserId, online) => {
      if (changedUserId === userId) setIsOnline(online);
    });
    return unsubscribe;
  }, [userId]);

  return isOnline;
};
