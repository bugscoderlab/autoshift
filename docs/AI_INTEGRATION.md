# AutoShift AI Integration Guide

## 🤖 AI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI INTEGRATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        AI SERVICE ROUTER                            │   │
│  │  Routes requests to appropriate AI provider based on task type      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐              │
│           │                        │                        │              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │     CLAUDE      │    │      GROQ       │    │   ELEVENLABS    │        │
│  │   (Anthropic)   │    │   (Fast LLM)    │    │     (TTS)       │        │
│  │                 │    │                 │    │                 │        │
│  │ • Complex       │    │ • Quick queries │    │ • Text-to-      │        │
│  │   reasoning     │    │ • Chat responses│    │   Speech        │        │
│  │ • Roster gen    │    │ • Simple        │    │ • Learning      │        │
│  │ • NL commands   │    │   explanations  │    │   content       │        │
│  │ • Conflict      │    │ • Low latency   │    │ • Audiobooks    │        │
│  │   resolution    │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│           │                        │                        │              │
│           └────────────────────────┼────────────────────────┘              │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           LINDY AI                                   │   │
│  │  • Automated workflows  • Content summarization  • Task automation  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       OPTIONAL: MCP LAYER                            │   │
│  │  • Model Context Protocol for structured AI tool interactions       │   │
│  │  • Enables Claude to call backend functions directly                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Provider Configuration

### Environment Variables

```env
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-sonnet-20240229

# Groq (Fast inference)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-70b-versatile

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Lindy AI (Automation)
LINDY_API_KEY=...
LINDY_WORKSPACE_ID=...

# Optional: Model Context Protocol
MCP_ENABLED=false
MCP_SERVER_URL=http://localhost:3001
```

## 📦 AI Service Implementation

### AI Service Router

