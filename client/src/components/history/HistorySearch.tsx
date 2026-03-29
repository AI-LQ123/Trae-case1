import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import historyManager, { HistoryType, HistoryItem } from '../../services/storage/historyManager';

interface HistorySearchProps {
  onSelectItem?: (item: HistoryItem) => void;
  placeholder?: string;
}

type FilterType = HistoryType | 'all';

const getTypeIcon = (type: HistoryType): string => {
  switch (type) {
    case HistoryType.CHAT:
      return '💬';
    case HistoryType.TASK:
      return '📋';
    case HistoryType.TERMINAL:
      return '💻';
    default:
      return '📝';
  }
};

const getTypeName = (type: HistoryType): string => {
  switch (type) {
    case HistoryType.CHAT:
      return '对话';
    case HistoryType.TASK:
      return '任务';
    case HistoryType.TERMINAL:
      return '终端';
    default:
      return '其他';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const oneMinute = 60 * 1000;
  const oneHour = 60 * oneMinute;
  const oneDay = 24 * oneHour;
  
  if (diff < oneMinute) {
    return '刚刚';
  } else if (diff < oneHour) {
    return `${Math.floor(diff / oneMinute)}分钟前`;
  } else if (diff < oneDay) {
    return `${Math.floor(diff / oneHour)}小时前`;
  } else if (diff < 7 * oneDay) {
    return `${Math.floor(diff / oneDay)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
};

const FilterButton: React.FC<{
  type: FilterType;
  selected: boolean;
  onPress: () => void;
}> = ({ type, selected, onPress }) => {
  const label = type === 'all' ? '全部' : getTypeName(type as HistoryType);
  
  return (
    <TouchableOpacity
      style={[styles.filterButton, selected && styles.selectedFilterButton]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, selected && styles.selectedFilterButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const HistoryItemCard: React.FC<{
  item: HistoryItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemType}>
          <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
          <Text style={styles.typeLabel}>{getTypeName(item.type)}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      
      <Text style={styles.itemTitle} numberOfLines={2}>
        {item.title}
      </Text>
      
      {item.preview && (
        <Text style={styles.itemPreview} numberOfLines={2}>
          {item.preview}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const HistorySearch: React.FC<HistorySearchProps> = ({
  onSelectItem,
  placeholder = '搜索历史记录...',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, searchFilter: FilterType) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const types = searchFilter === 'all' 
        ? undefined
        : [searchFilter as HistoryType];
      const searchResults = await historyManager.searchHistory(searchQuery, types);
      setResults(searchResults);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('搜索失败', '搜索历史记录时出错，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query, filter);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, filter, performSearch]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const handleClearHistory = () => {
    Alert.alert(
      '确认清除',
      '确定要清除所有历史记录吗？此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            try {
              const typeToClear = filter === 'all' ? undefined : (filter as HistoryType);
              await historyManager.clearHistory(typeToClear);
              setResults([]);
              setHasSearched(false);
              Alert.alert('已清除', '历史记录已成功清除');
            } catch (error) {
              Alert.alert('清除失败', '清除历史记录时出错');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity 
              onPress={handleClear} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={['all', HistoryType.CHAT, HistoryType.TASK, HistoryType.TERMINAL] as FilterType[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterButton
              type={item}
              selected={filter === item}
              onPress={() => handleFilterChange(item)}
            />
          )}
          contentContainerStyle={styles.filtersList}
        />
        <TouchableOpacity
          style={styles.clearHistoryButton}
          onPress={handleClearHistory}
        >
          <Text style={styles.clearHistoryText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>搜索中...</Text>
        </View>
      ) : hasSearched ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) => (
              <HistoryItemCard
                item={item}
                onPress={() => onSelectItem?.(item)}
              />
            )}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>没有找到匹配的历史记录</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyText}>输入关键词搜索历史记录</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: Colors.light.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: Colors.light.text,
  },
  clearIcon: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filtersList: {
    flexGrow: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    marginRight: 8,
  },
  selectedFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  selectedFilterButtonText: {
    color: '#FFFFFF',
  },
  clearHistoryButton: {
    padding: 8,
  },
  clearHistoryText: {
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultsList: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  itemPreview: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});

export default HistorySearch;
