import { ChatMessage } from '../models/types';

export interface AIProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIProvider {
  generateResponse(message: string, context: ChatMessage[], options?: AIProviderOptions): Promise<string>;
}

export class AIError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AIError';
  }
}

// OpenAI Provider实现
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private options: AIProviderOptions;

  constructor(apiKey: string, options: AIProviderOptions = {}) {
    this.apiKey = apiKey;
    this.options = {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      timeout: options.timeout || 30000,
    };
  }

  async generateResponse(message: string, context: ChatMessage[], options?: AIProviderOptions): Promise<string> {
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || this.options.timeout!);

    try {
      // 这里是OpenAI API调用的代码
      // 在实际使用时，需要安装openai包：npm install openai
      // import OpenAI from 'openai';
      // const openai = new OpenAI({ apiKey: this.apiKey });

      const formattedContext = this.formatPrompt(message, context);

      // 模拟OpenAI API调用（实际使用时取消注释下面的代码）
      // const completion = await openai.chat.completions.create({
      //   model: options?.model || this.options.model!,
      //   messages: [{ role: 'user', content: formattedContext }],
      //   temperature: options?.temperature || this.options.temperature,
      //   max_tokens: options?.maxTokens || this.options.maxTokens,
      //   signal: controller.signal,
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
        if (error.message.includes('authentication')) {
          throw new AIError('AUTH_ERROR', 'OpenAI API authentication failed');
        } else if (error.message.includes('rate limit')) {
          throw new AIError('RATE_LIMIT', 'OpenAI API rate limit exceeded');
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          throw new AIError('TIMEOUT', 'OpenAI API timeout');
        }
      }

      throw new AIError('API_ERROR', 'Failed to call OpenAI API');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatPrompt(message: string, context: ChatMessage[]): string {
    const contextMessages = context
      .slice(-10)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\nUser: ${message}\nAI:`;
  }
}

// DeepSeek Provider实现
export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private options: AIProviderOptions;

  constructor(apiKey: string, options: AIProviderOptions = {}) {
    this.apiKey = apiKey;
    this.options = {
      model: options.model || 'deepseek-chat',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      timeout: options.timeout || 30000,
    };
  }

  async generateResponse(message: string, context: ChatMessage[], options?: AIProviderOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || this.options.timeout!);

    try {
      // DeepSeek API调用实现
      // 在实际使用时，需要安装相应的SDK或直接使用fetch
      // 这里仅作为示例实现

      const formattedContext = this.formatPrompt(message, context);

      // 模拟DeepSeek API调用
      // const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     model: options?.model || this.options.model,
      //     messages: [{ role: 'user', content: formattedContext }],
      //     temperature: options?.temperature || this.options.temperature,
      //     max_tokens: options?.maxTokens || this.options.maxTokens,
      //   }),
      //   signal: controller.signal,
      // });
      // const data = await response.json();
      // return data.choices[0].message.content || '';

      // 暂时使用模拟响应
      return `DeepSeek response to: ${message}`;
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);

      if (error instanceof AIError) {
        throw error;
      } else if (error instanceof Error) {
        if (error.message.includes('authentication')) {
          throw new AIError('AUTH_ERROR', 'DeepSeek API authentication failed');
        } else if (error.message.includes('rate limit')) {
          throw new AIError('RATE_LIMIT', 'DeepSeek API rate limit exceeded');
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          throw new AIError('TIMEOUT', 'DeepSeek API timeout');
        }
      }

      throw new AIError('API_ERROR', 'Failed to call DeepSeek API');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatPrompt(message: string, context: ChatMessage[]): string {
    const contextMessages = context
      .slice(-10)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\nUser: ${message}\nAI:`;
  }
}

// Claude Provider实现
export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private options: AIProviderOptions;

  constructor(apiKey: string, options: AIProviderOptions = {}) {
    this.apiKey = apiKey;
    this.options = {
      model: options.model || 'claude-3-sonnet-20240229',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      timeout: options.timeout || 30000,
    };
  }

  async generateResponse(message: string, context: ChatMessage[], options?: AIProviderOptions): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout || this.options.timeout!);

    try {
      // Claude API调用实现
      // 在实际使用时，需要安装@anthropic-ai/sdk包
      // import Anthropic from '@anthropic-ai/sdk';
      // const anthropic = new Anthropic({ apiKey: this.apiKey });

      const formattedContext = this.formatPrompt(message, context);

      // 模拟Claude API调用
      // const response = await anthropic.messages.create({
      //   model: options?.model || this.options.model!,
      //   max_tokens: options?.maxTokens || this.options.maxTokens!,
      //   messages: [{ role: 'user', content: formattedContext }],
      // });
      // return response.content[0].text || '';

      // 暂时使用模拟响应
      return `Claude response to: ${message}`;
    } catch (error) {
      console.error('Error calling Claude API:', error);

      if (error instanceof AIError) {
        throw error;
      } else if (error instanceof Error) {
        if (error.message.includes('authentication')) {
          throw new AIError('AUTH_ERROR', 'Claude API authentication failed');
        } else if (error.message.includes('rate limit')) {
          throw new AIError('RATE_LIMIT', 'Claude API rate limit exceeded');
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          throw new AIError('TIMEOUT', 'Claude API timeout');
        }
      }

      throw new AIError('API_ERROR', 'Failed to call Claude API');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatPrompt(message: string, context: ChatMessage[]): string {
    const contextMessages = context
      .slice(-10)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\nUser: ${message}\nAI:`;
  }
}

// AI Provider工厂函数
export function createAIProvider(providerType: string, apiKey: string, options?: AIProviderOptions): AIProvider {
  switch (providerType.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(apiKey, options);
    case 'deepseek':
      return new DeepSeekProvider(apiKey, options);
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(apiKey, options);
    default:
      throw new AIError('INVALID_PROVIDER', `Unsupported AI provider: ${providerType}`);
  }
}