```typescript
// backend/src/modules/ai/ai.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { ElevenLabsClient } from 'elevenlabs';

export enum AIProvider {
  CLAUDE = 'claude',
  GROQ = 'groq',
  ELEVENLABS = 'elevenlabs',
  LINDY = 'lindy',
}

export enum AITaskType {
  ROSTER_GENERATION = 'roster_generation',
  NATURAL_LANGUAGE_COMMAND = 'nl_command',
  CONFLICT_RESOLUTION = 'conflict_resolution',
  QUICK_QUERY = 'quick_query',
  CHAT = 'chat',
  TEXT_TO_SPEECH = 'tts',
  CONTENT_SUMMARY = 'content_summary',
}

@Injectable()
export class AIService {
  private claude: Anthropic;
  private groq: Groq;
  private elevenLabs: ElevenLabsClient;

  constructor(private config: ConfigService) {
    this.claude = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });

    this.groq = new Groq({
      apiKey: this.config.get('GROQ_API_KEY'),
    });

    this.elevenLabs = new ElevenLabsClient({
      apiKey: this.config.get('ELEVENLABS_API_KEY'),
    });
  }

  /**
   * Route AI request to appropriate provider based on task type
   */
  async processAIRequest(
    taskType: AITaskType,
    input: AIInput,
  ): Promise<AIResponse> {
    const provider = this.selectProvider(taskType);
    
    switch (provider) {
      case AIProvider.CLAUDE:
        return this.processWithClaude(taskType, input);
      case AIProvider.GROQ:
        return this.processWithGroq(taskType, input);
      case AIProvider.ELEVENLABS:
        return this.processWithElevenLabs(input);
      case AIProvider.LINDY:
        return this.processWithLindy(taskType, input);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  private selectProvider(taskType: AITaskType): AIProvider {
    switch (taskType) {
      case AITaskType.ROSTER_GENERATION:
      case AITaskType.NATURAL_LANGUAGE_COMMAND:
      case AITaskType.CONFLICT_RESOLUTION:
        return AIProvider.CLAUDE; // Complex reasoning
      case AITaskType.QUICK_QUERY:
      case AITaskType.CHAT:
        return AIProvider.GROQ; // Fast responses
      case AITaskType.TEXT_TO_SPEECH:
        return AIProvider.ELEVENLABS;
      case AITaskType.CONTENT_SUMMARY:
        return AIProvider.LINDY;
      default:
        return AIProvider.GROQ;
    }
  }

  /**
   * Process complex tasks with Claude
   */
  private async processWithClaude(
    taskType: AITaskType,
    input: AIInput,
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(taskType);
    
    const message = await this.claude.messages.create({
      model: this.config.get('CLAUDE_MODEL') || 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: input.prompt,
        },
      ],
    });

    return {
      provider: AIProvider.CLAUDE,
      content: message.content[0].type === 'text' 
        ? message.content[0].text 
        : '',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }

  /**
   * Process quick queries with Groq
   */
  private async processWithGroq(
    taskType: AITaskType,
    input: AIInput,
  ): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(taskType);
    
    const completion = await this.groq.chat.completions.create({
      model: this.config.get('GROQ_MODEL') || 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
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

  /**
   * Text-to-Speech with ElevenLabs
   */
  private async processWithElevenLabs(input: AIInput): Promise<AIResponse> {
    const voiceId = this.config.get('ELEVENLABS_VOICE_ID');
    
    const audio = await this.elevenLabs.textToSpeech.convert(voiceId, {
      text: input.prompt,
      model_id: 'eleven_turbo_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    return {
      provider: AIProvider.ELEVENLABS,
      content: '',
      audioBase64: audioBuffer.toString('base64'),
      audioMimeType: 'audio/mpeg',
    };
  }

  /**
   * Content summarization with Lindy AI
   */
  private async processWithLindy(
    taskType: AITaskType,
    input: AIInput,
  ): Promise<AIResponse> {
    const lindyApiKey = this.config.get('LINDY_API_KEY');
    const workspaceId = this.config.get('LINDY_WORKSPACE_ID');

    const response = await fetch(
      `https://api.lindy.ai/v1/workspaces/${workspaceId}/run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lindyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input.prompt,
          context: input.context,
        }),
      },
    );

    const result = await response.json();

    return {
      provider: AIProvider.LINDY,
      content: result.output || '',
    };
  }

  private getSystemPrompt(taskType: AITaskType): string {
    const prompts: Record<AITaskType, string> = {
      [AITaskType.ROSTER_GENERATION]: `
You are an expert roster scheduling AI. Your task is to help generate and optimize employee schedules.

Rules you must follow:
1. Respect minimum rest periods between shifts (default 11 hours)
2. Do not schedule employees on approved leave
3. Balance workload fairly across all employees
4. Respect shift preferences when possible
5. Ensure minimum staffing requirements are met

When responding, provide structured JSON output when asked for schedule modifications.
      `,
      [AITaskType.NATURAL_LANGUAGE_COMMAND]: `
You are a roster management assistant. Parse natural language commands into structured actions.

Example commands and their interpretations:
- "Move John to morning shifts" → { action: "prefer", employee: "John", shiftType: "morning" }
- "Swap Alice and Bob on Monday" → { action: "swap", employee1: "Alice", employee2: "Bob", date: "Monday" }
- "Give Sarah more weekend shifts" → { action: "increase", employee: "Sarah", criteria: "weekend" }

Always respond with valid JSON.
      `,
      [AITaskType.CONFLICT_RESOLUTION]: `
You are a scheduling conflict resolver. Analyze roster conflicts and suggest optimal solutions.

Consider:
1. Employee preferences
2. Seniority levels
3. Workload balance
4. Historical patterns
5. Team dynamics

Provide clear reasoning for your suggestions.
      `,
      [AITaskType.QUICK_QUERY]: `
You are a helpful assistant for a roster management system. Answer questions about schedules, leave balances, and shifts concisely.
      `,
      [AITaskType.CHAT]: `
You are a friendly AI assistant for AutoShift, a roster planning system. Help employees with:
- Checking their schedules
- Understanding leave policies
- Answering questions about shifts
- Providing helpful reminders

Be conversational but concise.
      `,
      [AITaskType.TEXT_TO_SPEECH]: '',
      [AITaskType.CONTENT_SUMMARY]: `
Summarize the following content clearly and concisely, highlighting key points relevant to professional development.
      `,
    };

    return prompts[taskType] || prompts[AITaskType.CHAT];
  }
}
```

## 🗣️ AI Chatbot Implementation

### Chatbot Service

```typescript
// backend/src/modules/ai/chatbot.service.ts

import { Injectable } from '@nestjs/common';
import { AIService, AITaskType } from './ai.service';
import { EmployeesService } from '../employees/employees.service';
import { RosterService } from '../roster/roster.service';
import { LeaveService } from '../leave/leave.service';

