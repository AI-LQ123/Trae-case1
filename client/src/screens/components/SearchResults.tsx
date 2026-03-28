import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FileNode } from '../../state/slices/projectSlice';
import { Colors } from '../../constants/colors';

interface SearchResultsProps {
  results: FileNode[];
  loading: boolean;
  query: string;
  onSelectNode: (node: FileNode) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  query,
  onSelectNode,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>搜索中...</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>未找到匹配的文件</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: FileNode }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onSelectNode(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.resultName}>{item.name}</Text>
      <Text style={styles.resultPath}>{item.path}</Text>
      <Text style={styles.resultType}>
        {item.type === 'directory' ? '📁 目录' : `📄 文件`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>搜索结果: "{query}"</Text>
        <Text style={styles.count}>{results.length} 个结果</Text>
      </View>
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  count: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  listContent: {
    paddingVertical: 8,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  resultPath: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  resultType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});

export default SearchResults;
