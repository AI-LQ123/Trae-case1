import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FileNode } from '../../state/slices/projectSlice';
import { Colors } from '../../constants/colors';
import { CodeViewer } from './CodeViewer';

interface FileViewerProps {
  file: FileNode | null;
  content: string | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const getLanguageFromExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    sql: 'sql',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
  };
  return languageMap[extension] || 'text';
};

const getFileTypeLabel = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    json: 'JSON',
    md: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    xml: 'XML',
    py: 'Python',
    java: 'Java',
    go: 'Go',
    rs: 'Rust',
    cpp: 'C++',
    c: 'C',
    h: 'Header',
    sql: 'SQL',
    yml: 'YAML',
    yaml: 'YAML',
    sh: 'Shell',
    bash: 'Bash',
    dockerfile: 'Dockerfile',
    txt: 'Text',
    log: 'Log',
  };
  return typeMap[extension] || 'File';
};

const isBinaryFile = (filename: string): boolean => {
  const binaryExtensions = [
    'exe', 'dll', 'so', 'dylib', 'bin',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
    'zip', 'tar', 'gz', 'rar', '7z',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  ];
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return binaryExtensions.includes(extension);
};

export const FileViewer: React.FC<FileViewerProps> = ({
  file,
  content,
  loading,
  onClose,
  onRefresh,
}) => {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);

  const handleIncreaseFontSize = useCallback(() => {
    setFontSize((prev) => Math.min(prev + 2, 24));
  }, []);

  const handleDecreaseFontSize = useCallback(() => {
    setFontSize((prev) => Math.max(prev - 2, 10));
  }, []);

  const handleToggleLineNumbers = useCallback(() => {
    setShowLineNumbers((prev) => !prev);
  }, []);

  if (!file) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyText}>选择文件以查看内容</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (isBinaryFile(file.name)) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{file.name}</Text>
            <Text style={styles.fileType}>{getFileTypeLabel(file.name)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.binaryContainer}>
          <Text style={styles.binaryIcon}>📦</Text>
          <Text style={styles.binaryText}>二进制文件</Text>
          <Text style={styles.binarySubtext}>此文件类型无法预览</Text>
          {file.size && (
            <Text style={styles.fileSizeText}>大小: {formatFileSize(file.size)}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileType}>
            {getFileTypeLabel(file.name)} • {getLanguageFromExtension(file.name)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onRefresh} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={handleDecreaseFontSize} style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>A-</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleIncreaseFontSize} style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>A+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleToggleLineNumbers}
          style={[styles.toolbarButton, showLineNumbers && styles.toolbarButtonActive]}
        >
          <Text style={[styles.toolbarButtonText, showLineNumbers && styles.toolbarButtonTextActive]}>
            #
          </Text>
        </TouchableOpacity>
      </View>

      {content === null ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>无法加载文件内容</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <CodeViewer
          content={content}
          language={file?.name || 'text'}
          fontSize={fontSize}
          showLineNumbers={showLineNumbers}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {content?.split('\n').length || 0} 行
          {file.size ? ` • ${formatFileSize(file.size)}` : ''}
        </Text>
      </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  fileType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toolbarButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toolbarButtonText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  toolbarButtonTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  binaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  binaryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  binaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  binarySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  fileSizeText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FileViewer;
