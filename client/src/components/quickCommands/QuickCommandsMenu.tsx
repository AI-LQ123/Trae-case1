import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { addMessage } from '../../state/slices/chatSlice';
import { addCommand } from '../../state/slices/terminalSlice';
import { setMenuVisibility } from '../../state/slices/quickCommandsSlice';
import { RootState } from '../../state/store';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  type: 'chat' | 'terminal';
  content: string;
}

interface QuickCommandsMenuProps {
  // 组件现在使用Redux状态，不需要这些props
}

const QuickCommandsMenu: React.FC<QuickCommandsMenuProps> = () => {
  const dispatch = useDispatch();
  const visible = useSelector((state: RootState) => state.quickCommands.isMenuVisible);
  const commands = useSelector((state: RootState) => state.quickCommands.commands);
  const currentSessionId = useSelector((state: RootState) => state.terminal.currentSessionId);
  const chatSessionId = useSelector((state: RootState) => state.chat.currentSessionId);
  const isWebSocketConnected = useSelector((state: RootState) => state.websocket.connected);

  // 从Redux获取指令数据，不再硬编码
  // 生成唯一ID的函数
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleCommandPress = (command: CommandItem) => {
    // 检查网络连接
    if (!isWebSocketConnected) {
      Alert.alert('无法执行', '网络连接未建立，请检查连接状态');
      return;
    }

    // 检查会话ID
    const targetSessionId = command.type === 'chat' ? chatSessionId : currentSessionId;
    if (!targetSessionId) {
      Alert.alert('无法执行', command.type === 'chat' ? '没有活动的聊天会话' : '没有活动的终端会话');
      return;
    }

    if (command.type === 'chat') {
      dispatch(addMessage({
        id: generateId(),
        sessionId: targetSessionId,
        role: 'user',
        content: command.content,
        timestamp: Date.now(),
      }));
    } else if (command.type === 'terminal') {
      dispatch(addCommand({
        id: generateId(),
        sessionId: targetSessionId,
        command: command.content,
        timestamp: Date.now(),
      }));
    }
    // 使用Redux action关闭菜单
    dispatch(setMenuVisibility(false));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => dispatch(setMenuVisibility(false))}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => dispatch(setMenuVisibility(false))}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>快捷指令</Text>
            <TouchableOpacity onPress={() => dispatch(setMenuVisibility(false))}>
              <Text style={styles.closeButton}>关闭</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            {commands.map((command) => (
              <TouchableOpacity
                key={command.id}
                style={styles.commandItem}
                onPress={() => handleCommandPress(command)}
              >
                <View style={styles.commandInfo}>
                  <Text style={styles.commandTitle}>{command.title}</Text>
                  <Text style={styles.commandDescription}>{command.description}</Text>
                  <Text style={styles.commandContent}>{command.content}</Text>
                </View>
                <View style={[styles.commandType, command.type === 'chat' ? styles.chatType : styles.terminalType]}>
                  <Text style={styles.commandTypeText}>
                    {command.type === 'chat' ? '对话' : '终端'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    padding: 10,
  },
  commandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },
  commandInfo: {
    flex: 1,
    marginRight: 10,
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  commandDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  commandContent: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  commandType: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  chatType: {
    backgroundColor: '#E3F2FD',
  },
  terminalType: {
    backgroundColor: '#F3E5F5',
  },
  commandTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default QuickCommandsMenu;