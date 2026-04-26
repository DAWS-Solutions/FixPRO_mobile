import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePresence } from '../hooks/usePresence';

const OnlineBadge = ({ userId, size = 12, borderColor = '#fff' }) => {
  const isOnline = usePresence(userId);

  return (
    <View style={[
      styles.dot,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor,
        backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
      }
    ]} />
  );
};

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default OnlineBadge;
