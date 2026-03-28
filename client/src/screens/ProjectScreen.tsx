import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
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
} from '../state/slices/projectSlice';
import { RootState } from '../state/store';
import { Colors } from '../constants/colors';
import { useWebSocket } from '../hooks/useWebSocket';

// 模拟文件树数据
const mockFileTree: FileNode = {
  id: 'root',
  name: '项目根目录',
  path: '/project',
  type: 'directory',
  children: [
    {
      id: 'src',
      name: 'src',
      path: '/project/src',
      type: 'directory',
      children: [
        {
          id: 'components',
          name: 'components',
          path: '/project/src/components',
          type: 'directory',
          children: [
            {
              id: 'Button.tsx',
              name: 'Button.tsx',
              path: '/project/src/components/Button.tsx',
              type: 'file',
              size: 1200,
              modifiedAt: Date.now(),
            },
            {
              id: 'Input.tsx',
              name: 'Input.tsx',
              path: '/project/src/components/Input.tsx',
              type: 'file',
              size: 800,
              modifiedAt: Date.now(),
            },
          ],
        },
        {
          id: 'utils',
          name: 'utils',
          path: '/project/src/utils',
          type: 'directory',
          children: [
            {
              id: 'helpers.ts',
              name: 'helpers.ts',
              path: '/project/src/utils/helpers.ts',
              type: 'file',
              size: 500,
              modifiedAt: Date.now(),
            },
          ],
        },
        {
          id: 'App.tsx',
          name: 'App.tsx',
          path: '/project/src/App.tsx',
          type: 'file',
          size: 2500,
          modifiedAt: Date.now(),
        },
      ],
    },
    {
      id: 'package.json',
      name: 'package.json',
      path: '/project/package.json',
      type: 'file',
      size: 1500,
      modifiedAt: Date.now(),
    },
    {
      id: 'README.md',
      name: 'README.md',
      path: '/project/README.md',
      type: 'file',
      size: 2000,
      modifiedAt: Date.now(),
    },
    {
      id: '.gitignore',
      name: '.gitignore',
      path: '/project/.gitignore',
      type: 'file',
      size: 200,
      modifiedAt: Date.now(),
    },
  ],
};

// 模拟文件内容
const mockFileContents: Record<string, string> = {
  '/project/src/App.tsx': `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './components/Button';

export const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
      <Button title="Click me" onPress={() => console.log('Clicked')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});`,
  '/project/package.json': `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-native": "^0.70.0"
  },
  "devDependencies": {
    "typescript": "^4.8.0",
    "jest": "^29.0.0"
  }
}`,
  '/project/README.md': `# My Project

This is a sample project for demonstration purposes.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## License

MIT`,
  '/project/.gitignore': `node_modules/
dist/
.env
*.log
.DS_Store
coverage/`,
  '/project/src/components/Button.tsx': `import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabled: {
    backgroundColor: '#C7C7CC',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});`,
  '/project/src/components/Input.tsx': `import React, { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';

interface InputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export const Input: React.FC<InputProps> = ({ placeholder, value, onChangeText }) => {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
});`,
  '/project/src/utils/helpers.ts': `export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN');
};

export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};`,
};

export const ProjectScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { connected } = useWebSocket();
  
  const {
    fileTree,
    expandedNodes,
    selectedNodeId,
    currentFile,
    fileContent,
    fileLoading,
    searchQuery,
    searchLoading,
  } = useSelector((state: RootState) => state.project);

  const [showSearch, setShowSearch] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 初始化文件树
  useEffect(() => {
    if (!fileTree) {
      dispatch({ type: 'project/setFileTree', payload: mockFileTree });
    }
  }, [dispatch, fileTree]);

  const handleToggleNode = useCallback((nodeId: string) => {
    dispatch(toggleNode(nodeId));
  }, [dispatch]);

  const handleSelectNode = useCallback((node: FileNode) => {
    dispatch(setSelectedNodeId(node.id));
    
    if (node.type === 'file') {
      dispatch(setCurrentFile(node));
      setShowViewer(true);
      
      // 模拟加载文件内容
      dispatch({ type: 'project/setFileLoading', payload: true });
      setTimeout(() => {
        const content = mockFileContents[node.path] || `// 文件内容: ${node.name}\n// 路径: ${node.path}\n\n// 这是一个示例文件内容。\n// 在实际应用中，这里会显示从服务器获取的真实文件内容。`;
        dispatch({ type: 'project/setFileContent', payload: content });
        dispatch({ type: 'project/setFileLoading', payload: false });
      }, 500);
    }
  }, [dispatch]);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
    dispatch(setCurrentFile(null));
  }, [dispatch]);

  const handleRefreshFile = useCallback(() => {
    if (currentFile) {
      dispatch({ type: 'project/setFileLoading', payload: true });
      setTimeout(() => {
        const content = mockFileContents[currentFile.path] || `// 文件内容: ${currentFile.name}\n// 路径: ${currentFile.path}`;
        dispatch({ type: 'project/setFileContent', payload: content });
        dispatch({ type: 'project/setFileLoading', payload: false });
      }, 500);
    }
  }, [currentFile, dispatch]);

  const handleRefreshTree = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSearch = useCallback(() => {
    if (localSearchQuery.trim()) {
      dispatch(setSearchQuery(localSearchQuery.trim()));
      // 实际应用中这里会调用搜索API
    }
  }, [dispatch, localSearchQuery]);

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
          >
            <Text style={styles.headerButtonText}>🔄</Text>
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
            />
            {localSearchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
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
            搜索结果: "{searchQuery}"
          </Text>
          {searchLoading && <ActivityIndicator size="small" color={Colors.primary} />}
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
  fileTreeContainer: {
    flex: 1,
  },
});

export default ProjectScreen;
