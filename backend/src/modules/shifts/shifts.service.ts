import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateShiftDto,
  CreateShiftTemplateDto,
  QueryShiftsDto,
} from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // ========== SHIFT TEMPLATES ==========

  async findAllTemplates(orgId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { orgId, isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async createTemplate(orgId: string, dto: CreateShiftTemplateDto) {
    return this.prisma.shiftTemplate.create({
      data: {
        orgId,
        name: dto.name,
        code: dto.code,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationHours: dto.durationHours,
        isHalfShift: dto.isHalfShift || false,
        color: dto.color || '#10B981',
      },
    });
  }

  async updateTemplate(id: string, dto: Partial<CreateShiftTemplateDto>) {
    return this.prisma.shiftTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTemplate(id: string) {
    await this.prisma.shiftTemplate.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Template deactivated' };
  }

  // ========== SHIFTS ==========

  async findAll(orgId: string, query: QueryShiftsDto) {
    const where: any = { orgId };

    if (query.startDate && query.endDate) {
      where.date = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    if (query.templateId) {
      where.templateId = query.templateId;
    }

    if (typeof query.isPublished === 'boolean') {
      where.isPublished = query.isPublished;
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        template: true,
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return shifts.map((shift) => ({
      ...shift,
      assignedCount: shift.assignments.length,
      staffingStatus: this.getStaffingStatus(
        shift.assignments.length,
        shift.minStaff,
        shift.maxStaff,
      ),
    }));
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        template: true,
        assignments: {
          include: {
            employee: {
              include: { role: true },
            },
          },
        },
        workloads: {
          include: { category: true },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async create(orgId: string, dto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: {
        orgId,
        templateId: dto.templateId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        minStaff: dto.minStaff || 1,
        maxStaff: dto.maxStaff,
        notes: dto.notes,
      },
      include: { template: true },
    });
  }

  async update(id: string, dto: Partial<CreateShiftDto>) {
    return this.prisma.shift.update({
      where: { id },
      data: {
        templateId: dto.templateId,
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        minStaff: dto.minStaff,
        maxStaff: dto.maxStaff,
        notes: dto.notes,
      },
      include: { template: true },
    });
  }

  async delete(id: string) {
    // Check for assignments
    const assignments = await this.prisma.shiftAssignment.count({
      where: { shiftId: id },
    });

    if (assignments > 0) {
      throw new Error('Cannot delete shift with existing assignments');
    }

    await this.prisma.shift.delete({ where: { id } });
    return { message: 'Shift deleted' };
  }

  async publish(id: string) {
    return this.prisma.shift.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async unpublish(id: string) {
    return this.prisma.shift.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  async bulkCreate(orgId: string, shifts: CreateShiftDto[]) {
    return this.prisma.$transaction(
      shifts.map((dto) =>
        this.prisma.shift.create({
          data: {
            orgId,
            templateId: dto.templateId,
            date: new Date(dto.date),
            startTime: dto.startTime,
            endTime: dto.endTime,
            minStaff: dto.minStaff || 1,
            maxStaff: dto.maxStaff,
          },
        }),
      ),
    );
  }

  private getStaffingStatus(
    assigned: number,
    min: number,
    max: number | null,
  ): 'understaffed' | 'adequate' | 'overstaffed' {
    if (assigned < min) return 'understaffed';
    if (max && assigned > max) return 'overstaffed';
    return 'adequate';
  }
}

