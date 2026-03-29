import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ProgressBarAndroid, Platform, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Task, TaskStep } from '../../types/task';

export type { Task, TaskStep };

interface TaskCardProps {
  task: Task;
  onPress?: (task: Task) => void;
  onCancel?: (taskId: string) => void;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getStatusColor = (status: Task['status']): string => {
  switch (status) {
    case 'running':
      return Colors.primary;
    case 'completed':
      return Colors.success;
    case 'failed':
      return Colors.danger;
    case 'cancelled':
      return Colors.warning;
    default:
      return Colors.light.textSecondary;
  }
};

const getStatusBackgroundColor = (status: Task['status']): string => {
  return hexToRgba(getStatusColor(status), 0.12);
};

const getStatusText = (status: Task['status']): string => {
  const statusMap: Record<Task['status'], string> = {
    pending: '待处理',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

const getPriorityColor = (priority?: Task['priority']): string => {
  switch (priority) {
    case 'high':
      return Colors.danger;
    case 'medium':
      return Colors.warning;
    case 'low':
      return Colors.info;
    default:
      return 'transparent';
  }
};

const getPriorityText = (priority?: Task['priority']): string => {
  const priorityMap: Record<Task['priority'], string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return priority ? priorityMap[priority] : '';
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onCancel }) => {
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCancel = () => {
    if (onCancel && (task.status === 'running' || task.status === 'pending')) {
      onCancel(task.id);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(task)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.taskName} numberOfLines={1}>
            {task.name}
          </Text>
          {task.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={styles.priorityText}>{getPriorityText(task.priority)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(task.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
            {getStatusText(task.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.command} numberOfLines={2}>
        {task.command}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              color={getStatusColor(task.status)}
              progress={task.progress / 100}
              indeterminate={task.status === 'running' && task.progress === 0}
            />
          ) : (
            <View style={styles.iosProgressBar}>
              <View
                style={[
                  styles.iosProgressFill,
                  { width: `${Math.min(task.progress, 100)}%`, backgroundColor: getStatusColor(task.status) },
                ]}
              />
            </View>
          )}
        </View>
        <Text style={styles.progressText}>{task.progress}%</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>创建:</Text>
          <Text style={styles.timeValue}>{formatTime(task.createdAt)}</Text>
        </View>
        {task.startedAt && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>开始:</Text>
            <Text style={styles.timeValue}>{formatTime(task.startedAt)}</Text>
          </View>
        )}
        {(task.status === 'running' || task.status === 'pending') && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  command: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    marginRight: 12,
  },
  iosProgressBar: {
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  iosProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginRight: 4,
  },
  timeValue: {
    fontSize: 12,
    color: Colors.light.text,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: hexToRgba(Colors.danger, 0.12),
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.danger,
  },
});
