import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
  isExpanded?: boolean;
  extension?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  totalFiles: number;
  totalDirectories: number;
  lastModified: number;
}

interface ProjectState {
  // 文件树相关
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  
  // 当前文件
  currentFile: FileNode | null;
  fileContent: string | null;
  fileLoading: boolean;
  fileError: string | null;
  
  // 项目信息
  projectInfo: ProjectInfo | null;
  projectPath: string | null;
  
  // 搜索
  searchQuery: string;
  searchResults: FileNode[];
  searchLoading: boolean;
  
  // 加载状态
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  fileTree: null,
  expandedNodes: new Set(),
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

// 异步 Thunks
export const fetchFileTree = createAsyncThunk(
  'project/fetchFileTree',
  async ({ projectPath, maxDepth = 3 }: { projectPath: string; maxDepth?: number }, { rejectWithValue }) => {
    try {
      // 这里应该调用API获取文件树
      // 暂时返回模拟数据，实际实现时需要替换为真实API调用
      const response = await fetch(`/api/project/file-tree?path=${encodeURIComponent(projectPath)}&maxDepth=${maxDepth}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file tree');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchFileContent = createAsyncThunk(
  'project/fetchFileContent',
  async (filePath: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/file/read?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      const data = await response.json();
      return data.data.content;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const searchFiles = createAsyncThunk(
  'project/searchFiles',
  async ({ projectPath, query }: { projectPath: string; query: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/project/search?path=${encodeURIComponent(projectPath)}&q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error('Failed to search files');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchProjectInfo = createAsyncThunk(
  'project/fetchProjectInfo',
  async (projectPath: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/project/info?path=${encodeURIComponent(projectPath)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project info');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setFileTree: (state, action: PayloadAction<FileNode | null>) => {
      state.fileTree = action.payload;
    },
    
    toggleNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (state.expandedNodes.has(nodeId)) {
        state.expandedNodes.delete(nodeId);
      } else {
        state.expandedNodes.add(nodeId);
      }
    },
    
    expandNode: (state, action: PayloadAction<string>) => {
      state.expandedNodes.add(action.payload);
    },
    
    collapseNode: (state, action: PayloadAction<string>) => {
      state.expandedNodes.delete(action.payload);
    },
    
    expandAll: (state) => {
      const expandAllNodes = (node: FileNode) => {
        if (node.type === 'directory') {
          state.expandedNodes.add(node.id);
          node.children?.forEach(expandAllNodes);
        }
      };
      if (state.fileTree) {
        expandAllNodes(state.fileTree);
      }
    },
    
    collapseAll: (state) => {
      state.expandedNodes.clear();
    },
    
    setSelectedNodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    
    setCurrentFile: (state, action: PayloadAction<FileNode | null>) => {
      state.currentFile = action.payload;
      if (action.payload === null) {
        state.fileContent = null;
        state.fileError = null;
      }
    },
    
    setFileContent: (state, action: PayloadAction<string | null>) => {
      state.fileContent = action.payload;
    },
    
    setFileLoading: (state, action: PayloadAction<boolean>) => {
      state.fileLoading = action.payload;
    },
    
    setFileError: (state, action: PayloadAction<string | null>) => {
      state.fileError = action.payload;
    },
    
    setProjectInfo: (state, action: PayloadAction<ProjectInfo | null>) => {
      state.projectInfo = action.payload;
    },
    
    setProjectPath: (state, action: PayloadAction<string | null>) => {
      state.projectPath = action.payload;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<FileNode[]>) => {
      state.searchResults = action.payload;
    },
    
    clearSearch: (state) => {
      state.searchQuery = '';
      state.searchResults = [];
      state.searchLoading = false;
    },
    
    updateFileNode: (state, action: PayloadAction<{ nodeId: string; updates: Partial<FileNode> }>) => {
      const { nodeId, updates } = action.payload;
      
      const updateNode = (node: FileNode): boolean => {
        if (node.id === nodeId) {
          Object.assign(node, updates);
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (updateNode(child)) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (state.fileTree) {
        updateNode(state.fileTree);
      }
    },
    
    addFileNode: (state, action: PayloadAction<{ parentId: string; node: FileNode }>) => {
      const { parentId, node } = action.payload;
      
      const addToParent = (parent: FileNode): boolean => {
        if (parent.id === parentId) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
          return true;
        }
        if (parent.children) {
          for (const child of parent.children) {
            if (addToParent(child)) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (state.fileTree) {
        addToParent(state.fileTree);
      }
    },
    
    removeFileNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      
      const removeNode = (parent: FileNode): boolean => {
        if (parent.children) {
          const index = parent.children.findIndex(child => child.id === nodeId);
          if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
          }
          for (const child of parent.children) {
            if (removeNode(child)) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (state.fileTree) {
        removeNode(state.fileTree);
      }
      
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null;
      }
      if (state.currentFile?.id === nodeId) {
        state.currentFile = null;
        state.fileContent = null;
      }
    },
    
    clearProject: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchFileTree
    builder.addCase(fetchFileTree.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFileTree.fulfilled, (state, action) => {
      state.loading = false;
      state.fileTree = action.payload;
    });
    builder.addCase(fetchFileTree.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // fetchFileContent
    builder.addCase(fetchFileContent.pending, (state) => {
      state.fileLoading = true;
      state.fileError = null;
    });
    builder.addCase(fetchFileContent.fulfilled, (state, action) => {
      state.fileLoading = false;
      state.fileContent = action.payload;
    });
    builder.addCase(fetchFileContent.rejected, (state, action) => {
      state.fileLoading = false;
      state.fileError = action.payload as string;
    });
    
    // searchFiles
    builder.addCase(searchFiles.pending, (state) => {
      state.searchLoading = true;
    });
    builder.addCase(searchFiles.fulfilled, (state, action) => {
      state.searchLoading = false;
      state.searchResults = action.payload;
    });
    builder.addCase(searchFiles.rejected, (state) => {
      state.searchLoading = false;
      state.searchResults = [];
    });
    
    // fetchProjectInfo
    builder.addCase(fetchProjectInfo.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchProjectInfo.fulfilled, (state, action) => {
      state.loading = false;
      state.projectInfo = action.payload;
    });
    builder.addCase(fetchProjectInfo.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
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
} = projectSlice.actions;

export default projectSlice.reducer;
