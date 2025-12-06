import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, ContentType } from '@prisma/client';
import { UpskillService } from './upskill.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('upskill')
@ApiBearerAuth()
@Controller('upskill')
export class UpskillController {
  constructor(private upskillService: UpskillService) {}

  @Get('content')
  async getContent(
    @CurrentUser('orgId') orgId: string,
    @Query('category') category?: string,
  ) {
    return this.upskillService.getContent(orgId, category);
  }

  @Post('content')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async createContent(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: {
      title: string;
      description?: string;
      type: ContentType;
      url?: string;
      durationMinutes?: number;
      category?: string;
      tags?: string[];
    },
  ) {
    return this.upskillService.createContent(orgId, dto);
  }

  @Get('my-progress')
  async getMyProgress(@CurrentUser('employeeId') employeeId: string) {
    return this.upskillService.getMyProgress(employeeId);
  }

  @Post('complete/:contentId')
  async markComplete(
    @CurrentUser('employeeId') employeeId: string,
    @Param('contentId') contentId: string,
    @Body() dto: { score?: number },
  ) {
    return this.upskillService.markComplete(employeeId, contentId, dto.score);
  }

  @Post('progress/:contentId')
  async updateProgress(
    @CurrentUser('employeeId') employeeId: string,
    @Param('contentId') contentId: string,
    @Body() dto: { progressPct: number },
  ) {
    return this.upskillService.updateProgress(employeeId, contentId, dto.progressPct);
  }
}

