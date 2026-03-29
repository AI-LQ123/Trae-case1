import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../state/store';
import { updateNotificationSettings, NotificationSettings } from '../state/slices/settingsSlice';
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
}

interface NotificationSettingItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const NotificationSettingItem: React.FC<NotificationSettingItemProps> = ({
  title,
  description,
  value,
  onValueChange,
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingTextContainer}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.light.border, true: Colors.primary }}
      thumbColor="#FFFFFF"
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

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const notifications = useSelector((state: RootState) => state.settings.notifications);
  const [pairedServers, setPairedServers] = useState<PairedServer[]>([]);
  const [activeServer, setActiveServer] = useState<PairedServer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const servers = await authService.getPairedServers();
    setPairedServers(servers);
    const active = await authService.getActiveServer();
    setActiveServer(active);
  };

  const handleUpdateNotification = (key: keyof NotificationSettings, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
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

  const renderServerItem = ({ item }: { item: PairedServer }) => (
    <View style={styles.serverItem}>
      <View style={styles.serverInfo}>
        <Text style={styles.serverUrl} numberOfLines={1}>
          {item.serverName || item.serverUrl}
        </Text>
        <Text style={styles.serverDetails}>
          配对时间: {formatPairedAt(item.pairedAt)}
        </Text>
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
        
        <NotificationSettingItem
          title="启用通知"
          description="开启或关闭所有应用通知"
          value={notifications.enabled}
          onValueChange={(value) => handleUpdateNotification('enabled', value)}
        />

        {notifications.enabled && (
          <>
            <NotificationSettingItem
              title="任务完成通知"
              description="当任务成功完成时发送通知"
              value={notifications.taskCompleted}
              onValueChange={(value) => handleUpdateNotification('taskCompleted', value)}
            />

            <NotificationSettingItem
              title="任务失败通知"
              description="当任务执行失败时发送通知"
              value={notifications.taskFailed}
              onValueChange={(value) => handleUpdateNotification('taskFailed', value)}
            />

            <NotificationSettingItem
              title="错误通知"
              description="当发生错误时发送通知"
              value={notifications.errors}
              onValueChange={(value) => handleUpdateNotification('errors', value)}
            />

            <NotificationSettingItem
              title="提及通知"
              description="当被提及时发送通知"
              value={notifications.mentions}
              onValueChange={(value) => handleUpdateNotification('mentions', value)}
            />
          </>
        )}

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
});
