import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [AIController],
  providers: [AIService, ChatbotService],
  exports: [AIService, ChatbotService],
})
export class AIModule {}

