import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RosterService } from './roster.service';
import { RosterGeneratorService } from './roster-generator.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('roster')
@ApiBearerAuth()
@Controller('roster')
export class RosterController {
  constructor(
    private rosterService: RosterService,
    private generatorService: RosterGeneratorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get roster calendar' })
  async getCalendar(
    @CurrentUser('orgId') orgId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.rosterService.getCalendar(orgId, month, year);
  }

  @Get('my-shifts')
  @ApiOperation({ summary: 'Get current user shifts' })
  async getMyShifts(
    @CurrentUser('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.rosterService.getMyShifts(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('next-shift')
  @ApiOperation({ summary: 'Get next shift for current user' })
  async getNextShift(@CurrentUser('employeeId') employeeId: string) {
    return this.rosterService.getNextShift(employeeId);
  }

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'AI-generate roster' })
  async generate(
    @CurrentUser('orgId') orgId: string,
    @Body()
    options: {
      month: number;
      year: number;
      useCyclePattern?: boolean;
      patternId?: string;
      respectPreferences?: boolean;
      balanceWorkload?: boolean;
      enforceRestRules?: boolean;
      excludeEmployees?: string[];
    },
  ) {
    return this.generatorService.generate(orgId, options);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign employee to shift' })
  async assign(@Body() dto: { employeeId: string; shiftId: string }) {
    return this.rosterService.assign(dto.employeeId, dto.shiftId);
  }

  @Delete('unassign/:assignmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove assignment' })
  async unassign(@Param('assignmentId') assignmentId: string) {
    return this.rosterService.unassign(assignmentId);
  }

  @Post('bulk-assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk assign employees to shifts' })
  async bulkAssign(
    @Body() assignments: Array<{ employeeId: string; shiftId: string }>,
  ) {
    return this.rosterService.bulkAssign(assignments);
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish roster for month' })
  async publish(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: { month: number; year: number },
  ) {
    return this.rosterService.publish(orgId, dto.month, dto.year);
  }

  @Get('conflicts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check for conflicts' })
  async getConflicts(
    @CurrentUser('orgId') orgId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.rosterService.getConflicts(orgId, month, year);
  }
}

