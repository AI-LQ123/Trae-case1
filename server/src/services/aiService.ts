import { ChatMessage } from '../models/types';

export class AIError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AIError';
  }
}

interface AIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retryAttempts?: number;
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions = {}) {
    this.options = {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      timeout: options.timeout || 30000, // 默认30秒超时
      retryAttempts: options.retryAttempts || 3, // 默认重试3次
    };
  }

  async generateResponse(message: string, context: ChatMessage[] = []): Promise<string> {
    let attempts = 0;
    
    while (attempts < this.options.retryAttempts!) {
      try {
        // 模拟AI响应，实际项目中应该调用真实的AI API
        // 这里仅作为示例实现，添加了错误模拟
        const response = await this.simulateAIResponse(message, attempts);
        return response;
      } catch (error) {
        attempts++;
        
        // 如果是超时或限流错误，进行重试
        if (error instanceof AIError && (error.code === 'TIMEOUT' || error.code === 'RATE_LIMIT') && attempts < this.options.retryAttempts!) {
          console.warn(`AI service error (attempt ${attempts}/${this.options.retryAttempts!}): ${error.message}`);
          // 指数退避重试
          await this.sleep(1000 * Math.pow(2, attempts - 1));
          continue;
        }
        
        // 其他错误直接抛出
        throw error;
      }
    }
    
    throw new AIError('RETRY_FAILED', 'Failed to generate AI response after multiple attempts');
  }

  private async simulateAIResponse(message: string, attempt: number): Promise<string> {
    // 模拟AI响应，添加错误场景
    return await new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        // 模拟10%的概率出现错误
        const errorProbability = Math.random();
        
        if (errorProbability < 0.1 && attempt === 0) {
          // 模拟超时错误
          reject(new AIError('TIMEOUT', 'AI service timeout'));
        } else if (errorProbability < 0.2 && attempt === 0) {
          // 模拟限流错误
          reject(new AIError('RATE_LIMIT', 'AI service rate limit exceeded'));
        } else if (errorProbability < 0.3 && attempt === 0) {
          // 模拟API密钥错误
          reject(new AIError('AUTH_ERROR', 'AI service authentication failed'));
        } else {
          // 正常响应
          resolve(`AI response to: ${message}`);
        }
      }, 1000);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatPrompt(message: string, context: ChatMessage[]): string {
    const contextMessages = context
      .slice(-10) // 只保留最近的10条消息作为上下文
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\nUser: ${message}\nAI:`;
  }

  // 获取错误的友好提示
  getFriendlyError(error: AIError): string {
    switch (error.code) {
      case 'TIMEOUT':
        return 'AI服务响应超时，请稍后重试';
      case 'RATE_LIMIT':
        return 'AI服务请求过于频繁，请稍后重试';
      case 'AUTH_ERROR':
        return 'AI服务认证失败，请检查配置';
      case 'RETRY_FAILED':
        return 'AI服务暂时不可用，请稍后重试';
      default:
        return 'AI服务出现错误，请稍后重试';
    }
  }
}

export const aiService = new AIService();
