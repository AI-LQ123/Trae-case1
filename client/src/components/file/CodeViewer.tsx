import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';

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
  const formatLineNumbers = useCallback((text: string): string[] => {
    const lines = text.split('\n');
    return lines.map((_, index) => (index + 1).toString());
  }, []);

  const lineNumbers = useMemo(() => formatLineNumbers(content), [content, formatLineNumbers]);

  if (!content || content.trim() === '') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>文件为空</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.contentScroll}
        horizontal={true}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
      >
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={styles.verticalScroll}
        >
          <View style={styles.codeContainer}>
            {showLineNumbers && (
              <View style={styles.lineNumbersContainer}>
                <Text style={[styles.lineNumbers, { fontSize }]}>
                  {lineNumbers.join('\n')}
                </Text>
              </View>
            )}
            <View style={styles.codeContent}>
              <Text style={[styles.codeText, { fontSize }]}>{content}</Text>
            </View>
          </View>
        </ScrollView>
      </ScrollView>
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
  verticalScroll: {
    flex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  lineNumbersContainer: {
    backgroundColor: '#252526',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#3E3E42',
    minWidth: 40,
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
    paddingVertical: 8,
  },
  codeText: {
    color: '#D4D4D4',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default CodeViewer;
