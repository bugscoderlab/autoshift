import { Injectable } from '@nestjs/common';
import { AIService, AITaskType } from './ai.service';
import { PrismaService } from '../../core/database/prisma.service';

interface ChatContext {
  employeeId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

@Injectable()
export class ChatbotService {
  constructor(
    private aiService: AIService,
    private prisma: PrismaService,
  ) {}

  async processMessage(message: string, context: ChatContext) {
    // Detect intent
    const intent = this.detectIntent(message);

    // Gather relevant data
    const data = await this.gatherData(intent, context.employeeId);

    // Build prompt with context
    const prompt = this.buildPrompt(message, intent, data);

    // Get AI response
    const response = await this.aiService.process(AITaskType.CHAT, { prompt });

    return {
      message: response.content,
      data,
      suggestions: this.getSuggestions(intent),
      intent,
    };
  }

  private detectIntent(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('tomorrow') || lower.includes('next shift') || lower.includes('do i work')) {
      return 'CHECK_SHIFT';
    }
    if (lower.includes('leave') && (lower.includes('balance') || lower.includes('left'))) {
      return 'CHECK_LEAVE';
    }
    if (lower.includes('schedule') || lower.includes('this week')) {
      return 'VIEW_SCHEDULE';
    }
    if (lower.includes('swap')) {
      return 'SWAP_INFO';
    }

    return 'GENERAL';
  }

  private async gatherData(intent: string, employeeId: string) {
    switch (intent) {
      case 'CHECK_SHIFT': {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const shift = await this.prisma.shiftAssignment.findFirst({
          where: { employeeId, date: { gte: now } },
          orderBy: { date: 'asc' },
          include: { shift: { include: { template: true } } },
        });
        return shift;
      }

      case 'CHECK_LEAVE': {
        const year = new Date().getFullYear();
        const balances = await this.prisma.leaveBalance.findMany({
          where: { employeeId, year },
          include: { leaveType: true },
        });
        return balances.map((b) => ({
          type: b.leaveType.name,
          remaining: b.totalDays - b.usedDays - b.pendingDays,
        }));
      }

      case 'VIEW_SCHEDULE': {
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        return this.prisma.shiftAssignment.findMany({
          where: { employeeId, date: { gte: now, lte: weekEnd } },
          orderBy: { date: 'asc' },
          include: { shift: { include: { template: true } } },
        });
      }

      default:
        return null;
    }
  }

  private buildPrompt(message: string, intent: string, data: any): string {
    let context = '';

    if (intent === 'CHECK_SHIFT' && data) {
      context = `
Next shift: ${data.date.toDateString()}
Time: ${data.shift.startTime} - ${data.shift.endTime}
Type: ${data.shift.template?.name || 'Standard'}`;
    } else if (intent === 'CHECK_LEAVE' && data) {
      context = `
Leave balances:
${data.map((b: any) => `- ${b.type}: ${b.remaining} days`).join('\n')}`;
    } else if (intent === 'VIEW_SCHEDULE' && data) {
      context = `
This week's shifts:
${data.map((s: any) => `- ${s.date.toDateString()}: ${s.shift.startTime}-${s.shift.endTime}`).join('\n')}`;
    }

    return `User: "${message}"
${context ? '\nRelevant data:' + context : ''}
\nRespond helpfully and concisely.`;
  }

  private getSuggestions(intent: string): string[] {
    const suggestions: Record<string, string[]> = {
      CHECK_SHIFT: ['Show my schedule', 'Leave balance?', 'Request swap'],
      CHECK_LEAVE: ['Request leave', 'My shifts', 'Leave policy'],
      VIEW_SCHEDULE: ['Next shift', 'Leave balance', 'Request day off'],
      SWAP_INFO: ['Available swaps', 'My schedule', 'Cancel swap'],
      GENERAL: ['Do I work tomorrow?', 'Leave balance', 'My schedule'],
    };
    return suggestions[intent] || suggestions.GENERAL;
  }
}

