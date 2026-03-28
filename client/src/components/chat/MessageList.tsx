import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { MessageBubble, MessageProps } from './MessageBubble';

export interface MessageListProps {
  messages: MessageProps[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const renderMessage = ({ item }: { item: MessageProps }) => (
    <MessageBubble
      text={item.text}
      isUser={item.isUser}
      timestamp={item.timestamp}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, index) => `message-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        inverted={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
  },
});