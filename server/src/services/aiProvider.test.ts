import { AIProvider, AIProviderOptions, OpenAIProvider, DeepSeekProvider, ClaudeProvider, createAIProvider, AIError } from './aiProvider';
import { ChatMessage } from '../models/types';

describe('AI Provider', () => {
  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;
    const apiKey = 'test-api-key';

    beforeEach(() => {
      provider = new OpenAIProvider(apiKey);
    });

    test('should generate response successfully', async () => {
      const message = 'Hello, AI!';
      const context: ChatMessage[] = [];

      const response = await provider.generateResponse(message, context);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response).toContain('OpenAI response to: Hello, AI!');
    });

    test('should use custom options', async () => {
      const customProvider = new OpenAIProvider(apiKey, {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 500,
        timeout: 10000,
      });

      const message = 'Test message';
      const context: ChatMessage[] = [];

      const response = await customProvider.generateResponse(message, context);
      expect(response).toBeDefined();
    });
  });

  describe('DeepSeekProvider', () => {
    let provider: DeepSeekProvider;
    const apiKey = 'test-api-key';

    beforeEach(() => {
      provider = new DeepSeekProvider(apiKey);
    });

    test('should generate response successfully', async () => {
      const message = 'Hello, DeepSeek!';
      const context: ChatMessage[] = [];

      const response = await provider.generateResponse(message, context);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response).toContain('DeepSeek response to: Hello, DeepSeek!');
    });

    test('should use custom options', async () => {
      const customProvider = new DeepSeekProvider(apiKey, {
        model: 'deepseek-chat-v2',
        temperature: 0.8,
        maxTokens: 2000,
        timeout: 15000,
      });

      const message = 'Test message';
      const context: ChatMessage[] = [];

      const response = await customProvider.generateResponse(message, context);
      expect(response).toBeDefined();
    });
  });

  describe('ClaudeProvider', () => {
    let provider: ClaudeProvider;
    const apiKey = 'test-api-key';

    beforeEach(() => {
      provider = new ClaudeProvider(apiKey);
    });

    test('should generate response successfully', async () => {
      const message = 'Hello, Claude!';
      const context: ChatMessage[] = [];

      const response = await provider.generateResponse(message, context);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response).toContain('Claude response to: Hello, Claude!');
    });

    test('should use custom options', async () => {
      const customProvider = new ClaudeProvider(apiKey, {
        model: 'claude-3-opus-20240229',
        temperature: 0.6,
        maxTokens: 1500,
        timeout: 20000,
      });

      const message = 'Test message';
      const context: ChatMessage[] = [];

      const response = await customProvider.generateResponse(message, context);
      expect(response).toBeDefined();
    });
  });

  describe('createAIProvider', () => {
    test('should create OpenAI provider', () => {
      const provider = createAIProvider('openai', 'test-key');
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    test('should create DeepSeek provider', () => {
      const provider = createAIProvider('deepseek', 'test-key');
      expect(provider).toBeInstanceOf(DeepSeekProvider);
    });

    test('should create Claude provider', () => {
      const provider = createAIProvider('claude', 'test-key');
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    test('should create Claude provider with anthropic alias', () => {
      const provider = createAIProvider('anthropic', 'test-key');
      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    test('should throw error for unsupported provider', () => {
      expect(() => createAIProvider('unsupported', 'test-key')).toThrow(AIError);
      expect(() => createAIProvider('unsupported', 'test-key')).toThrow('Unsupported AI provider: unsupported');
    });

    test('should pass options to provider', () => {
      const options: AIProviderOptions = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000,
        timeout: 30000,
      };
      const provider = createAIProvider('openai', 'test-key', options);
      expect(provider).toBeDefined();
    });
  });

  describe('AIError', () => {
    test('should create AIError with code and message', () => {
      const error = new AIError('TEST_ERROR', 'Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('AIError');
    });
  });
});
