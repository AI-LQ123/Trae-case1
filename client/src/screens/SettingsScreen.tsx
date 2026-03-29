import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput
} from 'react-native';
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
  QuickCommand
} from '../state/slices/settingsSlice';
import { NotificationSettings } from '../../../shared/types/notification';
import { Colors } from '../constants/colors';
import authService from '../services/auth/authService';

interface PairedServer {
  id: string;
  serverUrl: string;
  serverName?: string;
  token: string;
  refreshToken: string;
  deviceId: string;
  pairedAt: number;
  isActive: boolean;
  connectionStatus?: 'online' | 'offline' | 'checking';
}

interface NotificationSettingItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const NotificationSettingItem: React.FC<NotificationSettingItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingTextContainer}>
      <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
      <Text style={[styles.settingDescription, disabled && styles.disabledText]}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.light.border, true: Colors.primary }}
      thumbColor="#FFFFFF"
      disabled={disabled}
    />
  </View>
);

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

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
      // 发送简单的请求来检查服务器连接，使用 AbortController 实现超时
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
    
    // 检查每个服务器的连接状态
    const serversWithStatus = await Promise.all(
      servers.map(async (server) => {
        const connectionStatus = await checkServerConnection(server.serverUrl);
        return { ...server, connectionStatus };
      })
    );
    
    setPairedServers(serversWithStatus);
    
    const active = await authService.getActiveServer();
    if (active) {
      const activeStatus = await checkServerConnection(active.serverUrl);
      setActiveServer({ ...active, connectionStatus: activeStatus });
    } else {
      setActiveServer(null);
    }
  };

  const handleUpdateNotification = async (key: keyof NotificationSettings, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
    
    // 同步到服务端
    const newSettings = { ...notifications, [key]: value };
    dispatch(syncNotificationSettings(newSettings));
  };

  const formatPairedAt = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(newTheme));
  };

  const handleFontSizeChange = (newSize: number) => {
    dispatch(setFontSize(newSize));
  };

  const handleConnectionSettingChange = (key: keyof ConnectionSettings, value: any) => {
    dispatch(updateConnectionSettings({ [key]: value }));
  };

  const handleAddQuickCommand = () => {
    setEditingQuickCommand({ name: '', command: '', category: 'terminal' });
    setShowQuickCommandForm(true);
  };

  const handleEditQuickCommand = (command: QuickCommand) => {
    setEditingQuickCommand({ ...command });
    setShowQuickCommandForm(true);
  };

  const handleSaveQuickCommand = () => {
    if (!editingQuickCommand.name.trim() || !editingQuickCommand.command.trim()) {
      Alert.alert('错误', '名称和命令不能为空');
      return;
    }

    if (editingQuickCommand.id) {
      dispatch(updateQuickCommand(editingQuickCommand as QuickCommand));
    } else {
      dispatch(addQuickCommand({
        ...editingQuickCommand,
        id: Date.now().toString()
      } as QuickCommand));
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

  const renderServerItem = ({ item }: { item: PairedServer }) => (
    <View style={styles.serverItem}>
      <View style={styles.serverInfo}>
        <Text style={styles.serverUrl} numberOfLines={1}>
          {item.serverName || item.serverUrl}
        </Text>
        <Text style={styles.serverDetails}>
          配对时间: {formatPairedAt(item.pairedAt)}
        </Text>
        <View style={styles.connectionStatusContainer}>
          <View style={[
            styles.connectionStatusIndicator,
            item.connectionStatus === 'online' && styles.statusOnline,
            item.connectionStatus === 'offline' && styles.statusOffline
          ]} />
          <Text style={styles.connectionStatusText}>
            {item.connectionStatus === 'online' ? '在线' : 
             item.connectionStatus === 'offline' ? '离线' : '检查中'}
          </Text>
        </View>
        {item.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>当前使用</Text>
          </View>
        )}
      </View>
      <View style={styles.serverActions}>
        {!item.isActive && (
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => handleSwitchServer(item)}
          >
            <Text style={styles.switchButtonText}>切换</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveServer(item.id)}
        >
          <Text style={styles.removeButtonText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuickCommandItem = ({ item }: { item: QuickCommand }) => (
    <View style={styles.quickCommandItem}>
      <View style={styles.quickCommandInfo}>
        <Text style={styles.quickCommandName}>{item.name}</Text>
        <Text style={styles.quickCommandText} numberOfLines={1}>{item.command}</Text>
        <Text style={styles.quickCommandCategory}>
          {item.category === 'terminal' ? '终端' : 'AI'}
        </Text>
      </View>
      <View style={styles.quickCommandActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditQuickCommand(item)}
        >
          <Text style={styles.editButtonText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteQuickCommand(item.id)}
        >
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ThemeOption = ({ value, label, selected }: { value: string; label: string; selected: boolean }) => (
    <TouchableOpacity
      style={[styles.themeOption, selected && styles.themeOptionSelected]}
      onPress={() => handleThemeChange(value as 'light' | 'dark' | 'system')}
    >
      <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
        {label}
      </Text>
      {selected && <View style={styles.themeCheckmark} />}
    </TouchableOpacity>
  );

  const FontSizeOption = ({ value, label }: { value: number; label: string }) => (
    <TouchableOpacity
      style={[styles.fontSizeOption, fontSize === value && styles.fontSizeOptionSelected]}
      onPress={() => handleFontSizeChange(value)}
    >
      <Text style={[styles.fontSizeOptionText, { fontSize: value }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeServer && (
          <>
            <SectionHeader title="当前服务器" />
            <View style={styles.currentServerCard}>
              <Text style={styles.currentServerUrl}>
                {activeServer.serverName || activeServer.serverUrl}
              </Text>
              <Text style={styles.currentServerDetails}>
                配对时间: {formatPairedAt(activeServer.pairedAt)}
              </Text>
              <View style={styles.connectionStatusContainer}>
                <View style={[
                  styles.connectionStatusIndicator,
                  activeServer.connectionStatus === 'online' && styles.statusOnline,
                  activeServer.connectionStatus === 'offline' && styles.statusOffline
                ]} />
                <Text style={styles.connectionStatusText}>
                  {activeServer.connectionStatus === 'online' ? '在线' : 
                   activeServer.connectionStatus === 'offline' ? '离线' : '检查中'}
                </Text>
              </View>
            </View>
          </>
        )}

        <SectionHeader title="已配对的服务器" />
        {pairedServers.length > 0 ? (
          <FlatList
            data={pairedServers}
            renderItem={renderServerItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.serverList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无已配对的服务器</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.addServerButton}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.addServerButtonText}>添加新服务器</Text>
        </TouchableOpacity>

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

        <SectionHeader title="外观设置" />
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>主题</Text>
          <View style={styles.themeOptions}>
            <ThemeOption value="light" label="浅色" selected={theme === 'light'} />
            <ThemeOption value="dark" label="深色" selected={theme === 'dark'} />
            <ThemeOption value="system" label="跟随系统" selected={theme === 'system'} />
          </View>
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>字体大小</Text>
          <View style={styles.fontSizeOptions}>
            <FontSizeOption value={12} label="小" />
            <FontSizeOption value={14} label="中" />
            <FontSizeOption value={16} label="大" />
            <FontSizeOption value={18} label="特大" />
          </View>
        </View>

        <SectionHeader title="连接设置" />
        <NotificationSettingItem
          title="自动重连"
          description="断开连接时自动尝试重新连接"
          value={connection.autoReconnect}
          onValueChange={(value) => handleConnectionSettingChange('autoReconnect', value)}
        />
        <NotificationSettingItem
          title="使用 SSL"
          description="使用安全连接连接服务器"
          value={connection.useSSL}
          onValueChange={(value) => handleConnectionSettingChange('useSSL', value)}
        />

        <SectionHeader title="快捷指令" />
        <FlatList
          data={quickCommands}
          renderItem={renderQuickCommandItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.quickCommandList}
        />
        <TouchableOpacity
          style={styles.addQuickCommandButton}
          onPress={handleAddQuickCommand}
        >
          <Text style={styles.addQuickCommandButtonText}>添加快捷指令</Text>
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

      {showQuickCommandForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingQuickCommand.id ? '编辑快捷指令' : '添加快捷指令'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="指令名称"
              value={editingQuickCommand.name}
              onChangeText={(text) => setEditingQuickCommand({ ...editingQuickCommand, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="命令内容"
              value={editingQuickCommand.command}
              onChangeText={(text) => setEditingQuickCommand({ ...editingQuickCommand, command: text })}
            />
            <View style={styles.categoryOptions}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  editingQuickCommand.category === 'terminal' && styles.categoryOptionSelected
                ]}
                onPress={() => setEditingQuickCommand({ ...editingQuickCommand, category: 'terminal' })}
              >
                <Text style={[
                  styles.categoryOptionText,
                  editingQuickCommand.category === 'terminal' && styles.categoryOptionTextSelected
                ]}>终端</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  editingQuickCommand.category === 'ai' && styles.categoryOptionSelected
                ]}
                onPress={() => setEditingQuickCommand({ ...editingQuickCommand, category: 'ai' })}
              >
                <Text style={[
                  styles.categoryOptionText,
                  editingQuickCommand.category === 'ai' && styles.categoryOptionTextSelected
                ]}>AI</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowQuickCommandForm(false)}
              >
                <Text style={styles.modalButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveQuickCommand}
              >
                <Text style={styles.modalButtonSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  sectionHeader: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  disabledText: {
    opacity: 0.5,
  },
  currentServerCard: {
    backgroundColor: '#e8f4ff',
    padding: 15,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentServerUrl: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 5,
  },
  currentServerDetails: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  serverList: {
    marginBottom: 12,
  },
  serverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  serverInfo: {
    flex: 1,
    marginRight: 10,
  },
  serverUrl: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 5,
  },
  serverDetails: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 5,
  },
  activeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  serverActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  addServerButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addServerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutAllButton: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutAllButtonText: {
    color: '#ff3b30',
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
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  connectionStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#999',
  },
  statusOnline: {
    backgroundColor: '#34c759',
  },
  statusOffline: {
    backgroundColor: '#ff3b30',
  },
  connectionStatusText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
    backgroundColor: '#e8f5e8',
  },
  syncStatusError: {
    backgroundColor: '#ffebee',
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
  settingGroup: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingGroupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  themeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f4ff',
  },
  themeOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  themeOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  themeCheckmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontSizeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  fontSizeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f4ff',
  },
  fontSizeOptionText: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  quickCommandList: {
    marginBottom: 12,
  },
  quickCommandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  quickCommandInfo: {
    flex: 1,
    marginRight: 10,
  },
  quickCommandName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  quickCommandText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  quickCommandCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  quickCommandActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  addQuickCommandButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addQuickCommandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f4ff',
  },
  categoryOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.border,
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonCancelText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
