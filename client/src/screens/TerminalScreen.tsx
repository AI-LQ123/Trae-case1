import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TerminalScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>终端</Text>
      <Text style={styles.subtitle}>远程终端会话</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
});
