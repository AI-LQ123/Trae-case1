import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MessageProps {
  text: string;
  isUser: boolean;
  timestamp?: string;
}

export const MessageBubble: React.FC<MessageProps> = ({ text, isUser, timestamp }) => {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {text}
        </Text>
      </View>
      {timestamp && (
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
          {timestamp}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  aiContainer: {
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#8E8E93',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#8E8E93',
    textAlign: 'left',
  },
});