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
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService from '../services/auth/authService';

const ScanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [pairingCode, setPairingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const isAuth = await authService.isAuthenticated();
    if (isAuth) {
      navigation.replace('Chat');
    }
  };

  const handlePairing = async () => {
    if (!serverUrl || !pairingCode) {
      Alert.alert('错误', '请输入服务器地址和配对码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.pairWithServer(serverUrl, pairingCode);
      Alert.alert('成功', '设备配对成功！', [
        {
          text: '确定',
          onPress: () => navigation.replace('Chat')
        }
      ]);
    } catch (err) {
      setError('配对失败，请检查服务器地址和配对码');
      Alert.alert('错误', '配对失败，请检查服务器地址和配对码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
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
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handlePairing}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>开始配对</Text>
          )}
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoText}>1. 在电脑端打开 Trae 应用</Text>
          <Text style={styles.infoText}>2. 查看并输入显示的配对码</Text>
          <Text style={styles.infoText}>3. 确保手机和电脑在同一网络</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
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
  info: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
});

export default ScanScreen;
