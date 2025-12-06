import { Module } from '@nestjs/common';
import { RosterController } from './roster.controller';
import { RosterService } from './roster.service';
import { RosterGeneratorService } from './roster-generator.service';
import { RuleEngineService } from '../../core/rule-engine/rule-engine.service';

@Module({
  controllers: [RosterController],
  providers: [RosterService, RosterGeneratorService, RuleEngineService],
  exports: [RosterService, RosterGeneratorService],
})
export class RosterModule {}

