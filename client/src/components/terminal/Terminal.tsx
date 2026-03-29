import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { TerminalOutput, TerminalCommand } from '../../state/slices/terminalSlice';

interface TerminalProps {
  sessionId: string;
  outputs: TerminalOutput[];
  commands: TerminalCommand[];
  onSendCommand: (command: string) => void;
  onResize?: (cols: number, rows: number) => void;
  disabled?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const CHAR_WIDTH = 8;

export const Terminal: React.FC<TerminalProps> = ({
  sessionId,
  outputs,
  onSendCommand,
  onResize,
  disabled = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = React.useState('');

  const terminalWidth = screenWidth - 32;
  const cols = Math.floor(terminalWidth / CHAR_WIDTH);
  const rows = 24;

  useEffect(() => {
    if (onResize) {
      onResize(cols, rows);
    }
  }, [cols, onResize]);

  useEffect(() => {
    scrollToBottom();
  }, [outputs]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || disabled) return;
    onSendCommand(inputText.trim());
    setInputText('');
  }, [inputText, disabled, onSendCommand]);

  const handleKeyPress = useCallback((e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleSend();
    }
  }, [handleSend]);

  const renderOutput = useCallback((output: TerminalOutput, index: number) => {
    return (
      <Text
        key={`${output.timestamp}-${index}`}
        style={[
          styles.outputText,
          output.type === 'stderr' && styles.stderrText,
        ]}
      >
        {output.data}
      </Text>
    );
  }, []);

  const combinedContent = React.useMemo(() => {
    const sessionOutputs = outputs.filter(o => o.sessionId === sessionId);
    return sessionOutputs;
  }, [outputs, sessionId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.terminalContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
        >
          {combinedContent.length === 0 ? (
            <Text style={styles.welcomeText}>
              欢迎使用终端{'\n'}
              输入命令开始操作...
            </Text>
          ) : (
            combinedContent.map(renderOutput)
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, disabled && styles.inputDisabled]}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            onKeyPress={handleKeyPress}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholder="输入命令..."
            placeholderTextColor={Colors.terminal.textSecondary}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || disabled) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || disabled}
          >
            <Text style={styles.sendButtonText}>执行</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: Colors.terminal.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  scrollContent: {
    flexGrow: 1,
  },
  outputText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: Colors.terminal.foreground,
    lineHeight: 18,
  },
  stderrText: {
    color: Colors.terminal.red,
  },
  welcomeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: Colors.terminal.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: Colors.terminal.background,
  },
  prompt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: Colors.terminal.green,
    marginRight: 8,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: Colors.terminal.foreground,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#2D2D2D',
    borderRadius: 4,
    minHeight: 36,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
