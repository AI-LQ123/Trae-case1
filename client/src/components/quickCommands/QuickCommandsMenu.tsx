import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { addMessage } from '../../state/slices/chatSlice';
import { addCommand } from '../../state/slices/terminalSlice';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  type: 'chat' | 'terminal';
  content: string;
}

interface QuickCommandsMenuProps {
  visible: boolean;
  onClose: () => void;
}

const QuickCommandsMenu: React.FC<QuickCommandsMenuProps> = ({ visible, onClose }) => {
  const dispatch = useDispatch();

  const commands: CommandItem[] = [
    {
      id: '1',
      title: '查看项目结构',
      description: '显示当前项目的文件树结构',
      type: 'terminal',
      content: 'ls -la',
    },
    {
      id: '2',
      title: '运行测试',
      description: '执行项目的测试套件',
      type: 'terminal',
      content: 'npm test',
    },
    {
      id: '3',
      title: '构建项目',
      description: '构建生产版本',
      type: 'terminal',
      content: 'npm run build',
    },
    {
      id: '4',
      title: '代码解释',
      description: '请解释选中的代码',
      type: 'chat',
      content: '请解释以下代码的功能和实现原理：',
    },
    {
      id: '5',
      title: '代码优化',
      description: '优化选中的代码',
      type: 'chat',
      content: '请优化以下代码，提高性能和可读性：',
    },
    {
      id: '6',
      title: '错误分析',
      description: '分析错误信息',
      type: 'chat',
      content: '请分析以下错误信息并提供解决方案：',
    },
  ];

  const handleCommandPress = (command: CommandItem) => {
    if (command.type === 'chat') {
      dispatch(addMessage({
        id: Date.now().toString(),
        sessionId: 'current',
        role: 'user',
        content: command.content,
        timestamp: Date.now(),
      }));
    } else if (command.type === 'terminal') {
      dispatch(addCommand({
        id: Date.now().toString(),
        sessionId: 'current',
        command: command.content,
        timestamp: Date.now(),
      }));
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>快捷指令</Text>
            <TouchableOpacity onPress={onClose}>
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