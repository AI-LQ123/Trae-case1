import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface ProjectHeaderProps {
  connected: boolean;
  refreshing: boolean;
  onToggleSearch: () => void;
  onRefresh: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  connected,
  refreshing,
  onToggleSearch,
  onRefresh,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>项目文件</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              connected ? styles.connectedStatus : styles.disconnectedStatus,
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? '已连接' : '未连接'}
          </Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onToggleSearch}
        >
          <Text style={styles.headerButtonText}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={[styles.headerButtonText, refreshing && styles.disabledText]}>
            {refreshing ? '⏳' : '🔄'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginRight: 12,
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
    backgroundColor: Colors.success,
  },
  disconnectedStatus: {
    backgroundColor: Colors.danger,
  },
  statusText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerButtonText: {
    fontSize: 18,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default ProjectHeader;
