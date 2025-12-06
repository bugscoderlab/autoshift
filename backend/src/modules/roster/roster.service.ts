import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AssignmentStatus } from '@prisma/client';

@Injectable()
export class RosterService {
  constructor(private prisma: PrismaService) {}

  async getCalendar(orgId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const shifts = await this.prisma.shift.findMany({
      where: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
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
                role: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    });

    // Group by date
    const calendar = this.groupShiftsByDate(shifts, startDate, endDate);

    // Summary stats
    const summary = {
      totalShifts: shifts.length,
      staffedShifts: shifts.filter((s) => s.assignments.length >= s.minStaff).length,
      understaffedShifts: shifts.filter((s) => s.assignments.length < s.minStaff).length,
      publishedDays: new Set(
        shifts.filter((s) => s.isPublished).map((s) => s.date.toISOString().split('T')[0]),
      ).size,
    };

    return { month, year, calendar, summary };
  }

  async getMyShifts(employeeId: string, startDate?: Date, endDate?: Date) {
    const where: any = { employeeId };

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else {
      // Default: current month + next month
      const now = new Date();
      where.date = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 2, 0),
      };
    }

    return this.prisma.shiftAssignment.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        shift: {
          include: {
            template: true,
            workloads: { include: { category: true } },
          },
        },
      },
    });
  }

  async getNextShift(employeeId: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        date: { gte: now },
        status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED] },
      },
      orderBy: { date: 'asc' },
      include: {
        shift: {
          include: { template: true },
        },
      },
    });
  }

  async assign(employeeId: string, shiftId: string) {
    // Validate employee and shift exist
    const [employee, shift] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: employeeId } }),
      this.prisma.shift.findUnique({ where: { id: shiftId } }),
    ]);

    if (!employee) throw new NotFoundException('Employee not found');
    if (!shift) throw new NotFoundException('Shift not found');

    // Check for existing assignment
    const existing = await this.prisma.shiftAssignment.findFirst({
      where: { employeeId, shiftId },
    });

    if (existing) {
      throw new BadRequestException('Employee already assigned to this shift');
    }

    // Check for conflicts (same day assignment)
    const sameDayAssignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        date: shift.date,
      },
    });

    if (sameDayAssignment) {
      throw new BadRequestException('Employee already has a shift on this day');
    }

    return this.prisma.shiftAssignment.create({
      data: {
        employeeId,
        shiftId,
        date: shift.date,
        status: AssignmentStatus.ASSIGNED,
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        shift: { include: { template: true } },
      },
    });
  }

  async unassign(assignmentId: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.shiftAssignment.delete({
      where: { id: assignmentId },
    });

    return { message: 'Assignment removed' };
  }

  async bulkAssign(
    assignments: Array<{ employeeId: string; shiftId: string }>,
  ) {
    const results = await Promise.allSettled(
      assignments.map(({ employeeId, shiftId }) =>
        this.assign(employeeId, shiftId),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      total: assignments.length,
      successful,
      failed,
      details: results.map((r, i) => ({
        ...assignments[i],
        status: r.status,
        error: r.status === 'rejected' ? (r as PromiseRejectedResult).reason.message : null,
      })),
    };
  }

  async publish(orgId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await this.prisma.shift.updateMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      data: { isPublished: true },
    });

    return { message: `Published ${result.count} shifts` };
  }

  async getConflicts(orgId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const shifts = await this.prisma.shift.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
      },
    });

    const conflicts: any[] = [];

    // Check understaffing
    for (const shift of shifts) {
      if (shift.assignments.length < shift.minStaff) {
        conflicts.push({
          type: 'understaffed',
          shiftId: shift.id,
          date: shift.date,
          required: shift.minStaff,
          assigned: shift.assignments.length,
          shortage: shift.minStaff - shift.assignments.length,
        });
      }
    }

    // Check rest rules violations
    const restViolations = await this.checkRestRuleViolations(orgId, startDate, endDate);
    conflicts.push(...restViolations);

    return { conflicts, total: conflicts.length };
  }

  private groupShiftsByDate(shifts: any[], start: Date, end: Date) {
    const calendar: any[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayShifts = shifts.filter(
        (s) => s.date.toISOString().split('T')[0] === dateStr,
      );

      calendar.push({
        date: dateStr,
        dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'long' }),
        shifts: dayShifts.map((s) => ({
          id: s.id,
          template: s.template?.name || 'Custom',
          time: `${s.startTime}-${s.endTime}`,
          minStaff: s.minStaff,
          assignments: s.assignments.map((a: any) => ({
            id: a.id,
            employeeId: a.employee.id,
            employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
            role: a.employee.role?.name,
            status: a.status,
          })),
          isPublished: s.isPublished,
          staffingStatus:
            s.assignments.length >= s.minStaff
              ? 'adequate'
              : 'understaffed',
        })),
      });

      current.setDate(current.getDate() + 1);
    }

    return calendar;
  }

  private async checkRestRuleViolations(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const violations: any[] = [];

    // Get all assignments in the period
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        shift: { orgId },
        date: { gte: startDate, lte: endDate },
      },
      include: {
        employee: true,
        shift: true,
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    // Group by employee
    const byEmployee = new Map<string, any[]>();
    for (const a of assignments) {
      const existing = byEmployee.get(a.employeeId) || [];
      existing.push(a);
      byEmployee.set(a.employeeId, existing);
    }

    // Check each employee
    for (const [employeeId, empAssignments] of byEmployee) {
      // Sort by date and time
      empAssignments.sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );

      for (let i = 1; i < empAssignments.length; i++) {
        const prev = empAssignments[i - 1];
        const curr = empAssignments[i];

        // Calculate rest time
        const prevEnd = this.parseTime(prev.shift.endTime, prev.date);
        const currStart = this.parseTime(curr.shift.startTime, curr.date);
        const restHours = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);

        if (restHours < 11) {
          violations.push({
            type: 'rest_violation',
            employeeId,
            employeeName: `${prev.employee.firstName} ${prev.employee.lastName}`,
            prevShiftId: prev.shiftId,
            currShiftId: curr.shiftId,
            restHours: Math.round(restHours * 10) / 10,
            requiredHours: 11,
          });
        }
      }
    }

    return violations;
  }

  private parseTime(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

