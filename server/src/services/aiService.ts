import { ChatMessage } from '../models/types';
import { AIProvider, AIProviderOptions, createAIProvider, AIError } from './aiProvider';

interface AIServiceOptions extends AIProviderOptions {
  retryAttempts?: number;
  provider?: string;
  apiKey?: string;
}

export class AIService {
  private provider: AIProvider;
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions = {}) {
    this.options = {
      model: options.model || process.env.AI_MODEL || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      provider: options.provider || process.env.AI_PROVIDER || 'openai',
      apiKey: options.apiKey || process.env.AI_API_KEY,
    };

    // 根据配置创建AI Provider
    const providerType = this.options.provider!;
    const apiKey = this.options.apiKey;
    
    if (!apiKey) {
      console.warn('AI API key is not configured, using mock provider');
      // 使用默认的OpenAI Provider，但实际调用时会返回模拟响应
      this.provider = createAIProvider('openai', 'mock-key', {
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        timeout: this.options.timeout,
      });
    } else {
      this.provider = createAIProvider(providerType, apiKey, {
        model: this.options.model,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        timeout: this.options.timeout,
      });
    }
  }

  async generateResponse(message: string, context: ChatMessage[] = []): Promise<string> {
    let attempts = 0;
    
    while (attempts < this.options.retryAttempts!) {
      try {
        // 调用AI Provider生成响应
        const response = await this.provider.generateResponse(message, context, {
          model: this.options.model,
          temperature: this.options.temperature,
          maxTokens: this.options.maxTokens,
          timeout: this.options.timeout,
        });
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      case 'INVALID_PROVIDER':
        return '不支持的AI服务提供商';
      default:
        return 'AI服务出现错误，请稍后重试';
    }
  }
}

export { AIError };
export const aiService = new AIService();
