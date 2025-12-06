import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkloadService } from './workload.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workload')
@ApiBearerAuth()
@Controller('workload')
export class WorkloadController {
  constructor(private workloadService: WorkloadService) {}

  @Get('categories')
  async getCategories(@CurrentUser('orgId') orgId: string) {
    return this.workloadService.getCategories(orgId);
  }

  @Post('categories')
  async createCategory(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: { name: string; code: string; minStaff?: number; color?: string },
  ) {
    return this.workloadService.createCategory(orgId, dto);
  }

  @Post('assign')
  async assignWorkload(
    @Body() dto: { employeeId: string; categoryId: string; shiftId: string; date: string },
  ) {
    return this.workloadService.assignWorkload(dto);
  }

  @Get('distribution')
  async getDistribution(
    @CurrentUser('orgId') orgId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workloadService.getDistribution(
      orgId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}

