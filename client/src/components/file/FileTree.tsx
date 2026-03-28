import React, { useCallback, memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
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
  onRename?: (node: FileNode, newName: string) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parent: FileNode, fileName: string) => void;
  onCreateDirectory?: (parent: FileNode, dirName: string) => void;
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

// 操作菜单组件
interface ActionMenuProps {
  visible: boolean;
  node: FileNode | null;
  onClose: () => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onCreateFile: (node: FileNode) => void;
  onCreateDirectory: (node: FileNode) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  node,
  onClose,
  onRename,
  onDelete,
  onCreateFile,
  onCreateDirectory,
}) => {
  if (!node) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>{node.name}</Text>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onRename(node);
              onClose();
            }}
          >
            <Text style={styles.menuItemText}>重命名</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onDelete(node);
              onClose();
            }}
          >
            <Text style={[styles.menuItemText, styles.dangerText]}>删除</Text>
          </TouchableOpacity>
          {node.type === 'directory' && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onCreateFile(node);
                  onClose();
                }}
              >
                <Text style={styles.menuItemText}>新建文件</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onCreateDirectory(node);
                  onClose();
                }}
              >
                <Text style={styles.menuItemText}>新建文件夹</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onClose}>
            <Text style={styles.menuItemText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// 重命名对话框
interface RenameDialogProps {
  visible: boolean;
  node: FileNode | null;
  onClose: () => void;
  onRename: (node: FileNode, newName: string) => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  visible,
  node,
  onClose,
  onRename,
}) => {
  const [newName, setNewName] = useState(node?.name || '');

  if (!node) return null;

  const handleRename = () => {
    if (newName.trim()) {
      onRename(node, newName.trim());
      onClose();
    } else {
      Alert.alert('错误', '文件名不能为空');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>重命名</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="输入新名称"
            autoFocus
          />
          <View style={styles.dialogButtons}>
            <TouchableOpacity style={styles.dialogButton} onPress={onClose}>
              <Text style={styles.dialogButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.primaryButton]}
              onPress={handleRename}
            >
              <Text style={[styles.dialogButtonText, styles.primaryButtonText]}>
                确定
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// 新建文件/文件夹对话框
interface CreateDialogProps {
  visible: boolean;
  parent: FileNode | null;
  type: 'file' | 'directory';
  onClose: () => void;
  onCreate: (parent: FileNode, name: string) => void;
}

const CreateDialog: React.FC<CreateDialogProps> = ({
  visible,
  parent,
  type,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');

  if (!parent) return null;

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(parent, name.trim());
      onClose();
    } else {
      Alert.alert('错误', '名称不能为空');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>
            新建{type === 'file' ? '文件' : '文件夹'}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={`输入${type === 'file' ? '文件' : '文件夹'}名称`}
            autoFocus
          />
          <View style={styles.dialogButtons}>
            <TouchableOpacity style={styles.dialogButton} onPress={onClose}>
              <Text style={styles.dialogButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.primaryButton]}
              onPress={handleCreate}
            >
              <Text style={[styles.dialogButtonText, styles.primaryButtonText]}>
                创建
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// 单个文件树节点组件
const FileTreeNode: React.FC<FileTreeProps> = memo(({
  node,
  expandedNodes,
  selectedNodeId,
  onToggleNode,
  onSelectNode,
  level = 0,
  onRename,
  onDelete,
  onCreateFile,
  onCreateDirectory,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'directory'>('file');

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

  const handleLongPress = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleRename = useCallback(() => {
    setShowRenameDialog(true);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${node.name} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDelete?.(node),
        },
      ]
    );
  }, [node, onDelete]);

  const handleCreateFile = useCallback(() => {
    setCreateType('file');
    setShowCreateDialog(true);
  }, []);

  const handleCreateDirectory = useCallback(() => {
    setCreateType('directory');
    setShowCreateDialog(true);
  }, []);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.nodeContainer,
          { paddingLeft: 16 + level * 20 },
          isSelected && styles.selectedNode,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
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
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onCreateDirectory={onCreateDirectory}
            />
          ))}
        </View>
      )}

      {/* 操作菜单 */}
      <ActionMenu
        visible={showMenu}
        node={node}
        onClose={() => setShowMenu(false)}
        onRename={handleRename}
        onDelete={handleDelete}
        onCreateFile={handleCreateFile}
        onCreateDirectory={handleCreateDirectory}
      />

      {/* 重命名对话框 */}
      <RenameDialog
        visible={showRenameDialog}
        node={node}
        onClose={() => setShowRenameDialog(false)}
        onRename={onRename!}
      />

      {/* 新建对话框 */}
      <CreateDialog
        visible={showCreateDialog}
        parent={node}
        type={createType}
        onClose={() => setShowCreateDialog(false)}
        onCreate={createType === 'file' ? onCreateFile! : onCreateDirectory!}
      />
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
  onRename?: (node: FileNode, newName: string) => void;
  onDelete?: (node: FileNode) => void;
  onCreateFile?: (parent: FileNode, fileName: string) => void;
  onCreateDirectory?: (parent: FileNode, dirName: string) => void;
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
  onRename,
  onDelete,
  onCreateFile,
  onCreateDirectory,
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

  const renderItem = useCallback(
    ({ item }: { item: { node: FileNode; level: number } }) => (
      <FileTreeNode
        node={item.node}
        expandedNodes={expandedNodes}
        selectedNodeId={selectedNodeId}
        onToggleNode={onToggleNode}
        onSelectNode={onSelectNode}
        level={item.level}
        onRename={onRename}
        onDelete={onDelete}
        onCreateFile={onCreateFile}
        onCreateDirectory={onCreateDirectory}
      />
    ),
    [expandedNodes, selectedNodeId, onToggleNode, onSelectNode, onRename, onDelete, onCreateFile, onCreateDirectory]
  );

  const keyExtractor = useCallback(
    (item: { node: FileNode; level: number }) => `${item.node.id}-${item.level}`,
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
      updateCellsBatchingPeriod={100}
      getItemLayout={(_data, index) => ({
        length: 50, // 估计行高
        offset: 50 * index,
        index,
      })}
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
  // 操作菜单样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // 适配底部安全区域
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    paddingVertical: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
  dangerText: {
    color: Colors.danger,
  },
  // 对话框样式
  dialogContainer: {
    backgroundColor: Colors.light.surface,
    marginHorizontal: 40,
    borderRadius: 12,
    padding: 20,
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    marginLeft: 12,
  },
  dialogButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FileTree;
