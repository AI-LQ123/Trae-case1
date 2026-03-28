import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MessageList } from '../components/chat/MessageList';
import { MessageProps } from '../components/chat/MessageBubble';
import { useWebSocket } from '../hooks/useWebSocket';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

export const ChatScreen: React.FC = () => {
  const { connected, reconnecting, send, connect } = useWebSocket();
  const [messages, setMessages] = useState<MessageProps[]>([
    {
      id: generateId(),
      text: '你好！我是你的 AI 助手，有什么可以帮助你的吗？',
      isUser: false,
      timestamp: getCurrentTime(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);

  useEffect(() => {
    connect();

    const unsubscribe = useWebSocket.getClient()?.onMessage('event', (msg: any) => {
      if (msg.type === 'event' && msg.category === 'chat' && msg.payload?.content) {
        const aiResponse: MessageProps = {
          id: generateId(),
          text: msg.payload.content as string,
          isUser: false,
          timestamp: getCurrentTime(),
        };
        setMessages(prevMessages => [...prevMessages, aiResponse]);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [connect]);

  const handleSend = () => {
    if (!inputText.trim() || !connected) return;

    const userMessage: MessageProps = {
      id: generateId(),
      text: inputText.trim(),
      isUser: true,
      timestamp: getCurrentTime(),
    };
    setMessages([...messages, userMessage]);
    setInputText('');

    // 通过WebSocket发送消息
    send({
      type: 'command',
      category: 'chat',
      id: generateId(),
      timestamp: Date.now(),
      payload: { message: inputText.trim() }
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI 对话</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, connected ? styles.connectedStatus : styles.disconnectedStatus]} />
          <Text style={styles.statusText}>
            {connected ? '在线' : reconnecting ? '重连中...' : '离线'}
          </Text>
        </View>
      </View>
      <MessageList messages={messages} />
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { height: Math.max(40, inputHeight) }]}
          placeholder="输入消息..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          onContentSizeChange={(e) => {
            setInputHeight(Math.min(100, e.nativeEvent.contentSize.height));
          }}
        />
        <TouchableOpacity
          style={[styles.sendButton, !connected && styles.disabledButton]}
          onPress={handleSend}
          disabled={!connected}
        >
          <Text style={styles.sendButtonText}>
            {connected ? '发送' : '连接中...'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectedStatus: {
    backgroundColor: '#34C759',
  },
  disconnectedStatus: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
