import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../state/store';
import {
  updateNotificationSettings,
  syncNotificationSettings,
  resetSyncStatus,
  setTheme,
  setFontSize,
  updateConnectionSettings,
  ConnectionSettings,
  addQuickCommand,
  removeQuickCommand,
  updateQuickCommand,
  QuickCommand as QuickCommandType
} from '../state/slices/settingsSlice';
import { NotificationSettings } from '../../../shared/types/notification';
import { Colors } from '../constants/colors';
import authService from '../services/auth/authService';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { ServerManager, PairedServer } from '../components/settings/ServerManager';
import { QuickCommandManager, QuickCommandForm, QuickCommand as QuickCommandComponent } from '../components/settings/QuickCommandManager';
import { NotificationSettingItem, SectionHeader } from '../components/settings/NotificationSettings';

interface QuickCommandFormData {
  id?: string;
  name: string;
  command: string;
  category: 'terminal' | 'ai';
}

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const notifications = useSelector((state: RootState) => state.settings.notifications);
  const syncStatus = useSelector((state: RootState) => state.settings.syncStatus);
  const syncError = useSelector((state: RootState) => state.settings.syncError);
  const theme = useSelector((state: RootState) => state.settings.theme);
  const fontSize = useSelector((state: RootState) => state.settings.fontSize);
  const connection = useSelector((state: RootState) => state.settings.connection);
  const quickCommands = useSelector((state: RootState) => state.settings.quickCommands);
  const [pairedServers, setPairedServers] = useState<PairedServer[]>([]);
  const [activeServer, setActiveServer] = useState<PairedServer | null>(null);
  const [showQuickCommandForm, setShowQuickCommandForm] = useState(false);
  const [editingQuickCommand, setEditingQuickCommand] = useState<QuickCommandFormData>({
    name: '',
    command: '',
    category: 'terminal'
  });

  useEffect(() => {
    loadData();
  }, []);

  const checkServerConnection = async (serverUrl: string): Promise<'online' | 'offline' | 'checking'> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/api/auth/validate`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok ? 'online' : 'offline';
    } catch (error) {
      return 'offline';
    }
  };

  const loadData = async () => {
    const servers = await authService.getPairedServers();
    
    const active = await authService.getActiveServer();
    if (active) {
      const activeStatus = await checkServerConnection(active.serverUrl);
      setActiveServer({ ...active, connectionStatus: activeStatus });
      
      const serversWithStatus = await Promise.all(
        servers.map(async (server) => {
          if (server.id === active.id) {
            return { ...server, connectionStatus: activeStatus };
          }
          return server;
        })
      );
      
      setPairedServers(serversWithStatus);
    } else {
      setPairedServers(servers);
      setActiveServer(null);
    }
  };

  const handleUpdateNotification = async (key: keyof NotificationSettings, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
    
    const newSettings = { ...notifications, [key]: value };
    dispatch(syncNotificationSettings(newSettings));
  };

  const handleSwitchServer = async (server: PairedServer) => {
    Alert.alert(
      '确认切换',
      `确定要切换到 ${server.serverName || server.serverUrl} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '切换',
          onPress: async () => {
            try {
              await authService.setActiveServer(server.id);
              await loadData();
              Alert.alert('成功', '已切换到新的服务器');
            } catch (err) {
              Alert.alert('错误', '切换服务器失败');
            }
          }
        }
      ]
    );
  };

  const handleRemoveServer = async (serverId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个服务器吗？删除后需要重新配对才能使用。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.removePairedServer(serverId);
              await loadData();
            } catch (err) {
              Alert.alert('错误', '删除服务器失败');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '确认退出',
      '确定要退出当前账号吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Scan');
          }
        }
      ]
    );
  };

  const handleLogoutFromAll = () => {
    Alert.alert(
      '确认退出所有账号',
      '确定要退出所有已配对的服务器吗？这将清除所有配对信息。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出所有',
          style: 'destructive',
          onPress: async () => {
            await authService.logoutFromAll();
            navigation.replace('Scan');
          }
        }
      ]
    );
  };

  const handleAddQuickCommand = () => {
    setEditingQuickCommand({ name: '', command: '', category: 'terminal' });
    setShowQuickCommandForm(true);
  };

  const handleEditQuickCommand = (command: QuickCommandComponent) => {
    setEditingQuickCommand({ ...command });
    setShowQuickCommandForm(true);
  };

  const handleSaveQuickCommand = () => {
    if (!editingQuickCommand.name.trim() || !editingQuickCommand.command.trim()) {
      Alert.alert('错误', '名称和命令不能为空');
      return;
    }

    if (editingQuickCommand.id) {
      dispatch(updateQuickCommand(editingQuickCommand as QuickCommandType));
    } else {
      dispatch(addQuickCommand({
        ...editingQuickCommand,
        id: Date.now().toString()
      } as QuickCommandType));
    }

    setShowQuickCommandForm(false);
  };

  const handleDeleteQuickCommand = (commandId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个快捷指令吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            dispatch(removeQuickCommand(commandId));
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ServerManager
          pairedServers={pairedServers}
          activeServer={activeServer}
          onSwitchServer={handleSwitchServer}
          onRemoveServer={handleRemoveServer}
          onAddServer={() => navigation.navigate('Scan')}
        />

        <SectionHeader title="通知设置" />
        
        {syncStatus === 'loading' && (
          <View style={styles.syncStatusContainer}>
            <Text style={styles.syncStatusText}>正在同步设置...</Text>
          </View>
        )}
        
        {syncStatus === 'succeeded' && (
          <View style={[styles.syncStatusContainer, styles.syncStatusSuccess]}>
            <Text style={styles.syncStatusText}>设置同步成功</Text>
          </View>
        )}
        
        {syncStatus === 'failed' && syncError && (
          <View style={[styles.syncStatusContainer, styles.syncStatusError]}>
            <Text style={styles.syncStatusText}>同步失败: {syncError}</Text>
            <TouchableOpacity onPress={() => dispatch(resetSyncStatus())}>
              <Text style={styles.retryButton}>重试</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <NotificationSettingItem
          title="启用通知"
          description="开启或关闭所有应用通知"
          value={notifications.enabled}
          onValueChange={(value) => handleUpdateNotification('enabled', value)}
        />

        <SectionHeader title="通知类型设置" />
        
        <NotificationSettingItem
          title="信息通知"
          description="当有信息提示时发送通知"
          value={notifications.info}
          onValueChange={(value) => handleUpdateNotification('info', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="成功通知"
          description="当操作成功时发送通知"
          value={notifications.success}
          onValueChange={(value) => handleUpdateNotification('success', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="警告通知"
          description="当有警告时发送通知"
          value={notifications.warning}
          onValueChange={(value) => handleUpdateNotification('warning', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="错误通知"
          description="当发生错误时发送通知"
          value={notifications.error}
          onValueChange={(value) => handleUpdateNotification('error', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="任务完成通知"
          description="当任务成功完成时发送通知"
          value={notifications.taskCompleted}
          onValueChange={(value) => handleUpdateNotification('taskCompleted', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="任务失败通知"
          description="当任务执行失败时发送通知"
          value={notifications.taskFailed}
          onValueChange={(value) => handleUpdateNotification('taskFailed', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="提及通知"
          description="当有人在对话或评论中@您时"
          value={notifications.mention}
          onValueChange={(value) => handleUpdateNotification('mention', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="文件变更通知"
          description="当文件发生变化时发送通知"
          value={notifications.fileChange}
          onValueChange={(value) => handleUpdateNotification('fileChange', value)}
          disabled={!notifications.enabled}
        />

        <NotificationSettingItem
          title="终端输出通知"
          description="当终端有输出时发送通知"
          value={notifications.terminalOutput}
          onValueChange={(value) => handleUpdateNotification('terminalOutput', value)}
          disabled={!notifications.enabled}
        />

        <SectionHeader title="连接设置" />
        <NotificationSettingItem
          title="自动重连"
          description="断开连接时自动尝试重新连接"
          value={connection.autoReconnect}
          onValueChange={(value) => dispatch(updateConnectionSettings({ autoReconnect: value }))}
        />
        <NotificationSettingItem
          title="使用 SSL"
          description="使用安全连接连接服务器"
          value={connection.useSSL}
          onValueChange={(value) => dispatch(updateConnectionSettings({ useSSL: value }))}
        />

        <SectionHeader title="外观设置" />
        <AppearanceSettings
          theme={theme}
          fontSize={fontSize}
          onThemeChange={(newTheme) => dispatch(setTheme(newTheme))}
          onFontSizeChange={(newSize) => dispatch(setFontSize(newSize))}
        />

        <QuickCommandManager
          quickCommands={quickCommands}
          onAdd={handleAddQuickCommand}
          onEdit={handleEditQuickCommand}
          onDelete={handleDeleteQuickCommand}
        />

        <SectionHeader title="账号管理" />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>退出当前账号</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logoutButton, styles.logoutAllButton]}
          onPress={handleLogoutFromAll}
        >
          <Text style={[styles.logoutButtonText, styles.logoutAllButtonText]}>
            退出所有账号
          </Text>
        </TouchableOpacity>

        <SectionHeader title="关于" />
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>版本</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>开发者</Text>
          <Text style={styles.aboutValue}>Trae Team</Text>
        </View>
      </ScrollView>

      <QuickCommandForm
        visible={showQuickCommandForm}
        editingCommand={editingQuickCommand}
        onClose={() => setShowQuickCommandForm(false)}
        onSave={handleSaveQuickCommand}
        onUpdate={setEditingQuickCommand}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  syncStatusSuccess: {
    backgroundColor: Colors.successLight,
  },
  syncStatusError: {
    backgroundColor: Colors.errorLight,
  },
  syncStatusText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  retryButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutAllButton: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutAllButtonText: {
    color: Colors.danger,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  aboutLabel: {
    fontSize: 16,
    color: Colors.light.text,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});
