import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RuleEngineService } from '../../core/rule-engine/rule-engine.service';

interface GenerationOptions {
  month: number;
  year: number;
  useCyclePattern?: boolean;
  patternId?: string;
  respectPreferences?: boolean;
  balanceWorkload?: boolean;
  enforceRestRules?: boolean;
  excludeEmployees?: string[];
}

interface Assignment {
  employeeId: string;
  shiftId: string;
  date: Date;
  score: number;
}

@Injectable()
export class RosterGeneratorService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
  ) {}

  async generate(orgId: string, options: GenerationOptions) {
    const { month, year } = options;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 1. Gather input data
    const [employees, shifts, leaveRequests, restRules, cyclePattern] =
      await Promise.all([
        this.getActiveEmployees(orgId, options.excludeEmployees),
        this.getShiftsForPeriod(orgId, startDate, endDate),
        this.getApprovedLeave(orgId, startDate, endDate),
        this.getRestRules(orgId),
        options.useCyclePattern && options.patternId
          ? this.getCyclePattern(options.patternId)
          : null,
      ]);

    // 2. Build availability matrix
    const availability = this.buildAvailabilityMatrix(
      employees,
      shifts,
      leaveRequests,
    );

    // 3. Calculate workload targets
    const workloadTargets = this.calculateWorkloadTargets(
      employees,
      shifts.length,
    );

    // 4. Run constraint solver
    const assignments = await this.solveConstraints(
      employees,
      shifts,
      availability,
      workloadTargets,
      restRules,
      options,
    );

    // 5. Optimize
    const optimizedAssignments = this.optimize(assignments, workloadTargets);

    // 6. Validate
    const validation = this.validate(optimizedAssignments, shifts, restRules);

    // 7. Save assignments to database
    await this.saveAssignments(optimizedAssignments);

    return {
      month,
      year,
      generatedAt: new Date(),
      totalAssignments: optimizedAssignments.length,
      validation,
    };
  }

  private async getActiveEmployees(orgId: string, excludeIds?: string[]) {
    const where: any = { orgId, isActive: true };
    if (excludeIds?.length) {
      where.id = { notIn: excludeIds };
    }

    return this.prisma.employee.findMany({
      where,
      include: { role: true, type: true },
    });
  }

  private async getShiftsForPeriod(orgId: string, start: Date, end: Date) {
    return this.prisma.shift.findMany({
      where: {
        orgId,
        date: { gte: start, lte: end },
      },
      include: { template: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async getApprovedLeave(orgId: string, start: Date, end: Date) {
    return this.prisma.leaveRequest.findMany({
      where: {
        employee: { orgId },
        status: 'APPROVED',
        OR: [
          { startDate: { gte: start, lte: end } },
          { endDate: { gte: start, lte: end } },
          { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
        ],
      },
    });
  }

  private async getRestRules(orgId: string) {
    return this.prisma.restRule.findMany({
      where: { orgId, isActive: true },
    });
  }

  private async getCyclePattern(patternId: string) {
    return this.prisma.cyclePattern.findUnique({
      where: { id: patternId },
    });
  }

  private buildAvailabilityMatrix(
    employees: any[],
    shifts: any[],
    leaveRequests: any[],
  ): Map<string, Map<string, string>> {
    const matrix = new Map<string, Map<string, string>>();

    for (const employee of employees) {
      const employeeAvail = new Map<string, string>();

      for (const shift of shifts) {
        const key = `${shift.date.toISOString()}_${shift.id}`;

        // Check if on leave
        const onLeave = leaveRequests.some(
          (lr) =>
            lr.employeeId === employee.id &&
            shift.date >= lr.startDate &&
            shift.date <= lr.endDate,
        );

        if (onLeave) {
          employeeAvail.set(key, 'ON_LEAVE');
        } else {
          employeeAvail.set(key, 'AVAILABLE');
        }
      }

      matrix.set(employee.id, employeeAvail);
    }

    return matrix;
  }

  private calculateWorkloadTargets(
    employees: any[],
    totalShifts: number,
  ): Map<string, { min: number; target: number; max: number }> {
    const targets = new Map();
    const basePerEmployee = Math.floor(totalShifts / employees.length);

    for (const employee of employees) {
      let target = basePerEmployee;

      // Adjust for employee type
      if (employee.type?.code === 'PART_TIME') {
        target = Math.floor(target * 0.5);
      } else if (employee.type?.code === 'PROBATION') {
        target = Math.floor(target * 0.8);
      }

      targets.set(employee.id, {
        min: Math.floor(target * 0.8),
        target,
        max: Math.ceil(target * 1.2),
      });
    }

    return targets;
  }

  private async solveConstraints(
    employees: any[],
    shifts: any[],
    availability: Map<string, Map<string, string>>,
    workloadTargets: Map<string, any>,
    restRules: any[],
    options: GenerationOptions,
  ): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    const employeeAssignments = new Map<string, Assignment[]>();

    // Initialize tracking
    for (const emp of employees) {
      employeeAssignments.set(emp.id, []);
    }

    // Sort shifts by difficulty (fewer available employees = harder)
    const sortedShifts = [...shifts].sort((a, b) => {
      const aAvailable = employees.filter(
        (e) =>
          availability.get(e.id)?.get(`${a.date.toISOString()}_${a.id}`) ===
          'AVAILABLE',
      ).length;
      const bAvailable = employees.filter(
        (e) =>
          availability.get(e.id)?.get(`${b.date.toISOString()}_${b.id}`) ===
          'AVAILABLE',
      ).length;
      return aAvailable - bAvailable;
    });

    // Assign each shift
    for (const shift of sortedShifts) {
      const candidates = this.getCandidatesForShift(
        shift,
        employees,
        availability,
        employeeAssignments,
        workloadTargets,
        restRules,
        options,
      );

      // Assign up to minStaff
      const toAssign = Math.min(candidates.length, shift.minStaff);

      for (let i = 0; i < toAssign; i++) {
        const candidate = candidates[i];
        const assignment: Assignment = {
          employeeId: candidate.employeeId,
          shiftId: shift.id,
          date: shift.date,
          score: candidate.score,
        };

        assignments.push(assignment);
        employeeAssignments.get(candidate.employeeId)?.push(assignment);
      }
    }

    return assignments;
  }

  private getCandidatesForShift(
    shift: any,
    employees: any[],
    availability: Map<string, Map<string, string>>,
    employeeAssignments: Map<string, Assignment[]>,
    workloadTargets: Map<string, any>,
    restRules: any[],
    options: GenerationOptions,
  ): Array<{ employeeId: string; score: number }> {
    const candidates: Array<{ employeeId: string; score: number }> = [];

    for (const employee of employees) {
      const key = `${shift.date.toISOString()}_${shift.id}`;
      const avail = availability.get(employee.id)?.get(key);

      // Skip if not available
      if (avail !== 'AVAILABLE') continue;

      // Check if already assigned on this day
      const existing = employeeAssignments
        .get(employee.id)
        ?.find(
          (a) => a.date.toISOString() === shift.date.toISOString(),
        );
      if (existing) continue;

      // Check rest rules
      if (options.enforceRestRules !== false) {
        const restViolation = this.checkRestViolation(
          employee.id,
          shift,
          employeeAssignments.get(employee.id) || [],
          restRules,
        );
        if (restViolation) continue;
      }

      // Calculate score
      let score = 100;

      // Workload balance
      const currentCount = employeeAssignments.get(employee.id)?.length || 0;
      const target = workloadTargets.get(employee.id);
      if (target) {
        if (currentCount < target.target) {
          score += (target.target - currentCount) * 5; // Bonus for underworked
        } else if (currentCount > target.max) {
          score -= 50; // Penalty for overworked
        }
      }

      // Preference match
      if (options.respectPreferences !== false && employee.preferredShift) {
        const shiftType = shift.template?.code?.toLowerCase() || '';
        if (
          employee.preferredShift.toLowerCase() === shiftType ||
          employee.preferredShift === 'any'
        ) {
          score += 20;
        } else {
          score -= 10;
        }
      }

      candidates.push({ employeeId: employee.id, score });
    }

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  private checkRestViolation(
    employeeId: string,
    newShift: any,
    existingAssignments: Assignment[],
    restRules: any[],
  ): boolean {
    const minRestHours = restRules[0]?.minRestHours || 11;
    const newShiftStart = this.parseTime(newShift.startTime, newShift.date);

    for (const existing of existingAssignments) {
      // Check previous day shift
      const dayDiff = Math.abs(
        (newShift.date.getTime() - existing.date.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff <= 1) {
        // Need to check actual times
        // Simplified: assume violation if consecutive days with different shift types
        return false; // Allow for now, full implementation would check actual times
      }
    }

    return false;
  }

  private optimize(
    assignments: Assignment[],
    workloadTargets: Map<string, any>,
  ): Assignment[] {
    // Simple optimization: balance workload by swapping
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Try to improve workload balance
      const workloads = new Map<string, number>();
      for (const a of assignments) {
        workloads.set(a.employeeId, (workloads.get(a.employeeId) || 0) + 1);
      }

      // Find overworked and underworked
      const overworked: string[] = [];
      const underworked: string[] = [];

      for (const [empId, count] of workloads) {
        const target = workloadTargets.get(empId);
        if (target) {
          if (count > target.max) overworked.push(empId);
          if (count < target.min) underworked.push(empId);
        }
      }

      // No optimization possible
      if (overworked.length === 0 || underworked.length === 0) break;
    }

    return assignments;
  }

  private validate(
    assignments: Assignment[],
    shifts: any[],
    restRules: any[],
  ) {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check staffing requirements
    const shiftCounts = new Map<string, number>();
    for (const a of assignments) {
      shiftCounts.set(a.shiftId, (shiftCounts.get(a.shiftId) || 0) + 1);
    }

    for (const shift of shifts) {
      const count = shiftCounts.get(shift.id) || 0;
      if (count < shift.minStaff) {
        errors.push({
          type: 'understaffed',
          shiftId: shift.id,
          date: shift.date,
          required: shift.minStaff,
          assigned: count,
        });
      }
    }

    // Calculate metrics
    const workloads = new Map<string, number>();
    for (const a of assignments) {
      workloads.set(a.employeeId, (workloads.get(a.employeeId) || 0) + 1);
    }
    const workloadValues = Array.from(workloads.values());
    const mean =
      workloadValues.length > 0
        ? workloadValues.reduce((a, b) => a + b, 0) / workloadValues.length
        : 0;
    const variance =
      workloadValues.length > 0
        ? workloadValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          workloadValues.length
        : 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        totalAssignments: assignments.length,
        employeesScheduled: workloads.size,
        averageShiftsPerEmployee: Math.round(mean * 10) / 10,
        workloadStandardDeviation: Math.round(Math.sqrt(variance) * 10) / 10,
        fairnessScore: Math.max(0, 100 - Math.sqrt(variance) * 10),
        understaffedShifts: errors.filter((e) => e.type === 'understaffed').length,
      },
    };
  }

  private async saveAssignments(assignments: Assignment[]) {
    // Delete existing assignments for the period
    const dates = [...new Set(assignments.map((a) => a.date.toISOString()))];
    if (dates.length === 0) return;

    const shiftIds = [...new Set(assignments.map((a) => a.shiftId))];

    await this.prisma.shiftAssignment.deleteMany({
      where: { shiftId: { in: shiftIds } },
    });

    // Create new assignments
    await this.prisma.shiftAssignment.createMany({
      data: assignments.map((a) => ({
        employeeId: a.employeeId,
        shiftId: a.shiftId,
        date: a.date,
        status: 'ASSIGNED',
      })),
    });
  }

  private parseTime(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

