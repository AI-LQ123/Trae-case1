import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
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

const getFileIcon = (name: string, type: 'file' | 'directory'): string => {
  if (type === 'directory') {
    return '📁';
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

const FileTreeNode: React.FC<FileTreeProps> = ({
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

  const handleToggle = useCallback(() => {
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
      >
        <View style={styles.nodeContent}>
          {node.type === 'directory' && hasChildren && (
            <TouchableOpacity
              onPress={handleToggle}
              style={styles.expandButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
          )}
          {node.type === 'directory' && !hasChildren && (
            <View style={styles.expandButton}>
              <Text style={styles.expandIconPlaceholder}> </Text>
            </View>
          )}
          <Text style={styles.fileIcon}>{getFileIcon(node.name, node.type)}</Text>
          <Text
            style={[
              styles.nodeName,
              node.type === 'directory' && styles.directoryName,
              isSelected && styles.selectedNodeName,
            ]}
            numberOfLines={1}
          >
            {node.name}
          </Text>
        </View>
        {node.size !== undefined && node.type === 'file' && (
          <Text style={styles.fileSize}>{formatFileSize(node.size)}</Text>
        )}
      </TouchableOpacity>

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
};

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
}

export const FileTree: React.FC<FileTreeListProps> = ({
  fileTree,
  expandedNodes,
  selectedNodeId,
  onToggleNode,
  onSelectNode,
  refreshing,
  onRefresh,
}) => {
  if (!fileTree) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无文件数据</Text>
      </View>
    );
  }

  // 将树结构转换为扁平列表以便使用 FlatList
  const flattenTree = (node: FileNode, level = 0): Array<{ node: FileNode; level: number }> => {
    const result: Array<{ node: FileNode; level: number }> = [{ node, level }];
    
    if (node.type === 'directory' && node.children && expandedNodes.has(node.id)) {
      node.children.forEach((child) => {
        result.push(...flattenTree(child, level + 1));
      });
    }
    
    return result;
  };

  const flattenedData = flattenTree(fileTree);

  const renderItem = ({ item }: { item: { node: FileNode; level: number } }) => (
    <FileTreeNode
      node={item.node}
      expandedNodes={expandedNodes}
      selectedNodeId={selectedNodeId}
      onToggleNode={onToggleNode}
      onSelectNode={onSelectNode}
      level={item.level}
    />
  );

  return (
    <FlatList
      data={flattenedData}
      renderItem={renderItem}
      keyExtractor={(item) => item.node.id}
      contentContainerStyle={styles.listContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

const styles = StyleSheet.create({
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
  },
  selectedNode: {
    backgroundColor: Colors.primary + '20',
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
  },
  expandIconPlaceholder: {
    fontSize: 12,
  },
  fileIcon: {
    fontSize: 16,
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
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
});

export default FileTree;
