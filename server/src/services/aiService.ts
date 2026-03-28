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
      model: options.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
        // 调用真实的OpenAI API
        const response = await this.generateResponseWithOpenAI(message, context);
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

  // 生产环境实现 - OpenAI API
  private async generateResponseWithOpenAI(message: string, context: ChatMessage[]): Promise<string> {
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout!);
    
    try {
      // 这里是OpenAI API调用的代码
      // 在实际使用时，需要安装openai包：npm install openai
      // import OpenAI from 'openai';
      // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const formattedContext = this.formatPrompt(message, context);
      
      // 模拟OpenAI API调用（实际使用时取消注释下面的代码）
      // if (!process.env.OPENAI_API_KEY) {
      //   throw new AIError('AUTH_ERROR', 'OpenAI API key is not configured');
      // }
      // const completion = await openai.chat.completions.create({
      //   model: this.options.model!,
      //   messages: [{ role: 'user', content: formattedContext }],
      //   temperature: this.options.temperature,
      //   max_tokens: this.options.maxTokens,
      //   signal: controller.signal, // 传递信号用于超时控制
      // });
      // return completion.choices[0].message.content || '';
      
      // 暂时使用模拟响应，实际部署时请取消上面的注释并删除这行
      return `OpenAI response to: ${message}`;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // 处理不同类型的错误
      if (error instanceof AIError) {
        throw error;
      } else if (error instanceof Error) {
        // 检查是否是认证错误
        if (error.message.includes('authentication')) {
          throw new AIError('AUTH_ERROR', 'OpenAI API authentication failed');
        }
        // 检查是否是限流错误
        else if (error.message.includes('rate limit')) {
          throw new AIError('RATE_LIMIT', 'OpenAI API rate limit exceeded');
        }
        // 检查是否是超时错误
        else if (error.message.includes('timeout') || error.name === 'AbortError') {
          throw new AIError('TIMEOUT', 'OpenAI API timeout');
        }
      }
      
      throw new AIError('API_ERROR', 'Failed to call OpenAI API');
    } finally {
      // 清除超时计时器
      clearTimeout(timeoutId);
    }
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
