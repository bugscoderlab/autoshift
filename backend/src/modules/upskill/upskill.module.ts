import { Module } from '@nestjs/common';
import { UpskillController } from './upskill.controller';
import { UpskillService } from './upskill.service';

@Module({
  controllers: [UpskillController],
  providers: [UpskillService],
  exports: [UpskillService],
})
export class UpskillModule {}

