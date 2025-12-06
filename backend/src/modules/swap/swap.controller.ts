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
import { UserRole, SwapStatus } from '@prisma/client';
import { SwapService } from './swap.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('swap')
@ApiBearerAuth()
@Controller('swaps')
export class SwapController {
  constructor(private swapService: SwapService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'List all swap requests' })
  async findAll(
    @CurrentUser('orgId') orgId: string,
    @Query('status') status?: SwapStatus,
  ) {
    return this.swapService.findAll(orgId, status);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my swap requests' })
  async findMyRequests(@CurrentUser('employeeId') employeeId: string) {
    return this.swapService.findMyRequests(employeeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create swap request' })
  async create(
    @CurrentUser('employeeId') requesterId: string,
    @Body() dto: {
      targetEmployeeId: string;
      myShiftAssignmentId: string;
      theirShiftAssignmentId: string;
      reason?: string;
    },
  ) {
    return this.swapService.create(requesterId, dto);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to swap request (target employee)' })
  async respond(
    @Param('id') id: string,
    @CurrentUser('employeeId') targetId: string,
    @Body() dto: { accept: boolean },
  ) {
    return this.swapService.respond(id, targetId, dto.accept);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Approve swap request (admin)' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.swapService.approve(id, approverId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Reject swap request (admin)' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('sub') approverId: string,
  ) {
    return this.swapService.reject(id, approverId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel swap request' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('employeeId') requesterId: string,
  ) {
    return this.swapService.cancel(id, requesterId);
  }
}

