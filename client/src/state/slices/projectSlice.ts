import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface ProjectState {
  fileTree: FileNode | null;
  expandedNodes: Set<string>;
  currentFile: FileNode | null;
  fileContent: string | null;
  fileLoading: boolean;
  searchQuery: string;
  searchResults: FileNode[];
}

const initialState: ProjectState = {
  fileTree: null,
  expandedNodes: new Set(),
  currentFile: null,
  fileContent: null,
  fileLoading: false,
  searchQuery: '',
  searchResults: [],
};

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
    setCurrentFile: (state, action: PayloadAction<FileNode | null>) => {
      state.currentFile = action.payload;
    },
    setFileContent: (state, action: PayloadAction<string | null>) => {
      state.fileContent = action.payload;
    },
    setFileLoading: (state, action: PayloadAction<boolean>) => {
      state.fileLoading = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<FileNode[]>) => {
      state.searchResults = action.payload;
    },
  },
});

export const {
  setFileTree,
  toggleNode,
  setCurrentFile,
  setFileContent,
  setFileLoading,
  setSearchQuery,
  setSearchResults,
} = projectSlice.actions;

export default projectSlice.reducer;
