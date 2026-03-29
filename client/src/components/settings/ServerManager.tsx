import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Colors } from '../../constants/colors';

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

interface ServerManagerProps {
  pairedServers: PairedServer[];
  activeServer: PairedServer | null;
  onSwitchServer: (server: PairedServer) => void;
  onRemoveServer: (serverId: string) => void;
  onAddServer: () => void;
}

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

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

const renderServerItem = (
  item: PairedServer,
  onSwitchServer: (server: PairedServer) => void,
  onRemoveServer: (serverId: string) => void
) => (
  <View style={styles.serverItem} key={item.id}>
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
          onPress={() => onSwitchServer(item)}
        >
          <Text style={styles.switchButtonText}>切换</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemoveServer(item.id)}
      >
        <Text style={styles.removeButtonText}>删除</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const ServerManager: React.FC<ServerManagerProps> = ({
  pairedServers,
  activeServer,
  onSwitchServer,
  onRemoveServer,
  onAddServer
}) => {
  return (
    <View>
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
          renderItem={({ item }) => renderServerItem(item, onSwitchServer, onRemoveServer)}
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
        onPress={onAddServer}
      >
        <Text style={styles.addServerButtonText}>添加新服务器</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
  currentServerCard: {
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.danger,
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
    backgroundColor: Colors.statusOnline,
  },
  statusOffline: {
    backgroundColor: Colors.statusOffline,
  },
  connectionStatusText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
