import { AIService, AIError } from './aiService';
import { ChatMessage } from '../models/types';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  test('should generate AI response successfully', async () => {
    const message = 'Hello, AI!';
    const context: ChatMessage[] = [];

    const response = await aiService.generateResponse(message, context);
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response).toContain('OpenAI response to: Hello, AI!');
  });

  test('should format prompt correctly with context', () => {
    const message = 'What is the capital of France?';
    const context: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, AI!',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: new Date().toISOString(),
      },
    ];

    const formattedPrompt = aiService.formatPrompt(message, context);
    expect(formattedPrompt).toContain('user: Hello, AI!');
    expect(formattedPrompt).toContain('assistant: Hello! How can I help you today?');
    expect(formattedPrompt).toContain('User: What is the capital of France?');
    expect(formattedPrompt).toContain('AI:');
  });

  test('should get friendly error message for timeout error', () => {
    const error = new AIError('TIMEOUT', 'AI service timeout');
    const friendlyError = aiService.getFriendlyError(error);
    expect(friendlyError).toBe('AI服务响应超时，请稍后重试');
  });

  test('should get friendly error message for rate limit error', () => {
    const error = new AIError('RATE_LIMIT', 'AI service rate limit exceeded');
    const friendlyError = aiService.getFriendlyError(error);
    expect(friendlyError).toBe('AI服务请求过于频繁，请稍后重试');
  });

  test('should get friendly error message for auth error', () => {
    const error = new AIError('AUTH_ERROR', 'AI service authentication failed');
    const friendlyError = aiService.getFriendlyError(error);
    expect(friendlyError).toBe('AI服务认证失败，请检查配置');
  });

  test('should get friendly error message for retry failed error', () => {
    const error = new AIError('RETRY_FAILED', 'Failed to generate AI response after multiple attempts');
    const friendlyError = aiService.getFriendlyError(error);
    expect(friendlyError).toBe('AI服务暂时不可用，请稍后重试');
  });

  test('should get friendly error message for unknown error', () => {
    const error = new AIError('UNKNOWN_ERROR', 'Unknown error occurred');
    const friendlyError = aiService.getFriendlyError(error);
    expect(friendlyError).toBe('AI服务出现错误，请稍后重试');
  });
});
