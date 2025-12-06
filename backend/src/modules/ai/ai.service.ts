import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export enum AIProvider {
  CLAUDE = 'claude',
  GROQ = 'groq',
}

export enum AITaskType {
  ROSTER_GENERATION = 'roster_generation',
  NATURAL_LANGUAGE = 'natural_language',
  CHAT = 'chat',
  EXPLAIN = 'explain',
}

@Injectable()
export class AIService {
  private claude: Anthropic | null = null;
  private groq: Groq | null = null;

  constructor(private config: ConfigService) {
    const anthropicKey = this.config.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.claude = new Anthropic({ apiKey: anthropicKey });
    }

    const groqKey = this.config.get('GROQ_API_KEY');
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async process(taskType: AITaskType, input: { prompt: string; context?: any }) {
    const provider = this.selectProvider(taskType);

    if (provider === AIProvider.CLAUDE && this.claude) {
      return this.processWithClaude(taskType, input);
    } else if (this.groq) {
      return this.processWithGroq(taskType, input);
    }

    throw new Error('No AI provider configured');
  }

  private selectProvider(taskType: AITaskType): AIProvider {
    switch (taskType) {
      case AITaskType.ROSTER_GENERATION:
      case AITaskType.NATURAL_LANGUAGE:
        return AIProvider.CLAUDE;
      case AITaskType.CHAT:
      case AITaskType.EXPLAIN:
        return AIProvider.GROQ;
      default:
        return AIProvider.GROQ;
    }
  }

  private async processWithClaude(taskType: AITaskType, input: { prompt: string }) {
    if (!this.claude) throw new Error('Claude not configured');

    const message = await this.claude.messages.create({
      model: this.config.get('CLAUDE_MODEL') || 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      system: this.getSystemPrompt(taskType),
      messages: [{ role: 'user', content: input.prompt }],
    });

    return {
      provider: AIProvider.CLAUDE,
      content: message.content[0].type === 'text' ? message.content[0].text : '',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }

  private async processWithGroq(taskType: AITaskType, input: { prompt: string }) {
    if (!this.groq) throw new Error('Groq not configured');

    const completion = await this.groq.chat.completions.create({
      model: this.config.get('GROQ_MODEL') || 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: this.getSystemPrompt(taskType) },
        { role: 'user', content: input.prompt },
      ],
      max_tokens: 1024,
    });

    return {
      provider: AIProvider.GROQ,
      content: completion.choices[0]?.message?.content || '',
      usage: {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
      },
    };
  }

  private getSystemPrompt(taskType: AITaskType): string {
    const prompts: Record<AITaskType, string> = {
      [AITaskType.ROSTER_GENERATION]: `You are an expert roster scheduling AI. Generate optimal employee schedules while respecting rest rules, preferences, and fairness.`,
      [AITaskType.NATURAL_LANGUAGE]: `You are a roster management assistant. Parse natural language commands into structured JSON actions for roster modifications.`,
      [AITaskType.CHAT]: `You are a helpful assistant for AutoShift roster system. Answer questions about schedules, leave, and shifts concisely.`,
      [AITaskType.EXPLAIN]: `You are explaining roster decisions. Provide clear, concise explanations for why shifts were assigned.`,
    };
    return prompts[taskType];
  }
}

