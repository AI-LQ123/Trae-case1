import chatReducer, {
  setSessions,
  setCurrentSession,
  addSession,
  setMessages,
  addMessage,
  updateMessage,
  setLoading,
  setStreamingMessageId,
  setHasMore,
  ChatMessage,
  ChatSession,
} from './chatSlice';

describe('chatSlice', () => {
  const initialState = {
    sessions: [],
    currentSessionId: null,
    messages: [],
    loading: false,
    streamingMessageId: null,
    hasMore: true,
  };

  it('should handle initial state', () => {
    expect(chatReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setSessions', () => {
    const sessions: ChatSession[] = [
      { id: '1', title: 'Session 1', createdAt: Date.now(), updatedAt: Date.now() },
      { id: '2', title: 'Session 2', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    const actual = chatReducer(initialState, setSessions(sessions));
    expect(actual.sessions).toEqual(sessions);
  });

  it('should handle setCurrentSession', () => {
    const sessionId = '1';
    const actual = chatReducer(initialState, setCurrentSession(sessionId));
    expect(actual.currentSessionId).toEqual(sessionId);
  });

  it('should handle addSession', () => {
    const session: ChatSession = {
      id: '1',
      title: 'New Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const actual = chatReducer(initialState, addSession(session));
    expect(actual.sessions).toHaveLength(1);
    expect(actual.sessions[0]).toEqual(session);
  });

  it('should handle setMessages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        sessionId: '1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ];
    const actual = chatReducer(initialState, setMessages(messages));
    expect(actual.messages).toEqual(messages);
  });

  it('should handle addMessage', () => {
    const message: ChatMessage = {
      id: '1',
      sessionId: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    };
    const actual = chatReducer(initialState, addMessage(message));
    expect(actual.messages).toHaveLength(1);
    expect(actual.messages[0]).toEqual(message);
  });

  it('should handle updateMessage with existing message', () => {
    const initialMessages: ChatMessage[] = [
      {
        id: '1',
        sessionId: '1',
        role: 'assistant',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ];
    const stateWithMessages = { ...initialState, messages: initialMessages };
    const actual = chatReducer(stateWithMessages, updateMessage({ id: '1', content: ' World' }));
    expect(actual.messages[0].content).toEqual('Hello World');
  });

  it('should handle updateMessage with non-existing message (boundary condition)', () => {
    const initialMessages: ChatMessage[] = [
      {
        id: '1',
        sessionId: '1',
        role: 'assistant',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ];
    const stateWithMessages = { ...initialState, messages: initialMessages };
    const actual = chatReducer(stateWithMessages, updateMessage({ id: '999', content: ' World' }));
    expect(actual.messages).toEqual(initialMessages); // 应该保持不变
  });

  it('should handle setLoading', () => {
    const actual = chatReducer(initialState, setLoading(true));
    expect(actual.loading).toEqual(true);
  });

  it('should handle setStreamingMessageId', () => {
    const messageId = '1';
    const actual = chatReducer(initialState, setStreamingMessageId(messageId));
    expect(actual.streamingMessageId).toEqual(messageId);
  });

  it('should handle setHasMore', () => {
    const actual = chatReducer(initialState, setHasMore(false));
    expect(actual.hasMore).toEqual(false);
  });

  // 测试消息列表长度边界情况
  it('should handle addMessage when message list is large', () => {
    // 创建一个包含100条消息的初始状态
    const largeMessages: ChatMessage[] = [];
    for (let i = 0; i < 100; i++) {
      largeMessages.push({
        id: `msg-${i}`,
        sessionId: '1',
        role: 'user',
        content: `Message ${i}`,
        timestamp: Date.now(),
      });
    }
    const stateWithLargeMessages = { ...initialState, messages: largeMessages };
    
    // 添加一条新消息
    const newMessage: ChatMessage = {
      id: 'new-msg',
      sessionId: '1',
      role: 'user',
      content: 'New message',
      timestamp: Date.now(),
    };
    
    const actual = chatReducer(stateWithLargeMessages, addMessage(newMessage));
    expect(actual.messages).toHaveLength(101);
    expect(actual.messages[100]).toEqual(newMessage);
  });

  // 测试多个操作的组合
  it('should handle multiple operations in sequence', () => {
    let state = initialState;
    
    // 添加会话
    const session: ChatSession = {
      id: '1',
      title: 'Test Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state = chatReducer(state, addSession(session));
    
    // 设置当前会话
    state = chatReducer(state, setCurrentSession('1'));
    
    // 添加消息
    const message: ChatMessage = {
      id: '1',
      sessionId: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    };
    state = chatReducer(state, addMessage(message));
    
    // 更新消息
    state = chatReducer(state, updateMessage({ id: '1', content: ' World' }));
    
    // 设置加载状态
    state = chatReducer(state, setLoading(true));
    
    expect(state.sessions).toHaveLength(1);
    expect(state.currentSessionId).toEqual('1');
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toEqual('Hello World');
    expect(state.loading).toEqual(true);
  });
});
