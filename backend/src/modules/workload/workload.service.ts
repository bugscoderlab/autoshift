import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class WorkloadService {
  constructor(private prisma: PrismaService) {}

  async getCategories(orgId: string) {
    return this.prisma.workloadCategory.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(orgId: string, dto: { name: string; code: string; minStaff?: number; color?: string }) {
    return this.prisma.workloadCategory.create({
      data: { orgId, ...dto },
    });
  }

  async assignWorkload(dto: { employeeId: string; categoryId: string; shiftId: string; date: string }) {
    return this.prisma.workloadAssignment.create({
      data: {
        employeeId: dto.employeeId,
        categoryId: dto.categoryId,
        shiftId: dto.shiftId,
        date: new Date(dto.date),
      },
    });
  }

  async getDistribution(orgId: string, startDate: Date, endDate: Date) {
    const assignments = await this.prisma.workloadAssignment.findMany({
      where: {
        shift: { orgId },
        date: { gte: startDate, lte: endDate },
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        category: true,
      },
    });

    // Group by employee
    const byEmployee = new Map<string, { name: string; categories: Map<string, number> }>();
    
    for (const a of assignments) {
      const key = a.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          name: `${a.employee.firstName} ${a.employee.lastName}`,
          categories: new Map(),
        });
      }
      const emp = byEmployee.get(key)!;
      const catCount = emp.categories.get(a.category.name) || 0;
      emp.categories.set(a.category.name, catCount + 1);
    }

    return Array.from(byEmployee.entries()).map(([id, data]) => ({
      employeeId: id,
      employeeName: data.name,
      distribution: Object.fromEntries(data.categories),
    }));
  }
}

