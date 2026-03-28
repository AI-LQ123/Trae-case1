import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface ProjectToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.toolbarButton} onPress={onExpandAll}>
        <Text style={styles.toolbarButtonText}>展开全部</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarButton} onPress={onCollapseAll}>
        <Text style={styles.toolbarButtonText}>收起全部</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toolbarButtonText: {
    fontSize: 12,
    color: Colors.light.text,
  },
});

export default ProjectToolbar;
