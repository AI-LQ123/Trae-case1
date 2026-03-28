import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Button } from 'react-native';
import { store } from './state/store';
import { AppNavigator } from './navigation/AppNavigator';
import { validateEnvConfig, showConfigAlert, enforceSecureConnection, getEnvConfig } from './constants/config';
import { Colors } from './constants/colors';

// 配置错误组件
const ConfigErrorScreen: React.FC<{ errors: string[]; onRetry: () => void }> = ({ errors, onRetry }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>⚠️ 配置错误</Text>
      <Text style={styles.errorMessage}>
        应用配置存在问题，无法启动：
      </Text>
      {errors.map((error, index) => (
        <Text key={index} style={styles.errorItem}>• {error}</Text>
      ))}
      <Text style={styles.errorHint}>
        请检查 .env 文件配置，或联系管理员
      </Text>
      <Button title="重试" onPress={onRetry} />
    </View>
  );
};

export const App: React.FC = () => {
  const [configValid, setConfigValid] = useState<boolean | null>(null);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = () => {
    const { isValid, errors, warnings } = validateEnvConfig();
    
    // 生产环境必须强制使用安全连接
    if (!__DEV__ && !enforceSecureConnection()) {
      errors.push('生产环境必须使用 https:// 和 wss:// 协议');
      setConfigValid(false);
      setConfigErrors(errors);
      return;
    }
    
    if (!isValid) {
      setConfigValid(false);
      setConfigErrors(errors);
    } else {
      setConfigValid(true);
      setConfigErrors([]);
      
      // 开发环境下显示警告
      if (__DEV__ && warnings.length > 0) {
        console.warn('环境配置警告:', warnings);
        showConfigAlert();
      }
    }
  };

  // 配置检查中
  if (configValid === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>正在检查配置...</Text>
      </View>
    );
  }

  // 配置错误
  if (!configValid) {
    return <ConfigErrorScreen errors={configErrors} onRetry={checkConfig} />;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  errorHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
});

export default App;
