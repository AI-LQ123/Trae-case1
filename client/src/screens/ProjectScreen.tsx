import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  Alert,
  StyleSheet,
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
} from '../state/slices/projectSlice';
import { RootState } from '../state/store';
import { Colors } from '../constants/colors';
import { useWebSocket } from '../hooks/useWebSocket';
import { WebSocketMessage } from '../services/websocket/WebSocketClient';
import ProjectHeader from './components/ProjectHeader';
import SearchBar from './components/SearchBar';
import ProjectToolbar from './components/ProjectToolbar';
import SearchResults from './components/SearchResults';
import ErrorState from './components/ErrorState';

// 项目路径配置
const PROJECT_PATH = '/project';

export const ProjectScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { connected, getClient } = useWebSocket();

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
  const [projectPath] = useState(PROJECT_PATH);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // 加载文件树
  const loadFileTree = useCallback(async () => {
    if (!connected) {
      Alert.alert('提示', '未连接到服务器，请先连接');
      return;
    }

    setRefreshing(true);
    try {
      await dispatch(fetchFileTree({ projectPath, maxDepth: 3 })).unwrap();
    } catch (error) {
      console.error('Failed to load file tree:', error);
      Alert.alert('错误', '加载文件树失败，请检查网络连接');
    } finally {
      setRefreshing(false);
    }
  }, [connected, projectPath, dispatch]);

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

      // 加载文件内容
      try {
        await dispatch(fetchFileContent(node.path)).unwrap();
      } catch (error) {
        console.error('Failed to load file content:', error);
        Alert.alert('错误', '加载文件内容失败');
      }
    }
  }, [dispatch]);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
    dispatch(setCurrentFile(null));
  }, [dispatch]);

  const handleRefreshFile = useCallback(async () => {
    if (!currentFile) return;

    try {
      await dispatch(fetchFileContent(currentFile.path)).unwrap();
    } catch (error) {
      console.error('Failed to refresh file content:', error);
      Alert.alert('错误', '刷新文件内容失败');
    }
  }, [currentFile, dispatch]);

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
    setShowSearchResults(true);

    try {
      await dispatch(searchFiles({ projectPath, query: localSearchQuery.trim() })).unwrap();
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('错误', '搜索失败');
    }
  }, [localSearchQuery, connected, projectPath, dispatch]);

  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery('');
    dispatch(clearSearch());
    setShowSearchResults(false);
  }, [dispatch]);

  const handleExpandAll = useCallback(() => {
    dispatch(expandAll());
  }, [dispatch]);

  const handleCollapseAll = useCallback(() => {
    dispatch(collapseAll());
  }, [dispatch]);

  const handleToggleSearch = useCallback(() => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setShowSearchResults(false);
    }
  }, [showSearch]);

  // 渲染内容
  const renderContent = () => {
    if (error) {
      return <ErrorState error={error} onRetry={handleRefreshTree} />;
    }

    if (showSearchResults) {
      return (
        <SearchResults
          results={searchResults}
          loading={searchLoading}
          query={searchQuery}
          onSelectNode={handleSelectNode}
        />
      );
    }

    return (
      <View style={styles.fileTreeContainer}>
        <FileTree
          fileTree={fileTree}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          onToggleNode={handleToggleNode}
          onSelectNode={handleSelectNode}
          refreshing={refreshing}
          onRefresh={handleRefreshTree}
          loading={loading}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <ProjectHeader
        connected={connected}
        refreshing={refreshing}
        onToggleSearch={handleToggleSearch}
        onRefresh={handleRefreshTree}
      />

      {/* 搜索栏 */}
      {showSearch && (
        <SearchBar
          query={localSearchQuery}
          onChangeText={setLocalSearchQuery}
          onSubmit={handleSearch}
          onClear={handleClearSearch}
          editable={connected}
        />
      )}

      {/* 工具栏 */}
      {!showSearchResults && (
        <ProjectToolbar
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
        />
      )}

      {/* 内容区域 */}
      {renderContent()}

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
  fileTreeContainer: {
    flex: 1,
  },
});

export default ProjectScreen;
