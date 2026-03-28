import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Notification } from '../state/slices/notificationSlice';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  duration?: number;
  position?: 'top' | 'bottom';
}

const { width } = Dimensions.get('window');

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  duration = 3000,
  position = 'top',
}) => {
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // 动画显示
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 自动消失
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: position === 'top' ? -100 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // 检查组件是否仍挂载
      if (isMounted) {
        onDismiss(notification.id);
      }
    });
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return '#34C759';
      case 'warning':
        return '#FF9500';
      case 'error':
        return '#FF3B30';
      case 'info':
      default:
        return '#007AFF';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message}>{notification.message}</Text>
      </View>
      <TouchableOpacity style={styles.dismissButton} onPress={dismiss}>
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: width - 32,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  topPosition: {
    top: 50,
  },
  bottomPosition: {
    bottom: 50,
  },
  content: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
