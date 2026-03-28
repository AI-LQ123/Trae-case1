import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from '../screens/ChatScreen';
import { TerminalScreen } from '../screens/TerminalScreen';
import { ProjectScreen } from '../screens/ProjectScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ScanScreen } from '../screens/ScanScreen';

export type RootStackParamList = {
  Main: undefined;
  Scan: undefined;
};

export type MainTabParamList = {
  Chat: undefined;
  Terminal: undefined;
  Project: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Terminal" component={TerminalScreen} />
      <Tab.Screen name="Project" component={ProjectScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="Main">
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Scan"
        component={ScanScreen}
        options={{ title: '扫描二维码' }}
      />
    </Stack.Navigator>
  );
};
