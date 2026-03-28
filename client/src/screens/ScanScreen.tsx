import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ScanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>扫描二维码</Text>
      <Text style={styles.subtitle}>扫描电脑端二维码进行配对</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
});
