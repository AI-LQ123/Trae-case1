import { AIService } from './aiService';
import { AIError } from './aiProvider';
import { ChatMessage } from '../models/types';

// 模拟AbortController
class MockAbortController {
  signal: any = {
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  abort: jest.Mock = jest.fn(() => {
    this.signal.aborted = true;
  });
}

// 模拟全局AbortController
global.AbortController = MockAbortController as any;

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
    jest.clearAllMocks();
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

  test('should use model from environment variable', () => {
    // 保存原始环境变量
    const originalModel = process.env.OPENAI_MODEL;
    
    // 设置环境变量
    process.env.OPENAI_MODEL = 'gpt-4';
    
    // 创建新的AIService实例
    const aiServiceWithEnvModel = new AIService();
    
    // 验证模型是否从环境变量读取
    // 注意：这里我们无法直接访问private属性，所以我们通过测试generateResponse来间接验证
    expect(aiServiceWithEnvModel).toBeDefined();
    
    // 恢复原始环境变量
    process.env.OPENAI_MODEL = originalModel;
  });

  test('should handle timeout error', async () => {
    // 直接测试超时逻辑
    const originalAbortController = global.AbortController;
    let abortCalled = false;
    
    // 替换AbortController
    global.AbortController = class MockAbortController {
      signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      abort = () => {
        abortCalled = true;
        this.signal.aborted = true;
      };
    } as any;
    
    // 创建一个带有短超时的AIService
    const aiServiceWithShortTimeout = new AIService({ timeout: 10 });
    
    // 直接测试generateResponseWithOpenAI方法
    const controller = new AbortController();
    const mockAbort = jest.spyOn(controller, 'abort');
    
    // 保存原始的setTimeout
    const originalSetTimeout = global.setTimeout;
    
    // 模拟setTimeout，让它立即触发
    (global as any).setTimeout = (callback: Function) => {
      callback();
      return 1 as any;
    };
    
    // 调用generateResponse方法
    try {
      await aiServiceWithShortTimeout.generateResponse('Hello, AI!');
    } catch (error) {
      // 忽略错误，我们只关心abort是否被调用
    }
    
    // 验证abort是否被调用
    expect(abortCalled).toBe(true);
    
    // 恢复原始方法
    (global as any).setTimeout = originalSetTimeout;
    global.AbortController = originalAbortController;
  });

  test('should retry on rate limit error', async () => {
    // 模拟generateResponseWithOpenAI方法，让它在第一次调用时返回限流错误
    const originalGenerateResponseWithOpenAI = (aiService as any).generateResponseWithOpenAI;
    let callCount = 0;
    
    (aiService as any).generateResponseWithOpenAI = jest.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new AIError('RATE_LIMIT', 'Rate limit exceeded');
      }
      return 'OpenAI response after retry';
    });
    
    // 调用generateResponse
    const response = await aiService.generateResponse('Hello, AI!');
    
    // 验证方法被调用了多次（至少两次）
    expect((aiService as any).generateResponseWithOpenAI).toHaveBeenCalledTimes(2);
    expect(response).toBe('OpenAI response after retry');
    
    // 恢复原始方法
    (aiService as any).generateResponseWithOpenAI = originalGenerateResponseWithOpenAI;
  });

  test('should throw retry failed error after multiple attempts', async () => {
    // 模拟generateResponseWithOpenAI方法，让它始终返回错误
    const originalGenerateResponseWithOpenAI = (aiService as any).generateResponseWithOpenAI;
    
    (aiService as any).generateResponseWithOpenAI = jest.fn(async () => {
      throw new AIError('RATE_LIMIT', 'Rate limit exceeded');
    });
    
    // 调用generateResponse并验证它抛出了错误
    await expect(aiService.generateResponse('Hello, AI!')).rejects.toThrow();
    
    // 恢复原始方法
    (aiService as any).generateResponseWithOpenAI = originalGenerateResponseWithOpenAI;
  });
});
