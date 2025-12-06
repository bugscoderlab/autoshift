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
import { UserRole, RequestStatus } from '@prisma/client';
import { LeaveService } from './leave.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('leave')
@ApiBearerAuth()
@Controller('leave')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Get('types')
  @ApiOperation({ summary: 'List leave types' })
  async getTypes(@CurrentUser('orgId') orgId: string) {
    return this.leaveService.getTypes(orgId);
  }

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'List all leave requests' })
  async getRequests(
    @CurrentUser('orgId') orgId: string,
    @Query('status') status?: RequestStatus,
  ) {
    return this.leaveService.getRequests(orgId, status);
  }

  @Get('requests/my')
  @ApiOperation({ summary: 'Get my leave requests' })
  async getMyRequests(@CurrentUser('employeeId') employeeId: string) {
    return this.leaveService.getMyRequests(employeeId);
  }

  @Get('balance/:employeeId')
  @ApiOperation({ summary: 'Get leave balance' })
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.leaveService.getBalance(employeeId, year);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create leave request' })
  async create(
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
      isHalfDay?: boolean;
    },
  ) {
    return this.leaveService.create(employeeId, dto);
  }

  @Post('requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Approve leave request' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.leaveService.approve(id, approverId);
  }

  @Post('requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Reject leave request' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.leaveService.reject(id, approverId, dto.reason);
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Cancel leave request' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.leaveService.cancel(id, employeeId);
  }
}

