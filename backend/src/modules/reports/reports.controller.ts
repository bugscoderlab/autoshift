import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('monthly-summary')
  async getMonthlySummary(
    @CurrentUser('orgId') orgId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.reportsService.getMonthlySummary(orgId, month, year);
  }

  @Get('hours-worked')
  async getHoursWorked(
    @CurrentUser('orgId') orgId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.reportsService.getHoursWorked(orgId, month, year);
  }

  @Post('export')
  async exportExcel(
    @CurrentUser('orgId') orgId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(orgId, month, year);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=roster-${month}-${year}.xlsx`,
    );
    res.send(buffer);
  }
}

