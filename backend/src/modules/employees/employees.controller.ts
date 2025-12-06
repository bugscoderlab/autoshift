import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeesDto,
  UpdatePreferencesDto,
} from './dto/employee.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'List all employees' })
  async findAll(
    @CurrentUser('orgId') orgId: string,
    @Query() query: QueryEmployeesDto,
  ) {
    return this.employeesService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new employee' })
  async create(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(orgId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update employee' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate employee' })
  async remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Get(':id/shifts')
  @ApiOperation({ summary: 'Get employee shifts' })
  async getShifts(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.employeesService.getShifts(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id/leave-balance')
  @ApiOperation({ summary: 'Get employee leave balance' })
  async getLeaveBalance(
    @Param('id') id: string,
    @Query('year') year?: number,
  ) {
    return this.employeesService.getLeaveBalance(id, year);
  }

  @Put(':id/preferences')
  @ApiOperation({ summary: 'Update shift preferences' })
  async updatePreferences(
    @Param('id') id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.employeesService.updatePreferences(id, dto);
  }
}

