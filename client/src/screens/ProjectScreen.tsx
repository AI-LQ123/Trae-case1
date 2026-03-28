import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ProjectScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>项目文件</Text>
      <Text style={styles.subtitle}>浏览项目文件结构</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
