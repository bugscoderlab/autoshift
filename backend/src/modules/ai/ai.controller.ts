import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIService, AITaskType } from './ai.service';
import { ChatbotService } from './chatbot.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AIController {
  constructor(
    private aiService: AIService,
    private chatbotService: ChatbotService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'AI chatbot query' })
  async chat(
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: { message: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> },
  ) {
    return this.chatbotService.processMessage(dto.message, {
      employeeId,
      history: dto.history || [],
    });
  }

  @Post('explain')
  @ApiOperation({ summary: 'Explain assignment decision' })
  async explain(@Body() dto: { employeeId: string; shiftId: string; context: any }) {
    const prompt = `Explain why employee was assigned this shift:
Employee: ${dto.context.employeeName}
Shift: ${dto.context.shiftDate} ${dto.context.shiftTime}
Reasons: ${dto.context.reasons?.join(', ') || 'Standard assignment'}

Provide a brief, friendly explanation from the employee's perspective.`;

    return this.aiService.process(AITaskType.EXPLAIN, { prompt });
  }

  @Post('natural-language')
  @ApiOperation({ summary: 'Process natural language command' })
  async naturalLanguage(@Body() dto: { command: string; rosterContext: any }) {
    const prompt = `Parse this roster command: "${dto.command}"

Current roster summary: ${JSON.stringify(dto.rosterContext)}

Return JSON array of modifications:
[{ "action": "reassign|swap|add|remove", "employeeId": "...", "details": "..." }]`;

    return this.aiService.process(AITaskType.NATURAL_LANGUAGE, { prompt });
  }
}

