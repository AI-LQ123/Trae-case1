import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import { Colors } from '../../constants/colors';

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
  category: 'terminal' | 'ai';
}

interface QuickCommandFormData {
  id?: string;
  name: string;
  command: string;
  category: 'terminal' | 'ai';
}

interface QuickCommandManagerProps {
  quickCommands: QuickCommand[];
  onAdd: () => void;
  onEdit: (command: QuickCommand) => void;
  onDelete: (commandId: string) => void;
}

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const QuickCommandItem = ({
  item,
  onEdit,
  onDelete
}: {
  item: QuickCommand;
  onEdit: (command: QuickCommand) => void;
  onDelete: (commandId: string) => void;
}) => (
  <View style={styles.quickCommandItem}>
    <View style={styles.quickCommandInfo}>
      <Text style={styles.quickCommandName}>{item.name}</Text>
      <Text style={styles.quickCommandText} numberOfLines={1}>{item.command}</Text>
      <Text style={styles.quickCommandCategory}>
        {item.category === 'terminal' ? '终端' : 'AI'}
      </Text>
    </View>
    <View style={styles.quickCommandActions}>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => onEdit(item)}
      >
        <Text style={styles.editButtonText}>编辑</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}
      >
        <Text style={styles.deleteButtonText}>删除</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const QuickCommandManager: React.FC<QuickCommandManagerProps> = ({
  quickCommands,
  onAdd,
  onEdit,
  onDelete
}) => {
  return (
    <View>
      <SectionHeader title="快捷指令" />
      <FlatList
        data={quickCommands}
        renderItem={({ item }) => (
          <QuickCommandItem
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        style={styles.quickCommandList}
      />
      <TouchableOpacity
        style={styles.addQuickCommandButton}
        onPress={onAdd}
      >
        <Text style={styles.addQuickCommandButtonText}>添加快捷指令</Text>
      </TouchableOpacity>
    </View>
  );
};

interface QuickCommandFormProps {
  visible: boolean;
  editingCommand: QuickCommandFormData;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (command: QuickCommandFormData) => void;
}

export const QuickCommandForm: React.FC<QuickCommandFormProps> = ({
  visible,
  editingCommand,
  onClose,
  onSave,
  onUpdate
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingCommand.id ? '编辑快捷指令' : '添加快捷指令'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="指令名称"
            value={editingCommand.name}
            onChangeText={(text) => onUpdate({ ...editingCommand, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="命令内容"
            value={editingCommand.command}
            onChangeText={(text) => onUpdate({ ...editingCommand, command: text })}
          />
          <View style={styles.categoryOptions}>
            <TouchableOpacity
              style={[
                styles.categoryOption,
                editingCommand.category === 'terminal' && styles.categoryOptionSelected
              ]}
              onPress={() => onUpdate({ ...editingCommand, category: 'terminal' })}
            >
              <Text style={[
                styles.categoryOptionText,
                editingCommand.category === 'terminal' && styles.categoryOptionTextSelected
              ]}>终端</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryOption,
                editingCommand.category === 'ai' && styles.categoryOptionSelected
              ]}
              onPress={() => onUpdate({ ...editingCommand, category: 'ai' })}
            >
              <Text style={[
                styles.categoryOptionText,
                editingCommand.category === 'ai' && styles.categoryOptionTextSelected
              ]}>AI</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonCancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={onSave}
            >
              <Text style={styles.modalButtonSaveText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  quickCommandList: {
    marginBottom: 12,
  },
  quickCommandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  quickCommandInfo: {
    flex: 1,
    marginRight: 10,
  },
  quickCommandName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  quickCommandText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  quickCommandCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  quickCommandActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  addQuickCommandButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addQuickCommandButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.border,
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonCancelText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
