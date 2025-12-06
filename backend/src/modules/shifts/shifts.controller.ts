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
import { ShiftsService } from './shifts.service';
import {
  CreateShiftDto,
  CreateShiftTemplateDto,
  QueryShiftsDto,
} from './dto/shift.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  // ========== TEMPLATES ==========

  @Get('templates')
  @ApiOperation({ summary: 'List shift templates' })
  async findAllTemplates(@CurrentUser('orgId') orgId: string) {
    return this.shiftsService.findAllTemplates(orgId);
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create shift template' })
  async createTemplate(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateShiftTemplateDto,
  ) {
    return this.shiftsService.createTemplate(orgId, dto);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update shift template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateShiftTemplateDto>,
  ) {
    return this.shiftsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete shift template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.shiftsService.deleteTemplate(id);
  }

  // ========== SHIFTS ==========

  @Get()
  @ApiOperation({ summary: 'List shifts' })
  async findAll(
    @CurrentUser('orgId') orgId: string,
    @Query() query: QueryShiftsDto,
  ) {
    return this.shiftsService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  async findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create shift' })
  async create(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftsService.create(orgId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update shift' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateShiftDto>) {
    return this.shiftsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete shift' })
  async delete(@Param('id') id: string) {
    return this.shiftsService.delete(id);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish shift' })
  async publish(@Param('id') id: string) {
    return this.shiftsService.publish(id);
  }

  @Post(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unpublish shift' })
  async unpublish(@Param('id') id: string) {
    return this.shiftsService.unpublish(id);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk create shifts' })
  async bulkCreate(
    @CurrentUser('orgId') orgId: string,
    @Body() shifts: CreateShiftDto[],
  ) {
    return this.shiftsService.bulkCreate(orgId, shifts);
  }
}

