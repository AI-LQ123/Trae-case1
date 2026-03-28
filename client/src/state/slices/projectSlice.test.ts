import { enableMapSet } from 'immer';
import projectReducer, {
  FileNode,
  ProjectInfo,
  setFileTree,
  toggleNode,
  expandNode,
  collapseNode,
  expandAll,
  collapseAll,
  setSelectedNodeId,
  setCurrentFile,
  setFileContent,
  setFileLoading,
  setFileError,
  setProjectInfo,
  setProjectPath,
  setSearchQuery,
  setSearchResults,
  clearSearch,
  updateFileNode,
  addFileNode,
  removeFileNode,
  clearProject,
} from './projectSlice';

// 启用 Immer 的 MapSet 插件
enableMapSet();

describe('projectSlice', () => {
  const initialState = {
    fileTree: null,
    expandedNodes: new Set<string>(),
    selectedNodeId: null,
    currentFile: null,
    fileContent: null,
    fileLoading: false,
    fileError: null,
    projectInfo: null,
    projectPath: null,
    searchQuery: '',
    searchResults: [],
    searchLoading: false,
    loading: false,
    error: null,
  };

  const mockFileTree: FileNode = {
    id: 'root',
    name: 'project',
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
            id: 'index.ts',
            name: 'index.ts',
            path: '/project/src/index.ts',
            type: 'file',
            size: 100,
          },
        ],
      },
      {
        id: 'package.json',
        name: 'package.json',
        path: '/project/package.json',
        type: 'file',
        size: 500,
      },
    ],
  };

  describe('file tree actions', () => {
    it('should handle setFileTree', () => {
      const nextState = projectReducer(initialState, setFileTree(mockFileTree));
      expect(nextState.fileTree).toEqual(mockFileTree);
    });

    it('should handle toggleNode - expand', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const nextState = projectReducer(state, toggleNode('src'));
      expect(nextState.expandedNodes.has('src')).toBe(true);
    });

    it('should handle toggleNode - collapse', () => {
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        expandedNodes: new Set(['src']),
      };
      const nextState = projectReducer(state, toggleNode('src'));
      expect(nextState.expandedNodes.has('src')).toBe(false);
    });

    it('should handle expandNode', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const nextState = projectReducer(state, expandNode('root'));
      expect(nextState.expandedNodes.has('root')).toBe(true);
    });

    it('should handle collapseNode', () => {
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        expandedNodes: new Set(['root', 'src']),
      };
      const nextState = projectReducer(state, collapseNode('root'));
      expect(nextState.expandedNodes.has('root')).toBe(false);
      expect(nextState.expandedNodes.has('src')).toBe(true);
    });

    it('should handle expandAll', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const nextState = projectReducer(state, expandAll());
      expect(nextState.expandedNodes.has('root')).toBe(true);
      expect(nextState.expandedNodes.has('src')).toBe(true);
    });

    it('should handle collapseAll', () => {
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        expandedNodes: new Set(['root', 'src']),
      };
      const nextState = projectReducer(state, collapseAll());
      expect(nextState.expandedNodes.size).toBe(0);
    });
  });

  describe('file selection actions', () => {
    it('should handle setSelectedNodeId', () => {
      const nextState = projectReducer(initialState, setSelectedNodeId('src'));
      expect(nextState.selectedNodeId).toBe('src');
    });

    it('should handle setCurrentFile', () => {
      const mockFile: FileNode = {
        id: 'index.ts',
        name: 'index.ts',
        path: '/project/src/index.ts',
        type: 'file',
        size: 100,
      };
      const nextState = projectReducer(initialState, setCurrentFile(mockFile));
      expect(nextState.currentFile).toEqual(mockFile);
    });

    it('should clear file content when setting current file to null', () => {
      const state = {
        ...initialState,
        currentFile: { id: 'test', name: 'test', path: '/test', type: 'file' } as FileNode,
        fileContent: 'some content',
        fileError: 'some error',
      };
      const nextState = projectReducer(state, setCurrentFile(null));
      expect(nextState.currentFile).toBeNull();
      expect(nextState.fileContent).toBeNull();
      expect(nextState.fileError).toBeNull();
    });

    it('should handle setFileContent', () => {
      const content = 'console.log("Hello World");';
      const nextState = projectReducer(initialState, setFileContent(content));
      expect(nextState.fileContent).toBe(content);
    });

    it('should handle setFileLoading', () => {
      const nextState = projectReducer(initialState, setFileLoading(true));
      expect(nextState.fileLoading).toBe(true);
    });

    it('should handle setFileError', () => {
      const error = 'File not found';
      const nextState = projectReducer(initialState, setFileError(error));
      expect(nextState.fileError).toBe(error);
    });
  });

  describe('project info actions', () => {
    it('should handle setProjectInfo', () => {
      const mockProjectInfo: ProjectInfo = {
        name: 'My Project',
        path: '/project',
        type: 'node',
        totalFiles: 10,
        totalDirectories: 5,
        lastModified: Date.now(),
      };
      const nextState = projectReducer(initialState, setProjectInfo(mockProjectInfo));
      expect(nextState.projectInfo).toEqual(mockProjectInfo);
    });

    it('should handle setProjectPath', () => {
      const path = '/home/user/project';
      const nextState = projectReducer(initialState, setProjectPath(path));
      expect(nextState.projectPath).toBe(path);
    });
  });

  describe('search actions', () => {
    it('should handle setSearchQuery', () => {
      const query = 'component';
      const nextState = projectReducer(initialState, setSearchQuery(query));
      expect(nextState.searchQuery).toBe(query);
    });

    it('should handle setSearchResults', () => {
      const results: FileNode[] = [
        { id: '1', name: 'Button.tsx', path: '/src/Button.tsx', type: 'file' },
        { id: '2', name: 'Input.tsx', path: '/src/Input.tsx', type: 'file' },
      ];
      const nextState = projectReducer(initialState, setSearchResults(results));
      expect(nextState.searchResults).toEqual(results);
    });

    it('should handle clearSearch', () => {
      const state = {
        ...initialState,
        searchQuery: 'test',
        searchResults: [{ id: '1', name: 'test', path: '/test', type: 'file' } as FileNode],
        searchLoading: true,
      };
      const nextState = projectReducer(state, clearSearch());
      expect(nextState.searchQuery).toBe('');
      expect(nextState.searchResults).toEqual([]);
      expect(nextState.searchLoading).toBe(false);
    });
  });

  describe('file tree manipulation actions', () => {
    it('should handle updateFileNode', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const updates = { name: 'updated-src', size: 200 };
      const nextState = projectReducer(state, updateFileNode({ nodeId: 'src', updates }));
      expect(nextState.fileTree?.children?.[0].name).toBe('updated-src');
    });

    it('should handle updateFileNode in nested children', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const updates = { size: 999 };
      const nextState = projectReducer(state, updateFileNode({ nodeId: 'index.ts', updates }));
      expect(nextState.fileTree?.children?.[0].children?.[0].size).toBe(999);
    });

    it('should handle addFileNode', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const newNode: FileNode = {
        id: 'new-file.ts',
        name: 'new-file.ts',
        path: '/project/src/new-file.ts',
        type: 'file',
        size: 50,
      };
      const nextState = projectReducer(state, addFileNode({ parentId: 'src', node: newNode }));
      expect(nextState.fileTree?.children?.[0].children).toHaveLength(2);
      expect(nextState.fileTree?.children?.[0].children?.[1]).toEqual(newNode);
    });

    it('should handle removeFileNode', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const nextState = projectReducer(state, removeFileNode('package.json'));
      expect(nextState.fileTree?.children).toHaveLength(1);
    });

    it('should clear selected node when removing selected file', () => {
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        selectedNodeId: 'package.json',
      };
      const nextState = projectReducer(state, removeFileNode('package.json'));
      expect(nextState.selectedNodeId).toBeNull();
    });

    it('should clear current file when removing it', () => {
      const mockFile: FileNode = {
        id: 'package.json',
        name: 'package.json',
        path: '/project/package.json',
        type: 'file',
        size: 500,
      };
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        currentFile: mockFile,
        fileContent: 'some content',
      };
      const nextState = projectReducer(state, removeFileNode('package.json'));
      expect(nextState.currentFile).toBeNull();
      expect(nextState.fileContent).toBeNull();
    });
  });

  describe('clearProject', () => {
    it('should reset state to initial state', () => {
      const state = {
        ...initialState,
        fileTree: mockFileTree,
        expandedNodes: new Set(['root']),
        selectedNodeId: 'src',
        currentFile: { id: 'test', name: 'test', path: '/test', type: 'file' } as FileNode,
        fileContent: 'content',
        projectInfo: { name: 'test', path: '/test', type: 'node', totalFiles: 1, totalDirectories: 0, lastModified: Date.now() },
        searchQuery: 'query',
        searchResults: [{ id: '1', name: 'test', path: '/test', type: 'file' } as FileNode],
      };
      const nextState = projectReducer(state, clearProject());
      expect(nextState).toEqual(initialState);
    });
  });

  describe('edge cases', () => {
    it('should handle null fileTree in expandAll', () => {
      const nextState = projectReducer(initialState, expandAll());
      expect(nextState.expandedNodes.size).toBe(0);
    });

    it('should handle updateFileNode with non-existent node', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const updates = { name: 'updated' };
      const nextState = projectReducer(state, updateFileNode({ nodeId: 'non-existent', updates }));
      expect(nextState.fileTree).toEqual(mockFileTree);
    });

    it('should handle addFileNode to non-existent parent', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const newNode: FileNode = {
        id: 'new',
        name: 'new',
        path: '/new',
        type: 'file',
      };
      const nextState = projectReducer(state, addFileNode({ parentId: 'non-existent', node: newNode }));
      expect(nextState.fileTree).toEqual(mockFileTree);
    });

    it('should handle removeFileNode with non-existent node', () => {
      const state = { ...initialState, fileTree: mockFileTree };
      const nextState = projectReducer(state, removeFileNode('non-existent'));
      expect(nextState.fileTree).toEqual(mockFileTree);
    });

    it('should handle setSelectedNodeId with null', () => {
      const state = { ...initialState, selectedNodeId: 'test' };
      const nextState = projectReducer(state, setSelectedNodeId(null));
      expect(nextState.selectedNodeId).toBeNull();
    });
  });
});
