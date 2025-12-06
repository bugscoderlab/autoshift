import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  QueryEmployeesDto,
} from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: QueryEmployeesDto) {
    const { page = 1, limit = 20, roleId, typeId, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { orgId };

    if (roleId) where.roleId = roleId;
    if (typeId) where.typeId = typeId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ seniorityLevel: 'desc' }, { firstName: 'asc' }],
        include: {
          role: true,
          type: true,
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        role: true,
        type: true,
        organization: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async create(orgId: string, dto: CreateEmployeeDto) {
    // Check for duplicate email
    const existing = await this.prisma.employee.findFirst({
      where: { orgId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Employee with this email already exists');
    }

    // Generate employee code if not provided
    const employeeCode =
      dto.employeeCode || (await this.generateEmployeeCode(orgId));

    const employee = await this.prisma.employee.create({
      data: {
        orgId,
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        typeId: dto.typeId,
        joinDate: new Date(dto.joinDate),
        seniorityLevel: dto.seniorityLevel || 1,
        preferredShift: dto.preferredShift,
        maxHoursPerWeek: dto.maxHoursPerWeek || 40,
      },
      include: {
        role: true,
        type: true,
      },
    });

    // Create default leave balances
    await this.createDefaultLeaveBalances(employee.id, orgId);

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        typeId: dto.typeId,
        seniorityLevel: dto.seniorityLevel,
        preferredShift: dto.preferredShift,
        maxHoursPerWeek: dto.maxHoursPerWeek,
        isActive: dto.isActive,
      },
      include: {
        role: true,
        type: true,
      },
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete
    await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Employee deactivated successfully' };
  }

  async getShifts(employeeId: string, startDate?: Date, endDate?: Date) {
    const where: any = { employeeId };

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.shiftAssignment.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        shift: {
          include: {
            template: true,
          },
        },
      },
    });
  }

  async getLeaveBalance(employeeId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
      include: {
        leaveType: true,
      },
    });

    return {
      employeeId,
      year: currentYear,
      balances: balances.map((b) => ({
        leaveType: b.leaveType,
        entitled: b.totalDays,
        used: b.usedDays,
        pending: b.pendingDays,
        remaining: b.totalDays - b.usedDays - b.pendingDays,
      })),
    };
  }

  async updatePreferences(
    employeeId: string,
    preferences: { preferredShift?: string; maxHoursPerWeek?: number },
  ) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        preferredShift: preferences.preferredShift,
        maxHoursPerWeek: preferences.maxHoursPerWeek,
      },
    });
  }

  private async generateEmployeeCode(orgId: string): Promise<string> {
    const count = await this.prisma.employee.count({ where: { orgId } });
    return `EMP${String(count + 1).padStart(4, '0')}`;
  }

  private async createDefaultLeaveBalances(
    employeeId: string,
    orgId: string,
  ): Promise<void> {
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { orgId, isActive: true },
    });

    const year = new Date().getFullYear();

    await this.prisma.leaveBalance.createMany({
      data: leaveTypes.map((lt) => ({
        employeeId,
        leaveTypeId: lt.id,
        year,
        totalDays: lt.defaultDays,
        usedDays: 0,
        pendingDays: 0,
      })),
    });
  }
}

