import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  type: 'chat' | 'terminal';
  content: string;
}

interface QuickCommandsState {
  commands: CommandItem[];
  isMenuVisible: boolean;
}

const initialState: QuickCommandsState = {
  commands: [
    {
      id: '1',
      title: '查看项目结构',
      description: '显示当前项目的文件树结构',
      type: 'terminal',
      content: 'ls -la',
    },
    {
      id: '2',
      title: '运行测试',
      description: '执行项目的测试套件',
      type: 'terminal',
      content: 'npm test',
    },
    {
      id: '3',
      title: '构建项目',
      description: '构建生产版本',
      type: 'terminal',
      content: 'npm run build',
    },
    {
      id: '4',
      title: '代码解释',
      description: '请解释选中的代码',
      type: 'chat',
      content: '请解释以下代码的功能和实现原理：',
    },
    {
      id: '5',
      title: '代码优化',
      description: '优化选中的代码',
      type: 'chat',
      content: '请优化以下代码，提高性能和可读性：',
    },
    {
      id: '6',
      title: '错误分析',
      description: '分析错误信息',
      type: 'chat',
      content: '请分析以下错误信息并提供解决方案：',
    },
  ],
  isMenuVisible: false,
};

const quickCommandsSlice = createSlice({
  name: 'quickCommands',
  initialState,
  reducers: {
    setMenuVisibility: (state, action: PayloadAction<boolean>) => {
      state.isMenuVisible = action.payload;
    },
    addCommand: (state, action: PayloadAction<CommandItem>) => {
      state.commands.push(action.payload);
    },
    removeCommand: (state, action: PayloadAction<string>) => {
      state.commands = state.commands.filter(command => command.id !== action.payload);
    },
    updateCommand: (state, action: PayloadAction<CommandItem>) => {
      const index = state.commands.findIndex(command => command.id === action.payload.id);
      if (index !== -1) {
        state.commands[index] = action.payload;
      }
    },
  },
});

export const { setMenuVisibility, addCommand, removeCommand, updateCommand } = quickCommandsSlice.actions;

export default quickCommandsSlice.reducer;