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

  it('should handle updateMessage', () => {
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
});
