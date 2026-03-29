import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { TaskCard, Task } from '../components/task/TaskCard';
import { Colors } from '../constants/colors';
import {
  setActiveTasks,
  setLoading,
  updateTask,
  removeTask,
} from '../state/slices/taskSlice';
import type { RootState, AppDispatch } from '../state/store';

type FilterType = 'all' | 'active' | 'completed' | 'failed';

export const TasksScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeTasks, loading } = useSelector((state: RootState) => state.tasks);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');

  const filteredTasks = useMemo(() => {
    return activeTasks.filter(task => {
      switch (currentFilter) {
        case 'active':
          return ['pending', 'running'].includes(task.status);
        case 'completed':
          return task.status === 'completed';
        case 'failed':
          return ['failed', 'cancelled'].includes(task.status);
        default:
          return true;
      }
    });
  }, [activeTasks, currentFilter]);

  const fetchTasks = async () => {
    dispatch(setLoading(true));
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch(setLoading(false));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      dispatch(setLoading(false));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleTaskPress = useCallback((task: Task) => {
    Alert.alert(
      task.name,
      `命令: ${task.command}\n状态: ${task.status}\n进度: ${task.progress}%`,
      [{ text: '确定' }]
    );
  }, []);

  const handleCancelTask = useCallback((taskId: string) => {
    Alert.alert(
      '取消任务',
      '确定要取消这个任务吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            dispatch(updateTask({ id: taskId, status: 'cancelled' }));
          },
        },
      ]
    );
  }, [dispatch]);

  const renderFilterButton = useCallback((filter: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        currentFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setCurrentFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          currentFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  ), [currentFilter]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>暂无任务</Text>
      <Text style={styles.emptySubtitle}>
        {currentFilter === 'all'
          ? '还没有创建任何任务'
          : `当前筛选条件下没有任务`}
      </Text>
    </View>
  ), [currentFilter]);

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>任务管理</Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', '全部')}
        {renderFilterButton('active', '进行中')}
        {renderFilterButton('completed', '已完成')}
        {renderFilterButton('failed', '失败')}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={handleTaskPress}
            onCancel={handleCancelTask}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  },
});
