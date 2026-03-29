import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Terminal } from '../components/terminal/Terminal';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  addSession,
  removeSession,
  setCurrentSession,
  addOutput,
  addCommand,
  setLoading,
  setError,
  setTerminalSize,
  TerminalSession,
  TerminalOutput,
} from '../state/slices/terminalSlice';
import type { RootState, AppDispatch } from '../state/store';
import { Colors } from '../constants/colors';

const generateId = (): string => {
  return `term-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const TerminalScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { connected, send } = useWebSocket();
  const {
    sessions,
    currentSessionId,
    outputs,
    commandHistory,
    loading,
    cols,
    rows,
  } = useSelector((state: RootState) => state.terminal);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionCwd, setNewSessionCwd] = useState('');

  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    const client = useWebSocket.getClient();
    if (!client) return;

    const unsubscribe = client.onMessage('event', (msg: any) => {
      if (msg.type === 'event') {
        const { category, action, data } = msg.payload || {};

        if (category === 'terminal') {
          switch (action) {
            case 'session_created':
              dispatch(addSession({
                id: data.sessionId,
                name: data.name,
                cwd: data.cwd,
                createdAt: data.createdAt,
                status: data.status,
              }));
              dispatch(setLoading(false));
              break;

            case 'command_executed':
              dispatch(addCommand({
                id: generateId(),
                sessionId: data.sessionId,
                command: data.command,
                timestamp: Date.now(),
              }));
              break;

            case 'session_closed':
              dispatch(removeSession(data.sessionId));
              break;

            case 'sessions_list':
              dispatch(setLoading(false));
              break;

            case 'error':
              dispatch(setError(data.message));
              dispatch(setLoading(false));
              break;
          }
        }

        if (category === 'terminal_output') {
          const output: TerminalOutput = {
            sessionId: data.sessionId,
            data: data.data,
            timestamp: data.timestamp,
            type: data.type,
          };
          dispatch(addOutput(output));
        }
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch]);

  const handleCreateSession = useCallback(() => {
    if (!connected) {
      Alert.alert('错误', 'WebSocket未连接');
      return;
    }

    dispatch(setLoading(true));
    send({
      type: 'command',
      category: 'terminal',
      id: generateId(),
      timestamp: Date.now(),
      payload: {
        category: 'terminal',
        action: 'create_session',
        data: {
          name: newSessionName || 'Terminal',
          cwd: newSessionCwd || undefined,
        },
      },
    });

    setIsCreateModalVisible(false);
    setNewSessionName('');
    setNewSessionCwd('');
  }, [connected, dispatch, send, newSessionName, newSessionCwd]);

  const handleCloseSession = useCallback((sessionId: string) => {
    if (!connected) return;

    Alert.alert(
      '关闭终端',
      '确定要关闭这个终端会话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            send({
              type: 'command',
              category: 'terminal',
              id: generateId(),
              timestamp: Date.now(),
              payload: {
                category: 'terminal',
                action: 'close_session',
                data: { sessionId },
              },
            });
          },
        },
      ]
    );
  }, [connected, send]);

  const handleSendCommand = useCallback((command: string) => {
    if (!connected || !currentSessionId) return;

    send({
      type: 'command',
      category: 'terminal',
      id: generateId(),
      timestamp: Date.now(),
      payload: {
        category: 'terminal',
        action: 'execute_command',
        data: {
          sessionId: currentSessionId,
          command,
        },
      },
    });

    dispatch(addCommand({
      id: generateId(),
      sessionId: currentSessionId,
      command,
      timestamp: Date.now(),
    }));
  }, [connected, currentSessionId, send, dispatch]);

  const handleResize = useCallback((newCols: number, newRows: number) => {
    if (!connected || !currentSessionId) return;
    if (newCols === cols && newRows === rows) return;

    dispatch(setTerminalSize({ cols: newCols, rows: newRows }));

    send({
      type: 'command',
      category: 'terminal',
      id: generateId(),
      timestamp: Date.now(),
      payload: {
        category: 'terminal',
        action: 'resize',
        data: {
          sessionId: currentSessionId,
          cols: newCols,
          rows: newRows,
        },
      },
    });
  }, [connected, currentSessionId, cols, rows, send, dispatch]);

  const handleSubscribeOutput = useCallback((sessionId: string) => {
    if (!connected) return;

    send({
      type: 'command',
      category: 'terminal',
      id: generateId(),
      timestamp: Date.now(),
      payload: {
        category: 'terminal',
        action: 'subscribe_output',
        data: { sessionId },
      },
    });
  }, [connected, send]);

  const renderSessionTab = (session: TerminalSession) => {
    const isActive = session.id === currentSessionId;
    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => {
          dispatch(setCurrentSession(session.id));
          handleSubscribeOutput(session.id);
        }}
        onLongPress={() => handleCloseSession(session.id)}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
          {session.name}
        </Text>
        {isActive && <View style={styles.tabIndicator} />}
      </TouchableOpacity>
    );
  };

  const currentOutputs = currentSessionId ? outputs[currentSessionId] || [] : [];
  const currentCommands = currentSessionId ? commandHistory[currentSessionId] || [] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>终端</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusIndicator, connected ? styles.connected : styles.disconnected]} />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsCreateModalVisible(true)}
            disabled={!connected}
          >
            <Text style={[styles.addButtonText, !connected && styles.addButtonTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sessions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {sessions.map(renderSessionTab)}
        </ScrollView>
      )}

      {currentSession ? (
        <View style={styles.terminalWrapper}>
          <Terminal
            sessionId={currentSessionId!}
            outputs={currentOutputs}
            commands={currentCommands}
            onSendCommand={handleSendCommand}
            onResize={handleResize}
            disabled={!connected || loading}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>没有活动的终端会话</Text>
          <Text style={styles.emptySubtitle}>
            点击右上角的 + 按钮创建新终端
          </Text>
          {!connected && (
            <Text style={styles.emptyWarning}>WebSocket未连接</Text>
          )}
        </View>
      )}

      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新建终端</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="终端名称 (可选)"
              value={newSessionName}
              onChangeText={setNewSessionName}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="工作目录 (可选)"
              value={newSessionCwd}
              onChangeText={setNewSessionCwd}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setIsCreateModalVisible(false);
                  setNewSessionName('');
                  setNewSessionCwd('');
                }}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCreateSession}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  connected: {
    backgroundColor: Colors.success,
  },
  disconnected: {
    backgroundColor: Colors.danger,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    lineHeight: 24,
  },
  addButtonTextDisabled: {
    opacity: 0.5,
  },
  tabsContainer: {
    maxHeight: 44,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.light.background,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  terminalWrapper: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyWarning: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.background,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalButtonTextConfirm: {
    color: 'white',
  },
});
