import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './state/store';
import { AppNavigator } from './navigation/AppNavigator';
import { validateEnvConfig, showConfigAlert } from './constants/config';

export const App: React.FC = () => {
  useEffect(() => {
    if (__DEV__) {
      const isValid = validateEnvConfig();
      if (!isValid) {
        showConfigAlert();
      }
    }
  }, []);

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

export default App;
