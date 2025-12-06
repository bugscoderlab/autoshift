import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlySummary(orgId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [employees, shifts, assignments, leaves, swaps] = await Promise.all([
      this.prisma.employee.count({ where: { orgId, isActive: true } }),
      this.prisma.shift.count({
        where: { orgId, date: { gte: startDate, lte: endDate } },
      }),
      this.prisma.shiftAssignment.findMany({
        where: { shift: { orgId }, date: { gte: startDate, lte: endDate } },
        include: { shift: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employee: { orgId },
          status: 'APPROVED',
          startDate: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.swapRequest.count({
        where: {
          requester: { orgId },
          status: 'APPROVED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Calculate hours
    const totalHours = assignments.reduce((sum, a) => {
      const [startH, startM] = a.shift.startTime.split(':').map(Number);
      const [endH, endM] = a.shift.endTime.split(':').map(Number);
      return sum + (endH * 60 + endM - startH * 60 - startM) / 60;
    }, 0);

    // Calculate workload per employee
    const workloadByEmployee = new Map<string, number>();
    for (const a of assignments) {
      workloadByEmployee.set(
        a.employeeId,
        (workloadByEmployee.get(a.employeeId) || 0) + 1,
      );
    }

    const workloads = Array.from(workloadByEmployee.values());
    const avgHours = employees > 0 ? totalHours / employees : 0;

    return {
      month,
      year,
      summary: {
        totalEmployees: employees,
        totalShifts: shifts,
        totalAssignments: assignments.length,
        totalHoursWorked: Math.round(totalHours),
        averageHoursPerEmployee: Math.round(avgHours * 10) / 10,
        leaveDays: leaves.reduce((s, l) => s + l.totalDays, 0),
        swapsCompleted: swaps,
        understaffedShifts: 0, // Would need to calculate
      },
      workloadDistribution: {
        min: Math.min(...workloads, 0),
        max: Math.max(...workloads, 0),
        average: workloads.length ? workloads.reduce((a, b) => a + b) / workloads.length : 0,
      },
    };
  }

  async getHoursWorked(orgId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { shift: { orgId }, date: { gte: startDate, lte: endDate } },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        shift: true,
      },
    });

    const byEmployee = new Map<string, { name: string; hours: number; shifts: number }>();

    for (const a of assignments) {
      const key = a.employeeId;
      const [startH, startM] = a.shift.startTime.split(':').map(Number);
      const [endH, endM] = a.shift.endTime.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;

      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          name: `${a.employee.firstName} ${a.employee.lastName}`,
          hours: 0,
          shifts: 0,
        });
      }
      const emp = byEmployee.get(key)!;
      emp.hours += hours;
      emp.shifts += 1;
    }

    return Array.from(byEmployee.entries()).map(([id, data]) => ({
      employeeId: id,
      ...data,
    }));
  }

  async exportToExcel(orgId: string, month: number, year: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Roster');

    // Get data
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { shift: { orgId }, date: { gte: startDate, lte: endDate } },
      include: {
        employee: { select: { firstName: true, lastName: true, role: true } },
        shift: { include: { template: true } },
      },
      orderBy: [{ date: 'asc' }, { shift: { startTime: 'asc' } }],
    });

    // Headers
    sheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Employee', key: 'employee', width: 20 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Shift', key: 'shift', width: 15 },
      { header: 'Start', key: 'start', width: 10 },
      { header: 'End', key: 'end', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Data rows
    for (const a of assignments) {
      sheet.addRow({
        date: a.date.toISOString().split('T')[0],
        employee: `${a.employee.firstName} ${a.employee.lastName}`,
        role: a.employee.role?.name || '',
        shift: a.shift.template?.name || 'Custom',
        start: a.shift.startTime,
        end: a.shift.endTime,
        status: a.status,
      });
    }

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

