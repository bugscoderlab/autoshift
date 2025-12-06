import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ConstraintResult {
  satisfied: boolean;
  violation?: string;
  penalty?: number;
}

export interface Assignment {
  employeeId: string;
  shiftId: string;
  date: Date;
}

@Injectable()
export class RuleEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check minimum rest hours between shifts
   */
  async checkMinimumRest(
    employeeId: string,
    newShift: { date: Date; startTime: string; endTime: string },
    existingAssignments: any[],
    minRestHours: number = 11,
  ): Promise<ConstraintResult> {
    const newShiftStart = this.parseTime(newShift.startTime, newShift.date);

    for (const existing of existingAssignments) {
      const existingEnd = this.parseTime(existing.shift.endTime, existing.date);
      const existingStart = this.parseTime(existing.shift.startTime, existing.date);

      // Check if new shift starts too soon after existing shift ends
      if (newShift.date > existing.date) {
        const restHours =
          (newShiftStart.getTime() - existingEnd.getTime()) / (1000 * 60 * 60);
        if (restHours < minRestHours) {
          return {
            satisfied: false,
            violation: `Only ${restHours.toFixed(1)} hours rest, requires ${minRestHours}`,
          };
        }
      }

      // Check if existing shift starts too soon after new shift ends
      if (existing.date > newShift.date) {
        const newShiftEnd = this.parseTime(newShift.endTime, newShift.date);
        const restHours =
          (existingStart.getTime() - newShiftEnd.getTime()) / (1000 * 60 * 60);
        if (restHours < minRestHours) {
          return {
            satisfied: false,
            violation: `Only ${restHours.toFixed(1)} hours rest before next shift`,
          };
        }
      }
    }

    return { satisfied: true };
  }

  /**
   * Check maximum consecutive working days
   */
  async checkConsecutiveDays(
    employeeId: string,
    newDate: Date,
    existingAssignments: any[],
    maxDays: number = 6,
  ): Promise<ConstraintResult> {
    const dates = existingAssignments.map((a) => a.date.getTime());
    dates.push(newDate.getTime());
    dates.sort((a, b) => a - b);

    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < dates.length; i++) {
      const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    if (maxConsecutive > maxDays) {
      return {
        satisfied: false,
        violation: `${maxConsecutive} consecutive days exceeds limit of ${maxDays}`,
      };
    }

    return { satisfied: true };
  }

  /**
   * Check maximum hours per week
   */
  async checkWeeklyHours(
    employeeId: string,
    newShiftHours: number,
    weekStart: Date,
    existingAssignments: any[],
    maxHours: number = 48,
  ): Promise<ConstraintResult> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekAssignments = existingAssignments.filter(
      (a) => a.date >= weekStart && a.date < weekEnd,
    );

    const currentHours = weekAssignments.reduce(
      (sum, a) => sum + (a.shift.durationHours || 8),
      0,
    );

    const totalHours = currentHours + newShiftHours;

    if (totalHours > maxHours) {
      return {
        satisfied: false,
        violation: `Weekly hours (${totalHours}) exceeds limit of ${maxHours}`,
      };
    }

    return { satisfied: true };
  }

  /**
   * Check employee is not on leave
   */
  async checkNotOnLeave(
    employeeId: string,
    date: Date,
  ): Promise<ConstraintResult> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (leave) {
      return {
        satisfied: false,
        violation: 'Employee is on approved leave',
      };
    }

    return { satisfied: true };
  }

  /**
   * Check employee qualification for role
   */
  async checkQualification(
    employeeId: string,
    requiredRoles: string[],
  ): Promise<ConstraintResult> {
    if (!requiredRoles || requiredRoles.length === 0) {
      return { satisfied: true };
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    if (!employee) {
      return {
        satisfied: false,
        violation: 'Employee not found',
      };
    }

    const isQualified = requiredRoles.includes(employee.role.code);

    if (!isQualified) {
      return {
        satisfied: false,
        violation: `Role ${employee.role.name} not qualified for this shift`,
      };
    }

    return { satisfied: true };
  }

  /**
   * Check minimum staffing requirements
   */
  async checkMinimumStaffing(
    shiftId: string,
    currentAssignments: number,
    minRequired: number,
  ): Promise<ConstraintResult> {
    if (currentAssignments < minRequired) {
      return {
        satisfied: false,
        violation: `Understaffed: ${currentAssignments}/${minRequired}`,
        penalty: (minRequired - currentAssignments) * 10,
      };
    }

    return { satisfied: true };
  }

  /**
   * Calculate preference match score
   */
  calculatePreferenceScore(
    employeePreference: string | null,
    shiftType: string,
  ): number {
    if (!employeePreference || employeePreference === 'any') {
      return 0; // Neutral
    }

    if (employeePreference.toLowerCase() === shiftType.toLowerCase()) {
      return 20; // Bonus for match
    }

    return -10; // Penalty for mismatch
  }

  /**
   * Calculate workload balance score
   */
  calculateWorkloadScore(
    currentShifts: number,
    targetShifts: number,
    minShifts: number,
    maxShifts: number,
  ): number {
    if (currentShifts < minShifts) {
      return (minShifts - currentShifts) * 5; // Bonus for underworked
    }

    if (currentShifts >= maxShifts) {
      return -20; // Penalty for at/over limit
    }

    if (currentShifts >= targetShifts) {
      return -(currentShifts - targetShifts) * 3; // Small penalty for over target
    }

    return (targetShifts - currentShifts) * 2; // Bonus for under target
  }

  private parseTime(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

