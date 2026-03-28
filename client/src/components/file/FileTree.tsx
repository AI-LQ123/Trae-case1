import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FileNode } from '../../state/slices/projectSlice';
import { Colors } from '../../constants/colors';

interface FileTreeProps {
  node: FileNode;
  expandedNodes: Set<string>;
  selectedNodeId?: string | null;
  onToggleNode: (nodeId: string) => void;
  onSelectNode: (node: FileNode) => void;
  level?: number;
}

// 文件图标映射
const getFileIcon = (name: string, type: 'file' | 'directory', isExpanded?: boolean): string => {
  if (type === 'directory') {
    return isExpanded ? '📂' : '📁';
  }

  const extension = name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    js: '📄',
    jsx: '⚛️',
    ts: '📘',
    tsx: '⚛️',
    json: '📋',
    md: '📝',
    css: '🎨',
    scss: '🎨',
    html: '🌐',
    py: '🐍',
    java: '☕',
    go: '🔵',
    rs: '🦀',
    cpp: '⚙️',
    c: '⚙️',
    h: '📐',
    sql: '🗄️',
    yml: '⚙️',
    yaml: '⚙️',
    xml: '📰',
    svg: '🖼️',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    pdf: '📕',
    zip: '📦',
    tar: '📦',
    gz: '📦',
    log: '📜',
    gitignore: '🚫',
    env: '🔐',
    dockerfile: '🐳',
  };

  return iconMap[extension || ''] || '📄';
};

// 骨架屏组件
const SkeletonItem: React.FC<{ level?: number }> = ({ level = 0 }) => (
  <View style={[styles.skeletonContainer, { paddingLeft: 16 + level * 20 }]}>
    <View style={styles.skeletonIcon} />
    <View style={styles.skeletonText} />
  </View>
);

// 单个文件树节点组件
const FileTreeNode: React.FC<FileTreeProps> = memo(({
  node,
  expandedNodes,
  selectedNodeId,
  onToggleNode,
  onSelectNode,
  level = 0,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.type === 'directory' && node.children && node.children.length > 0;

  const handlePress = useCallback(() => {
    if (node.type === 'directory') {
      onToggleNode(node.id);
    }
    onSelectNode(node);
  }, [node, onToggleNode, onSelectNode]);

  const handleToggle = useCallback((e: any) => {
    e.stopPropagation();
    onToggleNode(node.id);
  }, [node.id, onToggleNode]);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.nodeContainer,
          { paddingLeft: 16 + level * 20 },
          isSelected && styles.selectedNode,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        <View style={styles.nodeContent}>
          {/* 展开/折叠指示器 */}
          {node.type === 'directory' && (
            <TouchableOpacity
              onPress={handleToggle}
              style={styles.expandButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.expandIcon}>
                {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
              </Text>
            </TouchableOpacity>
          )}
          {node.type === 'file' && <View style={styles.expandButton} />}

          {/* 文件/文件夹图标 */}
          <Text style={styles.fileIcon}>
            {getFileIcon(node.name, node.type, isExpanded)}
          </Text>

          {/* 文件名 */}
          <Text
            style={[
              styles.nodeName,
              node.type === 'directory' && styles.directoryName,
              isSelected && styles.selectedNodeName,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {node.name}
          </Text>
        </View>

        {/* 文件大小 */}
        {node.size !== undefined && node.type === 'file' && (
          <Text style={styles.fileSize}>{formatFileSize(node.size)}</Text>
        )}
      </TouchableOpacity>

      {/* 递归渲染子节点 */}
      {isExpanded && hasChildren && (
        <View>
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              onToggleNode={onToggleNode}
              onSelectNode={onSelectNode}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
});

FileTreeNode.displayName = 'FileTreeNode';

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface FileTreeListProps {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  selectedNodeId?: string | null;
  onToggleNode: (nodeId: string) => void;
  onSelectNode: (node: FileNode) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

// 将树结构扁平化以便使用 FlatList
const flattenTree = (
  node: FileNode,
  expandedNodes: Set<string>,
  level = 0
): Array<{ node: FileNode; level: number }> => {
  const result: Array<{ node: FileNode; level: number }> = [{ node, level }];

  if (node.type === 'directory' && node.children && expandedNodes.has(node.id)) {
    node.children.forEach((child) => {
      result.push(...flattenTree(child, expandedNodes, level + 1));
    });
  }

  return result;
};

export const FileTree: React.FC<FileTreeListProps> = memo(({
  fileTree,
  expandedNodes,
  selectedNodeId,
  onToggleNode,
  onSelectNode,
  refreshing,
  onRefresh,
  loading,
}) => {
  // 加载状态显示骨架屏
  if (loading) {
    return (
      <View style={styles.container}>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonItem key={i} level={i % 3} />
        ))}
      </View>
    );
  }

  // 空状态
  if (!fileTree) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyText}>暂无文件数据</Text>
        <Text style={styles.emptySubtext}>请检查网络连接或刷新重试</Text>
      </View>
    );
  }

  // 扁平化数据
  const flattenedData = flattenTree(fileTree, expandedNodes);

  const renderItem = useCallback(({ item }: { item: { node: FileNode; level: number } }) => (
    <FileTreeNode
      node={item.node}
      expandedNodes={expandedNodes}
      selectedNodeId={selectedNodeId}
      onToggleNode={onToggleNode}
      onSelectNode={onSelectNode}
      level={item.level}
    />
  ), [expandedNodes, selectedNodeId, onToggleNode, onSelectNode]);

  const keyExtractor = useCallback((item: { node: FileNode; level: number }) =>
    `${item.node.id}-${item.level}`,
    []
  );

  return (
    <FlatList
      data={flattenedData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
});

FileTree.displayName = 'FileTree';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  selectedNode: {
    backgroundColor: Colors.primary + '15',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  fileIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  nodeName: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  directoryName: {
    fontWeight: '600',
  },
  selectedNodeName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    opacity: 0.7,
  },
  // 骨架屏样式
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: Colors.light.border,
    marginRight: 8,
  },
  skeletonText: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: Colors.light.border,
  },
});

export default FileTree;
