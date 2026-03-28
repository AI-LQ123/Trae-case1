import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FileTree } from '../components/file/FileTree';
import { FileViewer } from '../components/file/FileViewer';
import { FileNode } from '../state/slices/projectSlice';
import {
  toggleNode,
  setSelectedNodeId,
  setCurrentFile,
  setSearchQuery,
  clearSearch,
  expandAll,
  collapseAll,
  fetchFileTree,
  fetchFileContent,
  searchFiles,
  setFileTree,
  setFileContent,
  setFileLoading,
} from '../state/slices/projectSlice';
import { RootState } from '../state/store';
import { Colors } from '../constants/colors';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketMessage } from '../services/websocket/WebSocketClient';

// API 基础 URL
const API_BASE_URL = 'http://localhost:3000/api';

// 项目路径配置
const PROJECT_PATH = '/project';

export const ProjectScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { connected, send, getClient } = useWebSocket();

  const {
    fileTree,
    expandedNodes,
    selectedNodeId,
    currentFile,
    fileContent,
    fileLoading,
    searchQuery,
    searchResults,
    searchLoading,
    loading,
    error,
  } = useSelector((state: RootState) => state.project);

  const [showSearch, setShowSearch] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [projectPath, setProjectPath] = useState(PROJECT_PATH);

  // 加载文件树
  const loadFileTree = useCallback(async () => {
    if (!connected) {
      Alert.alert('提示', '未连接到服务器，请先连接');
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/project/file-tree?path=${encodeURIComponent(projectPath)}&maxDepth=3`,
        {
          headers: {
            'Authorization': `Bearer ${getClient?.() || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        dispatch(setFileTree(data.data));
      } else {
        throw new Error(data.error || 'Failed to load file tree');
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
      Alert.alert('错误', '加载文件树失败，请检查网络连接');
    } finally {
      setRefreshing(false);
    }
  }, [connected, projectPath, dispatch, getClient]);

  // 初始化文件树
  useEffect(() => {
    if (connected && !fileTree) {
      loadFileTree();
    }
  }, [connected, fileTree, loadFileTree]);

  // 监听 WebSocket 文件变更事件
  useEffect(() => {
    if (!connected) return;

    const client = getClient?.();
    if (!client) return;

    const unsubscribe = client.onMessage('event', (message: WebSocketMessage) => {
      if (message.payload?.category === 'file_change') {
        // 文件发生变化，刷新文件树
        loadFileTree();
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [connected, getClient, loadFileTree]);

  const handleToggleNode = useCallback((nodeId: string) => {
    dispatch(toggleNode(nodeId));
  }, [dispatch]);

  const handleSelectNode = useCallback(async (node: FileNode) => {
    dispatch(setSelectedNodeId(node.id));

    if (node.type === 'file') {
      dispatch(setCurrentFile(node));
      setShowViewer(true);

      // 加载真实文件内容
      dispatch(setFileLoading(true));
      try {
        const response = await fetch(
          `${API_BASE_URL}/file/read?path=${encodeURIComponent(node.path)}`,
          {
            headers: {
              'Authorization': `Bearer ${getClient?.() || ''}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          dispatch(setFileContent(data.data.content));
        } else {
          throw new Error(data.error || 'Failed to load file content');
        }
      } catch (error) {
        console.error('Failed to load file content:', error);
        dispatch(setFileContent(`// 加载文件失败: ${node.name}\n// 错误: ${(error as Error).message}`));
        Alert.alert('错误', '加载文件内容失败');
      } finally {
        dispatch(setFileLoading(false));
      }
    }
  }, [dispatch, getClient]);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
    dispatch(setCurrentFile(null));
  }, [dispatch]);

  const handleRefreshFile = useCallback(async () => {
    if (!currentFile) return;

    dispatch(setFileLoading(true));
    try {
      const response = await fetch(
        `${API_BASE_URL}/file/read?path=${encodeURIComponent(currentFile.path)}`,
        {
          headers: {
            'Authorization': `Bearer ${getClient?.() || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        dispatch(setFileContent(data.data.content));
      } else {
        throw new Error(data.error || 'Failed to refresh file content');
      }
    } catch (error) {
      console.error('Failed to refresh file content:', error);
      Alert.alert('错误', '刷新文件内容失败');
    } finally {
      dispatch(setFileLoading(false));
    }
  }, [currentFile, dispatch, getClient]);

  const handleRefreshTree = useCallback(() => {
    loadFileTree();
  }, [loadFileTree]);

  const handleSearch = useCallback(async () => {
    if (!localSearchQuery.trim()) return;

    if (!connected) {
      Alert.alert('提示', '未连接到服务器，请先连接');
      return;
    }

    dispatch(setSearchQuery(localSearchQuery.trim()));

    try {
      const response = await fetch(
        `${API_BASE_URL}/project/search?path=${encodeURIComponent(projectPath)}&q=${encodeURIComponent(localSearchQuery.trim())}&maxResults=50`,
        {
          headers: {
            'Authorization': `Bearer ${getClient?.() || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // 搜索结果处理
        console.log('Search results:', data.data);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('错误', '搜索失败');
    }
  }, [localSearchQuery, connected, projectPath, dispatch, getClient]);

  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery('');
    dispatch(clearSearch());
  }, [dispatch]);

  const handleExpandAll = useCallback(() => {
    dispatch(expandAll());
  }, [dispatch]);

  const handleCollapseAll = useCallback(() => {
    dispatch(collapseAll());
  }, [dispatch]);

  // 使用 useMemo 优化格式化消息
  const formattedSearchResults = useMemo(() => {
    return searchResults.map(node => ({
      id: node.id,
      name: node.name,
      path: node.path,
      type: node.type,
    }));
  }, [searchResults]);

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>项目文件</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, connected ? styles.connectedStatus : styles.disconnectedStatus]} />
            <Text style={styles.statusText}>
              {connected ? '已连接' : '未连接'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Text style={styles.headerButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefreshTree}
            disabled={!connected || refreshing}
          >
            <Text style={[styles.headerButtonText, (!connected || refreshing) && styles.disabledText]}>
              {refreshing ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 搜索栏 */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索文件..."
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={connected}
            />
            {localSearchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, !connected && styles.disabledButton]}
            onPress={handleSearch}
            disabled={!connected}
          >
            <Text style={styles.searchButtonText}>搜索</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 工具栏 */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleExpandAll}>
          <Text style={styles.toolbarButtonText}>展开全部</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleCollapseAll}>
          <Text style={styles.toolbarButtonText}>收起全部</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索结果 */}
      {searchQuery && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsText}>
            搜索结果: "{searchQuery}" ({formattedSearchResults.length})
          </Text>
          {searchLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      )}

      {/* 加载状态 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}

      {/* 错误状态 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefreshTree}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 文件树 */}
      <View style={styles.fileTreeContainer}>
        <FileTree
          fileTree={fileTree}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          onToggleNode={handleToggleNode}
          onSelectNode={handleSelectNode}
          refreshing={refreshing}
          onRefresh={handleRefreshTree}
        />
      </View>

      {/* 文件查看器模态框 */}
      <Modal
        visible={showViewer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseViewer}
      >
        <FileViewer
          file={currentFile}
          content={fileContent}
          loading={fileLoading}
          onClose={handleCloseViewer}
          onRefresh={handleRefreshFile}
        />
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: Colors.light.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: Colors.light.text,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    padding: 4,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: Colors.light.textSecondary,
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toolbarButtonText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  searchResultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchResultsText: {
    fontSize: 14,
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
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fileTreeContainer: {
    flex: 1,
  },
});

export default ProjectScreen;
