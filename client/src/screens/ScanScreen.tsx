import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService, { AuthError } from '../services/auth/authService';

const ScanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [pairingCode, setPairingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    checkAuthStatus();
    loadSavedServerUrl();
  }, []);

  const checkAuthStatus = async () => {
    const isAuth = await authService.isAuthenticated();
    if (isAuth) {
      navigation.replace('Chat');
    }
  };

  const loadSavedServerUrl = async () => {
    const savedUrl = await authService.getServerUrl();
    if (savedUrl) {
      setServerUrl(savedUrl);
    }
  };

  const validateServerUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handlePairing = async () => {
    if (!serverUrl || !pairingCode) {
      Alert.alert('错误', '请输入服务器地址和配对码');
      return;
    }

    if (!validateServerUrl(serverUrl)) {
      Alert.alert('错误', '请输入有效的服务器地址（包含 http:// 或 https://）');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingText('正在配对中...');

    try {
      await authService.pairWithServer(serverUrl, pairingCode);
      setLoadingText('配对成功！');
      setTimeout(() => {
        Alert.alert('成功', '设备配对成功！', [
          {
            text: '确定',
            onPress: () => navigation.replace('Chat')
          }
        ]);
      }, 500);
    } catch (err) {
      let errorMessage = '配对失败，请检查服务器地址和配对码';
      if (err instanceof AuthError) {
        switch (err.code) {
          case 'NETWORK_ERROR':
            errorMessage = '网络错误，请检查网络连接';
            break;
          case 'PAIRING_FAILED':
            errorMessage = '配对码无效或已过期';
            break;
          default:
            errorMessage = err.message;
        }
      }
      setError(errorMessage);
      Alert.alert('错误', errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trae 设备配对</Text>
        <Text style={styles.subtitle}>请输入服务器地址和配对码</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>服务器地址</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:3001"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>配对码</Text>
          <TextInput
            style={styles.input}
            value={pairingCode}
            onChangeText={setPairingCode}
            placeholder="如: A1B2C3"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            keyboardType="ascii-capable"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handlePairing}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              {loadingText ? <Text style={styles.loadingText}>{loadingText}</Text> : null}
            </View>
          ) : (
            <Text style={styles.buttonText}>开始配对</Text>
          )}
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>配对步骤：</Text>
          <Text style={styles.infoText}>1. 在电脑端打开 Trae 应用</Text>
          <Text style={styles.infoText}>2. 查看并输入显示的配对码</Text>
          <Text style={styles.infoText}>3. 确保手机和电脑在同一网络</Text>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>提示：</Text>
          <Text style={styles.tipText}>服务器地址将自动保存，下次打开时无需重新输入</Text>
          <Text style={styles.tipText}>配对码有效期为5分钟，请及时输入</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  info: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  tip: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});

export default ScanScreen;
