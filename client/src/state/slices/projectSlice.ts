import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvConfig } from '../../constants/config';
import { handleFetchError, ErrorDetails } from '../../utils/errorHandler';

// 从配置获取API基础URL
const { API_BASE_URL } = getEnvConfig();

// 获取认证 token
const getAuthToken = async (): Promise<string | null> => {
  try {
    // 使用AsyncStorage替代localStorage，适配React Native
    const token = await AsyncStorage.getItem('auth_token');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// 通用的请求包装器，支持重试和超时
const fetchWithAuth = async <T = unknown>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 30000
): Promise<{ success: boolean; data: T; error?: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    if (retries > 0) {
      console.warn(`Request failed, retrying (${retries} attempts left):`, error.message);
      // 指数退避策略
      const delay = Math.pow(2, 3 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithAuth(url, options, retries - 1, timeout);
    }

    throw error;
  }
};

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
  fileError: ErrorDetails | null;

  // 项目信息
  projectInfo: ProjectInfo | null;
  projectPath: string | null;

  // 搜索
  searchQuery: string;
  searchResults: FileNode[];
  searchLoading: boolean;

  // 加载状态
  loading: boolean;
  error: ErrorDetails | null;
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
export const fetchFileTree = createAsyncThunk<
  FileNode | null,
  { projectPath: string; maxDepth?: number },
  { rejectValue: ErrorDetails }
>(
  'project/fetchFileTree',
  async (
    { projectPath, maxDepth = 3 },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchWithAuth<FileNode | null>(
        `${API_BASE_URL}/project/file-tree?path=${encodeURIComponent(projectPath)}&maxDepth=${maxDepth}`
      );
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const fetchFileContent = createAsyncThunk<
  string,
  string,
  { rejectValue: ErrorDetails }
>(
  'project/fetchFileContent',
  async (filePath, { rejectWithValue }) => {
    try {
      const data = await fetchWithAuth<{ content: string }>(
        `${API_BASE_URL}/file/read?path=${encodeURIComponent(filePath)}`
      );
      return data.data.content;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const searchFiles = createAsyncThunk<
  FileNode[],
  { projectPath: string; query: string; maxResults?: number },
  { rejectValue: ErrorDetails }
>(
  'project/searchFiles',
  async (
    { projectPath, query, maxResults = 50 },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchWithAuth<FileNode[]>(
        `${API_BASE_URL}/project/search?path=${encodeURIComponent(projectPath)}&q=${encodeURIComponent(
          query
        )}&maxResults=${maxResults}`
      );
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const fetchProjectInfo = createAsyncThunk<
  ProjectInfo | null,
  string,
  { rejectValue: ErrorDetails }
>(
  'project/fetchProjectInfo',
  async (projectPath, { rejectWithValue }) => {
    try {
      const data = await fetchWithAuth<ProjectInfo>(
        `${API_BASE_URL}/project/info?path=${encodeURIComponent(projectPath)}`
      );
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

// 文件操作 Thunks
export const createFile = createAsyncThunk<
  unknown,
  { filePath: string; content?: string },
  { rejectValue: ErrorDetails }
>(
  'project/createFile',
  async (
    { filePath, content = '' },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/file/create`, {
        method: 'POST',
        body: JSON.stringify({ path: filePath, content }),
      });
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const deleteFile = createAsyncThunk<
  unknown,
  string,
  { rejectValue: ErrorDetails }
>(
  'project/deleteFile',
  async (filePath, { rejectWithValue }) => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/file/delete`, {
        method: 'POST',
        body: JSON.stringify({ path: filePath }),
      });
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const renameFile = createAsyncThunk<
  unknown,
  { oldPath: string; newPath: string },
  { rejectValue: ErrorDetails }
>(
  'project/renameFile',
  async (
    { oldPath, newPath },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/file/rename`, {
        method: 'POST',
        body: JSON.stringify({ oldPath, newPath }),
      });
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
    }
  }
);

export const writeFile = createAsyncThunk<
  unknown,
  { filePath: string; content: string },
  { rejectValue: ErrorDetails }
>(
  'project/writeFile',
  async (
    { filePath, content },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/file/write`, {
        method: 'POST',
        body: JSON.stringify({ path: filePath, content }),
      });
      return data.data;
    } catch (error) {
      const errorDetails = handleFetchError(error);
      return rejectWithValue(errorDetails);
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

    setFileError: (state, action: PayloadAction<ErrorDetails | null>) => {
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

    updateFileNode: (
      state,
      action: PayloadAction<{ nodeId: string; updates: Partial<FileNode> }>
    ) => {
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

    addFileNode: (
      state,
      action: PayloadAction<{ parentId: string; node: FileNode }>
    ) => {
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
          const index = parent.children.findIndex((child) => child.id === nodeId);
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
      state.error = action.payload as ErrorDetails;
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
      state.fileError = action.payload as ErrorDetails;
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

    // createFile
    builder.addCase(createFile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createFile.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(createFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as ErrorDetails;
    });

    // deleteFile
    builder.addCase(deleteFile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteFile.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as ErrorDetails;
    });

    // renameFile
    builder.addCase(renameFile.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(renameFile.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(renameFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as ErrorDetails;
    });

    // writeFile
    builder.addCase(writeFile.pending, (state) => {
      state.fileLoading = true;
    });
    builder.addCase(writeFile.fulfilled, (state) => {
      state.fileLoading = false;
    });
    builder.addCase(writeFile.rejected, (state, action) => {
      state.fileLoading = false;
      state.fileError = action.payload as ErrorDetails;
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
