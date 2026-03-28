import { ChatMessage } from '../models/types';

interface AIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions = {}) {
    this.options = {
      model: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    };
  }

  async generateResponse(message: string, context: ChatMessage[] = []): Promise<string> {
    // 模拟AI响应，实际项目中应该调用真实的AI API
    // 这里仅作为示例实现
    const response = await new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`AI response to: ${message}`);
      }, 1000);
    });

    return response;
  }

  formatPrompt(message: string, context: ChatMessage[]): string {
    const contextMessages = context
      .slice(-10) // 只保留最近的10条消息作为上下文
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `${contextMessages}\nUser: ${message}\nAI:`;
  }
}

export const aiService = new AIService();
