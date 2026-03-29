import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface AppearanceSettingsProps {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onFontSizeChange: (size: number) => void;
}

const ThemeOption = ({
  value,
  label,
  selected,
  onPress
}: {
  value: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.themeOption, selected && styles.themeOptionSelected]}
    onPress={onPress}
  >
    <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
      {label}
    </Text>
    {selected && <View style={styles.themeCheckmark} />}
  </TouchableOpacity>
);

const FontSizeOption = ({
  value,
  label,
  selected,
  onPress
}: {
  value: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.fontSizeOption, selected && styles.fontSizeOptionSelected]}
    onPress={onPress}
  >
    <Text style={[styles.fontSizeOptionText, { fontSize: value }]}>{label}</Text>
  </TouchableOpacity>
);

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange
}) => {
  return (
    <View>
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>主题</Text>
        <View style={styles.themeOptions}>
          <ThemeOption
            value="light"
            label="浅色"
            selected={theme === 'light'}
            onPress={() => onThemeChange('light')}
          />
          <ThemeOption
            value="dark"
            label="深色"
            selected={theme === 'dark'}
            onPress={() => onThemeChange('dark')}
          />
          <ThemeOption
            value="system"
            label="跟随系统"
            selected={theme === 'system'}
            onPress={() => onThemeChange('system')}
          />
        </View>
      </View>
      <View style={styles.settingGroup}>
        <Text style={styles.settingGroupTitle}>字体大小</Text>
        <View style={styles.fontSizeOptions}>
          <FontSizeOption
            value={12}
            label="小"
            selected={fontSize === 12}
            onPress={() => onFontSizeChange(12)}
          />
          <FontSizeOption
            value={14}
            label="中"
            selected={fontSize === 14}
            onPress={() => onFontSizeChange(14)}
          />
          <FontSizeOption
            value={16}
            label="大"
            selected={fontSize === 16}
            onPress={() => onFontSizeChange(16)}
          />
          <FontSizeOption
            value={18}
            label="特大"
            selected={fontSize === 18}
            onPress={() => onFontSizeChange(18)}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  settingGroup: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingGroupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  themeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  themeOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  themeOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  themeCheckmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontSizeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  fontSizeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  fontSizeOptionText: {
    color: Colors.light.text,
    fontWeight: '500',
  },
});
