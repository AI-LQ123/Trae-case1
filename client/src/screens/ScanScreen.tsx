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
  ScrollView,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService, { AuthError } from '../services/auth/authService';

interface PairedServer {
  id: string;
  serverUrl: string;
  serverName?: string;
  token: string;
  refreshToken: string;
  deviceId: string;
  pairedAt: number;
  isActive: boolean;
}

const ScanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [pairingCode, setPairingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [pairedServers, setPairedServers] = useState<PairedServer[]>([]);
  const [showPairedServers, setShowPairedServers] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    loadSavedServerUrl();
    loadPairedServers();
  }, []);

  const loadPairedServers = async () => {
    const servers = await authService.getPairedServers();
    setPairedServers(servers);
    if (servers.length > 0) {
      setShowPairedServers(true);
    }
  };

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
      await loadPairedServers();
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

  const handleSwitchServer = async (server: PairedServer) => {
    setIsLoading(true);
    setLoadingText('正在切换服务器...');
    
    try {
      await authService.setActiveServer(server.id);
      await loadPairedServers();
      setTimeout(() => {
        navigation.replace('Chat');
      }, 300);
    } catch (err) {
      Alert.alert('错误', '切换服务器失败');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个服务器吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await authService.removePairedServer(serverId);
            await loadPairedServers();
          }
        }
      ]
    );
  };

  const formatPairedAt = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderServerItem = ({ item }: { item: PairedServer }) => (
    <TouchableOpacity
      style={[styles.serverItem, item.isActive && styles.activeServerItem]}
      onPress={() => handleSwitchServer(item)}
    >
      <View style={styles.serverInfo}>
        <Text style={styles.serverUrl} numberOfLines={1}>
          {item.serverName || item.serverUrl}
        </Text>
        <Text style={styles.serverDetails}>
          配对时间: {formatPairedAt(item.pairedAt)}
        </Text>
        {item.isActive && (
          <Text style={styles.activeIndicator}>当前使用</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveServer(item.id)}
      >
        <Text style={styles.removeButtonText}>删除</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trae 设备配对</Text>
        
        {showPairedServers && pairedServers.length > 0 && (
          <View style={styles.serversSection}>
            <Text style={styles.sectionTitle}>已配对的服务器</Text>
            <FlatList
              data={pairedServers}
              renderItem={renderServerItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.serverList}
            />
          </View>
        )}

        <Text style={styles.subtitle}>
          {pairedServers.length > 0 ? '添加新的服务器' : '请输入服务器地址和配对码'}
        </Text>

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
            <Text style={styles.buttonText}>
              {pairedServers.length > 0 ? '添加新服务器' : '开始配对'}
            </Text>
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
    justifyContent: 'flex-start',
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
    marginBottom: 20,
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
  serversSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  serverList: {
    maxHeight: 200,
  },
  serverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeServerItem: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f4ff',
  },
  serverInfo: {
    flex: 1,
  },
  serverUrl: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  serverDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeIndicator: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    marginLeft: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ScanScreen;
