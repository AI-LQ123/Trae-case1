import React, { useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Dimensions, Text } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface CodeViewerProps {
  content: string;
  language?: string;
  fontSize?: number;
  showLineNumbers?: boolean;
  wrapLines?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  content,
  language: _language,
  fontSize = 14,
  showLineNumbers = true,
  wrapLines: _wrapLines,
}) => {
  if (!content || content.trim() === '') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>文件为空</Text>
      </View>
    );
  }

  const lines = useMemo(() => content.split('\n'), [content]);

  const renderLine = useCallback(({ item, index }: { item: string; index: number }) => (
    <View style={styles.lineContainer}>
      {showLineNumbers && (
        <View style={styles.lineNumbersContainer}>
          <Text style={[styles.lineNumbers, { fontSize }]}>
            {index + 1}
          </Text>
        </View>
      )}
      <View style={styles.codeContent}>
        <Text style={[styles.codeText, { fontSize }]}>{item}</Text>
      </View>
    </View>
  ), [showLineNumbers, fontSize]);

  return (
    <View style={styles.container}>
      <FlatList
        data={lines}
        renderItem={renderLine}
        keyExtractor={(_, index) => index.toString()}
        horizontal={false}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.contentScroll}
        style={styles.contentContainer}
        getItemLayout={(_, index) => ({
          length: 20,
          offset: 20 * index,
          index,
        })}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  emptyText: {
    color: '#858585',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  contentScroll: {
    minWidth: screenWidth,
  },
  lineContainer: {
    flexDirection: 'row',
    minHeight: 20,
  },
  lineNumbersContainer: {
    backgroundColor: '#252526',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRightWidth: 1,
    borderRightColor: '#3E3E42',
    minWidth: 40,
    justifyContent: 'center',
  },
  lineNumbers: {
    color: '#858585',
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlign: 'right',
  },
  codeContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  codeText: {
    color: '#D4D4D4',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default CodeViewer;