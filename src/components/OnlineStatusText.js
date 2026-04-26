import React from 'react';
import { Text } from 'react-native';
import { usePresence } from '../hooks/usePresence';

const OnlineStatusText = ({ userId }) => {
  const isOnline = usePresence(userId);

  return (
    <Text style={{ fontSize: 12, color: isOnline ? '#22c55e' : '#9ca3af' }}>
      {isOnline ? 'En ligne' : 'Hors ligne'}
    </Text>
  );
};

export default OnlineStatusText;
