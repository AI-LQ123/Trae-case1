import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface SearchBarProps {
  query: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  editable: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChangeText,
  onSubmit,
  onClear,
  editable,
}) => {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索文件..."
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          editable={editable}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.searchButton, !editable && styles.disabledButton]}
        onPress={onSubmit}
        disabled={!editable}
      >
        <Text style={styles.searchButtonText}>搜索</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: Colors.light.textSecondary,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: Colors.light.text,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    padding: 4,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: Colors.light.textSecondary,
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SearchBar;