interface ChatContext {
  employeeId: string;
  conversationHistory: ChatMessage[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable()
export class ChatbotService {
  constructor(
    private aiService: AIService,
    private employeesService: EmployeesService,
    private rosterService: RosterService,
    private leaveService: LeaveService,
  ) {}

  async processMessage(
    message: string,
    context: ChatContext,
  ): Promise<ChatResponse> {
    // 1. Detect intent
    const intent = await this.detectIntent(message);

    // 2. Gather relevant data based on intent
    const data = await this.gatherContextData(intent, context.employeeId);

    // 3. Generate response
    const response = await this.generateResponse(message, intent, data, context);

    // 4. Extract suggestions
    const suggestions = this.generateSuggestions(intent);

    return {
      message: response,
      data,
      suggestions,
      intent,
    };
  }

  private async detectIntent(message: string): Promise<ChatIntent> {
    const lowerMessage = message.toLowerCase();

    // Simple intent detection (can be enhanced with AI)
    if (lowerMessage.includes('tomorrow') || 
        lowerMessage.includes('next shift') ||
        lowerMessage.includes('do i work')) {
      return ChatIntent.CHECK_NEXT_SHIFT;
    }

    if (lowerMessage.includes('leave') && 
        (lowerMessage.includes('balance') || lowerMessage.includes('left') || 
         lowerMessage.includes('remaining') || lowerMessage.includes('how many'))) {
      return ChatIntent.CHECK_LEAVE_BALANCE;
    }

    if (lowerMessage.includes('schedule') || 
        lowerMessage.includes('roster') ||
        lowerMessage.includes('this week')) {
      return ChatIntent.VIEW_SCHEDULE;
    }

    if (lowerMessage.includes('swap') || lowerMessage.includes('exchange')) {
      return ChatIntent.REQUEST_SWAP;
    }

    if (lowerMessage.includes('request leave') || 
        lowerMessage.includes('take leave') ||
        lowerMessage.includes('day off')) {
      return ChatIntent.REQUEST_LEAVE;
    }

    return ChatIntent.GENERAL_QUERY;
  }

  private async gatherContextData(
    intent: ChatIntent,
    employeeId: string,
  ): Promise<any> {
    switch (intent) {
      case ChatIntent.CHECK_NEXT_SHIFT:
        return this.rosterService.getNextShift(employeeId);

      case ChatIntent.CHECK_LEAVE_BALANCE:
        return this.leaveService.getBalance(employeeId);

      case ChatIntent.VIEW_SCHEDULE:
        const today = new Date();
        return this.rosterService.getEmployeeShifts(employeeId, {
          startDate: today,
          endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        });

      default:
        return null;
    }
  }

  private async generateResponse(
    message: string,
    intent: ChatIntent,
    data: any,
    context: ChatContext,
  ): Promise<string> {
    // Build context for AI
    const prompt = this.buildPrompt(message, intent, data, context);

    const response = await this.aiService.processAIRequest(
      AITaskType.CHAT,
      { prompt },
    );

    return response.content;
  }

  private buildPrompt(
    message: string,
    intent: ChatIntent,
    data: any,
    context: ChatContext,
  ): string {
    let dataContext = '';

    switch (intent) {
      case ChatIntent.CHECK_NEXT_SHIFT:
        if (data) {
          dataContext = `
Next shift information:
- Date: ${data.date}
- Time: ${data.startTime} - ${data.endTime}
- Location: ${data.workloadCategory || 'General'}
- Shift type: ${data.template?.name || 'Standard'}
          `;
        } else {
          dataContext = 'No upcoming shifts found.';
        }
        break;

      case ChatIntent.CHECK_LEAVE_BALANCE:
        if (data?.balances) {
          dataContext = 'Leave balances:\n' + 
            data.balances.map((b: any) => 
              `- ${b.leaveType.name}: ${b.remaining} days remaining (${b.used} used)`
            ).join('\n');
        }
        break;

      case ChatIntent.VIEW_SCHEDULE:
        if (data?.length > 0) {
          dataContext = 'Upcoming shifts:\n' +
            data.map((s: any) =>
              `- ${s.date}: ${s.startTime} - ${s.endTime} (${s.template?.name})`
            ).join('\n');
        } else {
          dataContext = 'No shifts scheduled for this period.';
        }
        break;
    }

    return `
User message: "${message}"

Detected intent: ${intent}

${dataContext ? 'Relevant data:\n' + dataContext : ''}

Previous conversation:
${context.conversationHistory.slice(-3).map(m => 
  `${m.role}: ${m.content}`
).join('\n')}

Respond helpfully and conversationally. If providing schedule information, format it clearly.
    `;
  }

  private generateSuggestions(intent: ChatIntent): string[] {
    const suggestions: Record<ChatIntent, string[]> = {
      [ChatIntent.CHECK_NEXT_SHIFT]: [
        'Show my schedule for this week',
        'How many leave days do I have?',
        'Request a swap for this shift',
      ],
      [ChatIntent.CHECK_LEAVE_BALANCE]: [
        'Request annual leave',
        'Show my upcoming shifts',
        'What are the leave policies?',
      ],
      [ChatIntent.VIEW_SCHEDULE]: [
        'When is my next day off?',
        'Show next month\'s schedule',
        'Request a shift change',
      ],
      [ChatIntent.REQUEST_SWAP]: [
        'Who can I swap with?',
        'Show available slots',
        'Cancel swap request',
      ],
      [ChatIntent.REQUEST_LEAVE]: [
        'Check my leave balance',
        'View pending requests',
        'Company leave policy',
      ],
      [ChatIntent.GENERAL_QUERY]: [
        'Do I work tomorrow?',
        'How many leave days left?',
        'Show my schedule',
      ],
    };

    return suggestions[intent] || suggestions[ChatIntent.GENERAL_QUERY];
  }
}

enum ChatIntent {
  CHECK_NEXT_SHIFT = 'check_next_shift',
  CHECK_LEAVE_BALANCE = 'check_leave_balance',
  VIEW_SCHEDULE = 'view_schedule',
  REQUEST_SWAP = 'request_swap',
  REQUEST_LEAVE = 'request_leave',
  GENERAL_QUERY = 'general_query',
}
```

## 🎯 AI Roster Generator

```typescript
// backend/src/modules/ai/roster-generator.service.ts

import { Injectable } from '@nestjs/common';
import { AIService, AITaskType } from './ai.service';

interface RosterGenerationInput {
  month: number;
  year: number;
  employees: Employee[];
  shifts: ShiftTemplate[];
  leaveRequests: LeaveRequest[];
  restRules: RestRule[];
  cyclePattern?: CyclePattern;
  naturalLanguageInstructions?: string;
}

@Injectable()
export class AIRosterGeneratorService {
  constructor(private aiService: AIService) {}

  async generateRoster(input: RosterGenerationInput): Promise<GeneratedRoster> {
    // 1. Run algorithmic generation first
    const algorithmicRoster = await this.runAlgorithmicGeneration(input);

    // 2. If there are NL instructions, apply AI modifications
    if (input.naturalLanguageInstructions) {
      const modifications = await this.processNaturalLanguageInstructions(
        input.naturalLanguageInstructions,
        algorithmicRoster,
        input,
      );

      // Apply modifications
      algorithmicRoster.assignments = this.applyModifications(
        algorithmicRoster.assignments,
        modifications,
      );
    }

    // 3. Validate and optimize
    const validation = this.validateRoster(algorithmicRoster, input);

    // 4. Generate AI explanation
    const explanation = await this.generateExplanation(
      algorithmicRoster,
      validation,
      input,
    );

    return {
      ...algorithmicRoster,
      validation,
      aiExplanation: explanation,
    };
  }

  private async processNaturalLanguageInstructions(
    instructions: string,
    currentRoster: AlgorithmicRoster,
    input: RosterGenerationInput,
  ): Promise<RosterModification[]> {
    const prompt = `
You are a roster optimization AI. Analyze the following instruction and current roster state.

INSTRUCTION: "${instructions}"

CURRENT ROSTER SUMMARY:
- Month: ${input.month}/${input.year}
- Total employees: ${input.employees.length}
- Total assignments: ${currentRoster.assignments.length}
- Shift distribution: ${JSON.stringify(this.getShiftDistribution(currentRoster))}

EMPLOYEES:
${input.employees.map(e => `- ${e.firstName} ${e.lastName} (${e.role.name}, prefers ${e.preferredShift})`).join('\n')}

Based on the instruction, provide modifications as a JSON array:
[
  {
    "action": "reassign" | "swap" | "add" | "remove",
    "employeeId": "uuid",
    "employeeName": "name for reference",
    "fromDate": "YYYY-MM-DD" (if applicable),
    "toDate": "YYYY-MM-DD" (if applicable),
    "fromShiftType": "morning" | "evening" | "night" (if applicable),
    "toShiftType": "morning" | "evening" | "night" (if applicable),
    "reason": "brief explanation"
  }
]

Only suggest valid modifications that don't violate:
- Minimum rest periods (11 hours)
- Approved leave
- Role requirements

Respond ONLY with the JSON array.
    `;

    const response = await this.aiService.processAIRequest(
      AITaskType.NATURAL_LANGUAGE_COMMAND,
      { prompt },
    );

    try {
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  private async generateExplanation(
    roster: AlgorithmicRoster,
    validation: ValidationResult,
    input: RosterGenerationInput,
  ): Promise<string> {
    const prompt = `
Summarize this roster generation in 2-3 sentences for an admin:

ROSTER FOR: ${input.month}/${input.year}
STATISTICS:
- Total shifts assigned: ${roster.assignments.length}
- Unique employees: ${new Set(roster.assignments.map(a => a.employeeId)).size}
- Conflicts found: ${validation.errors.length}
- Warnings: ${validation.warnings.length}
- Workload fairness score: ${validation.metrics.fairnessScore.toFixed(1)}%
- Preference satisfaction: ${validation.metrics.preferenceSatisfaction.toFixed(1)}%

${validation.errors.length > 0 ? 
  'ISSUES:\n' + validation.errors.slice(0, 3).map(e => `- ${e.message}`).join('\n') : 
  'All constraints satisfied.'}

Be specific about what went well and what needs attention.
    `;

    const response = await this.aiService.processAIRequest(
      AITaskType.QUICK_QUERY,
      { prompt },
    );

    return response.content;
  }

  async explainAssignment(
    employeeId: string,
    shiftId: string,
    rosterContext: any,
  ): Promise<string> {
    const prompt = `
Explain why this shift was assigned to this employee in a conversational way:

EMPLOYEE: ${rosterContext.employee.firstName} ${rosterContext.employee.lastName}
- Role: ${rosterContext.employee.role.name}
- Seniority: Level ${rosterContext.employee.seniorityLevel}
- Preference: ${rosterContext.employee.preferredShift} shifts
- Current month workload: ${rosterContext.currentWorkload} shifts

SHIFT:
- Date: ${rosterContext.shift.date}
- Time: ${rosterContext.shift.startTime} - ${rosterContext.shift.endTime}
- Type: ${rosterContext.shift.template.name}

ASSIGNMENT REASONS:
${rosterContext.reasons.map((r: string) => `- ${r}`).join('\n')}

Explain this in 2-3 sentences from the employee's perspective, as if answering "Why was I assigned this shift?"
    `;

    const response = await this.aiService.processAIRequest(
      AITaskType.QUICK_QUERY,
      { prompt },
    );

    return response.content;
  }
}
```

## 📚 Upskill Module with AI

```typescript
// backend/src/modules/ai/upskill-ai.service.ts

import { Injectable } from '@nestjs/common';
import { AIService, AITaskType } from './ai.service';

@Injectable()
export class UpskillAIService {
  constructor(private aiService: AIService) {}

  /**
   * Summarize learning content using Lindy AI
   */
  async summarizeContent(content: {
    title: string;
    body: string;
    type: 'article' | 'video_transcript' | 'document';
  }): Promise<ContentSummary> {
    const response = await this.aiService.processAIRequest(
      AITaskType.CONTENT_SUMMARY,
      {
        prompt: `
Summarize the following ${content.type} for a professional:

TITLE: ${content.title}

CONTENT:
${content.body}

Provide:
1. A brief summary (2-3 sentences)
2. Key takeaways (bullet points)
3. Relevance to professional development
        `,
        context: { type: content.type },
      },
    );

    // Parse structured response
    return this.parseSummaryResponse(response.content);
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(text: string): Promise<{
    audioBase64: string;
    mimeType: string;
  }> {
    const response = await this.aiService.processAIRequest(
      AITaskType.TEXT_TO_SPEECH,
      { prompt: text },
    );

    return {
      audioBase64: response.audioBase64!,
      mimeType: response.audioMimeType!,
    };
  }

  /**
   * Recommend learning content based on employee's workload and role
   */
  async recommendContent(context: {
    employeeId: string;
    role: string;
    recentWorkloads: string[];
    completedContent: string[];
    availableContent: ContentItem[];
  }): Promise<ContentRecommendation[]> {
    const response = await this.aiService.processAIRequest(
      AITaskType.QUICK_QUERY,
      {
        prompt: `
Recommend learning content for this employee:

ROLE: ${context.role}
RECENT WORK AREAS: ${context.recentWorkloads.join(', ')}
ALREADY COMPLETED: ${context.completedContent.length} items

AVAILABLE CONTENT:
${context.availableContent.map(c => 
  `- ID: ${c.id}, Title: "${c.title}", Category: ${c.category}, Duration: ${c.durationMinutes}min`
).join('\n')}

Select the top 3 most relevant items and explain why. Respond as JSON:
[
  {
    "contentId": "id",
    "reason": "brief explanation",
    "priority": 1-3
  }
]
        `,
      },
    );

    try {
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  private parseSummaryResponse(response: string): ContentSummary {
    // Simple parsing - in production, use more robust parsing
    const lines = response.split('\n').filter(l => l.trim());
    
    return {
      summary: lines[0] || '',
      keyTakeaways: lines.slice(1, -1).filter(l => l.startsWith('-')),
      relevance: lines[lines.length - 1] || '',
    };
  }
}

interface ContentSummary {
  summary: string;
  keyTakeaways: string[];
  relevance: string;
}

interface ContentRecommendation {
  contentId: string;
  reason: string;
  priority: number;
}
```

## 🔌 Optional: MCP Integration

```typescript
// backend/src/modules/ai/mcp.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Model Context Protocol integration for structured AI-tool interactions
 * This allows Claude to directly call backend functions
 */
@Injectable()
export class MCPService {
  private enabled: boolean;

  constructor(private config: ConfigService) {
    this.enabled = this.config.get('MCP_ENABLED') === 'true';
  }

  /**
   * Register available tools with MCP
   */
  getToolDefinitions() {
    return [
      {
        name: 'get_employee_schedule',
        description: 'Get the schedule for a specific employee',
        parameters: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'Employee UUID' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
          required: ['employeeId'],
        },
      },
      {
        name: 'get_leave_balance',
        description: 'Get leave balance for an employee',
        parameters: {
          type: 'object',
          properties: {
            employeeId: { type: 'string' },
          },
          required: ['employeeId'],
        },
      },
      {
        name: 'check_shift_availability',
        description: 'Check if an employee is available for a specific shift',
        parameters: {
          type: 'object',
          properties: {
            employeeId: { type: 'string' },
            shiftId: { type: 'string' },
            date: { type: 'string', format: 'date' },
          },
          required: ['employeeId', 'date'],
        },
      },
      {
        name: 'suggest_swap_partners',
        description: 'Find employees who can swap shifts',
        parameters: {
          type: 'object',
          properties: {
            employeeId: { type: 'string' },
            shiftAssignmentId: { type: 'string' },
          },
          required: ['employeeId', 'shiftAssignmentId'],
        },
      },
    ];
  }

  /**
   * Execute a tool call from AI
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    if (!this.enabled) {
      throw new Error('MCP is not enabled');
    }

    // Route to appropriate service method
    // Implementation depends on injected services
    switch (toolName) {
      case 'get_employee_schedule':
        // return this.rosterService.getEmployeeShifts(...)
        break;
      case 'get_leave_balance':
        // return this.leaveService.getBalance(...)
        break;
      // ... other tools
    }
  }
}
```

## 📊 AI Logging & Analytics

```typescript
// backend/src/modules/ai/ai-logger.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AIProvider, AITaskType } from './ai.service';

@Injectable()
export class AILoggerService {
  constructor(private prisma: PrismaService) {}

  async logAIRequest(log: {
    orgId: string;
    userId?: string;
    actionType: AITaskType;
    provider: AIProvider;
    input: string;
    output: string;
    tokensUsed?: number;
    latencyMs: number;
    success: boolean;
    error?: string;
  }) {
    return this.prisma.aiLog.create({
      data: {
        orgId: log.orgId,
        userId: log.userId,
        actionType: log.actionType,
        provider: log.provider,
        input: log.input.slice(0, 5000), // Truncate for storage
        output: log.output.slice(0, 10000),
        tokensUsed: log.tokensUsed,
        latencyMs: log.latencyMs,
        success: log.success,
        error: log.error,
      },
    });
  }

  async getUsageStats(orgId: string, period: 'day' | 'week' | 'month') {
    const startDate = this.getStartDate(period);

    const stats = await this.prisma.aiLog.groupBy({
      by: ['provider', 'actionType'],
      where: {
        orgId,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: { tokensUsed: true },
      _avg: { latencyMs: true },
    });

    return stats;
  }

  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }
}
```

