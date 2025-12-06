# AutoShift Roster Generation Algorithm

## 📊 Algorithm Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ROSTER GENERATION PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • Employees (with roles, preferences, types)                        │   │
│  │ • Shift templates & staffing requirements                           │   │
│  │ • Approved leave requests                                            │   │
│  │ • Rest rules & compliance constraints                               │   │
│  │ • Cycle patterns (if applicable)                                    │   │
│  │ • Previous month's roster (for continuity)                          │   │
│  │ • Shift requests (confirmed preferences)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 1: PREPROCESSING                            │   │
│  │  • Build availability matrix                                         │   │
│  │  • Calculate employee workload targets                               │   │
│  │  • Identify fixed constraints (leave, confirmed requests)            │   │
│  │  • Compute staffing gaps per shift                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 2: CONSTRAINT SOLVER                        │   │
│  │  • Apply hard constraints (rest rules, leave, qualifications)        │   │
│  │  • Score employees for each shift                                    │   │
│  │  • Run greedy assignment with backtracking                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 3: OPTIMIZATION                             │   │
│  │  • Balance workload across employees                                 │   │
│  │  • Minimize preference violations                                    │   │
│  │  • Local search improvements (swaps, moves)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PHASE 4: VALIDATION                               │   │
│  │  • Check all constraints satisfied                                   │   │
│  │  • Detect conflicts and violations                                   │   │
│  │  • Generate warnings for soft constraint violations                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  OUTPUT                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • Complete monthly roster                                            │   │
│  │ • Conflict report                                                    │   │
│  │ • Fairness metrics                                                   │   │
│  │ • AI explanation                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Detailed Algorithm

### Phase 1: Preprocessing

```typescript
// Pseudocode for preprocessing phase

interface AvailabilityMatrix {
  [employeeId: string]: {
    [dateShiftKey: string]: AvailabilityStatus;
  };
}

enum AvailabilityStatus {
  AVAILABLE = 'available',
  ON_LEAVE = 'on_leave',
  CONFIRMED_REQUEST = 'confirmed_request',
  REST_REQUIRED = 'rest_required',
  MAX_HOURS_REACHED = 'max_hours_reached',
}

function preprocess(input: RosterInput): PreprocessedData {
  const { employees, shifts, leaveRequests, restRules, cyclePattern } = input;
  
  // Step 1: Build availability matrix
  const availability: AvailabilityMatrix = {};
  
  for (const employee of employees) {
    availability[employee.id] = {};
    
    for (const shift of shifts) {
      const key = `${shift.date}_${shift.id}`;
      
      // Check if on leave
      if (isOnLeave(employee.id, shift.date, leaveRequests)) {
        availability[employee.id][key] = AvailabilityStatus.ON_LEAVE;
        continue;
      }
      
      // Check if has confirmed shift request
      if (hasConfirmedRequest(employee.id, shift.id)) {
        availability[employee.id][key] = AvailabilityStatus.CONFIRMED_REQUEST;
        continue;
      }
      
      availability[employee.id][key] = AvailabilityStatus.AVAILABLE;
    }
  }
  
  // Step 2: Calculate workload targets
  const workloadTargets = calculateWorkloadTargets(employees, shifts.length);
  
  // Step 3: Compute staffing requirements per shift
  const staffingRequirements = shifts.map(shift => ({
    shiftId: shift.id,
    date: shift.date,
    minStaff: shift.minStaff,
    maxStaff: shift.maxStaff,
    requiredRoles: getRequiredRoles(shift),
    currentAssigned: 0,
  }));
  
  return { availability, workloadTargets, staffingRequirements };
}

function calculateWorkloadTargets(
  employees: Employee[],
  totalShifts: number
): Map<string, WorkloadTarget> {
  const targets = new Map<string, WorkloadTarget>();
  
  // Base distribution: total shifts / active employees
  const activeEmployees = employees.filter(e => e.isActive);
  const baseShiftsPerEmployee = Math.floor(totalShifts / activeEmployees.length);
  
  for (const employee of activeEmployees) {
    // Adjust based on employee type
    let targetShifts = baseShiftsPerEmployee;
    
    if (employee.type === 'PART_TIME') {
      targetShifts = Math.floor(targetShifts * 0.5);
    } else if (employee.type === 'PROBATION') {
      targetShifts = Math.floor(targetShifts * 0.8);
    }
    
    // Adjust for approved leave
    const leaveDays = getApprovedLeaveDays(employee.id);
    targetShifts = Math.max(0, targetShifts - leaveDays);
    
    targets.set(employee.id, {
      minShifts: Math.floor(targetShifts * 0.9),
      targetShifts,
      maxShifts: Math.ceil(targetShifts * 1.1),
      maxHoursPerWeek: employee.maxHoursPerWeek || 40,
    });
  }
  
  return targets;
}
```

### Phase 2: Constraint Solver

```typescript
// Pseudocode for constraint solver

interface Assignment {
  employeeId: string;
  shiftId: string;
  date: string;
  score: number;
}

interface Constraint {
  type: 'hard' | 'soft';
  name: string;
  check: (assignment: Assignment, state: RosterState) => ConstraintResult;
  weight: number; // For soft constraints
}

// Hard Constraints (must be satisfied)
const hardConstraints: Constraint[] = [
  {
    type: 'hard',
    name: 'minimum_rest',
    weight: Infinity,
    check: (assignment, state) => {
      const lastShiftEnd = getLastShiftEnd(assignment.employeeId, assignment.date, state);
      const thisShiftStart = getShiftStart(assignment.shiftId);
      const restHours = differenceInHours(thisShiftStart, lastShiftEnd);
      const requiredRest = getRequiredRestHours(assignment.employeeId);
      
      return {
        satisfied: restHours >= requiredRest,
        violation: restHours < requiredRest ? `Only ${restHours}h rest, need ${requiredRest}h` : null,
      };
    },
  },
  {
    type: 'hard',
    name: 'no_double_booking',
    weight: Infinity,
    check: (assignment, state) => {
      const existingShift = getShiftOnDate(assignment.employeeId, assignment.date, state);
      return {
        satisfied: !existingShift || existingShift.id === assignment.shiftId,
        violation: existingShift ? 'Already assigned to another shift' : null,
      };
    },
  },
  {
    type: 'hard',
    name: 'not_on_leave',
    weight: Infinity,
    check: (assignment, state) => {
      const isOnLeave = checkLeave(assignment.employeeId, assignment.date);
      return {
        satisfied: !isOnLeave,
        violation: isOnLeave ? 'Employee is on approved leave' : null,
      };
    },
  },
  {
    type: 'hard',
    name: 'role_qualified',
    weight: Infinity,
    check: (assignment, state) => {
      const shift = getShift(assignment.shiftId);
      const employee = getEmployee(assignment.employeeId);
      const isQualified = shift.requiredRoles.includes(employee.roleId);
      return {
        satisfied: isQualified,
        violation: isQualified ? null : 'Employee not qualified for this shift',
      };
    },
  },
  {
    type: 'hard',
    name: 'max_consecutive_days',
    weight: Infinity,
    check: (assignment, state) => {
      const consecutiveDays = getConsecutiveWorkDays(assignment.employeeId, assignment.date, state);
      const maxDays = getMaxConsecutiveDays(assignment.employeeId);
      return {
        satisfied: consecutiveDays < maxDays,
        violation: consecutiveDays >= maxDays ? `Exceeds ${maxDays} consecutive days` : null,
      };
    },
  },
];

// Soft Constraints (preferences, optimization targets)
const softConstraints: Constraint[] = [
  {
    type: 'soft',
    name: 'preferred_shift_type',
    weight: 10,
    check: (assignment, state) => {
      const employee = getEmployee(assignment.employeeId);
      const shift = getShift(assignment.shiftId);
      const matchesPreference = employee.preferredShift === shift.type || 
                                employee.preferredShift === 'any';
      return {
        satisfied: matchesPreference,
        penalty: matchesPreference ? 0 : 10,
      };
    },
  },
  {
    type: 'soft',
    name: 'workload_balance',
    weight: 20,
    check: (assignment, state) => {
      const currentShifts = getAssignedShiftsCount(assignment.employeeId, state);
      const target = getWorkloadTarget(assignment.employeeId);
      const deviation = Math.abs(currentShifts - target.targetShifts);
      return {
        satisfied: deviation <= 2,
        penalty: deviation * 5,
      };
    },
  },
  {
    type: 'soft',
    name: 'avoid_back_to_back_different_types',
    weight: 5,
    check: (assignment, state) => {
      // Avoid night -> morning transitions
      const previousShift = getPreviousDayShift(assignment.employeeId, assignment.date, state);
      if (!previousShift) return { satisfied: true, penalty: 0 };
      
      const isNightToMorning = previousShift.type === 'night' && 
                                getShift(assignment.shiftId).type === 'morning';
      return {
        satisfied: !isNightToMorning,
        penalty: isNightToMorning ? 15 : 0,
      };
    },
  },
];

function solveConstraints(
  preprocessed: PreprocessedData,
  constraints: Constraint[]
): RosterSolution {
  const { availability, workloadTargets, staffingRequirements } = preprocessed;
  const state: RosterState = { assignments: [], conflicts: [] };
  
  // Sort shifts by difficulty (hardest to staff first)
  const sortedShifts = staffingRequirements.sort((a, b) => {
    const aScore = calculateDifficultyScore(a, availability);
    const bScore = calculateDifficultyScore(b, availability);
    return bScore - aScore; // Descending
  });
  
  for (const shiftReq of sortedShifts) {
    // Get available employees for this shift
    const candidates = getAvailableCandidates(shiftReq, availability, state);
    
    // Score each candidate
    const scoredCandidates = candidates.map(employee => ({
      employeeId: employee.id,
      shiftId: shiftReq.shiftId,
      date: shiftReq.date,
      score: calculateAssignmentScore(employee, shiftReq, state, constraints),
    }));
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Assign top candidates up to minStaff
    let assigned = 0;
    for (const candidate of scoredCandidates) {
      if (assigned >= shiftReq.minStaff) break;
      
      // Verify all hard constraints
      const hardViolations = checkHardConstraints(candidate, state, constraints);
      if (hardViolations.length === 0) {
        state.assignments.push(candidate);
        updateAvailability(availability, candidate);
        assigned++;
      }
    }
    
    // Record understaffing if couldn't fill
    if (assigned < shiftReq.minStaff) {
      state.conflicts.push({
        type: 'understaffed',
        shiftId: shiftReq.shiftId,
        date: shiftReq.date,
        required: shiftReq.minStaff,
        assigned,
      });
    }
  }
  
  return state;
}

function calculateAssignmentScore(
  employee: Employee,
  shiftReq: StaffingRequirement,
  state: RosterState,
  constraints: Constraint[]
): number {
  let score = 100; // Base score
  
  // Apply soft constraint penalties
  for (const constraint of constraints.filter(c => c.type === 'soft')) {
    const result = constraint.check({
      employeeId: employee.id,
      shiftId: shiftReq.shiftId,
      date: shiftReq.date,
      score: 0,
    }, state);
    
    score -= (result.penalty || 0);
  }
  
  // Bonus for preference match
  if (employee.preferredShift === shiftReq.shiftType) {
    score += 20;
  }
  
  // Bonus for confirmed request
  if (hasConfirmedRequest(employee.id, shiftReq.shiftId)) {
    score += 50;
  }
  
  // Balance workload - prefer underworked employees
  const currentWorkload = getAssignedShiftsCount(employee.id, state);
  const target = getWorkloadTarget(employee.id);
  if (currentWorkload < target.targetShifts) {
    score += (target.targetShifts - currentWorkload) * 3;
  } else {
    score -= (currentWorkload - target.targetShifts) * 5;
  }
  
  return Math.max(0, score);
}
```

### Phase 3: Optimization

```typescript
// Pseudocode for optimization phase

function optimizeRoster(solution: RosterSolution): RosterSolution {
  let improved = true;
  let iterations = 0;
  const maxIterations = 1000;
  
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    
    // Try local search improvements
    
    // 1. Swap pairs - exchange assignments between two employees
    for (let i = 0; i < solution.assignments.length; i++) {
      for (let j = i + 1; j < solution.assignments.length; j++) {
        const swapResult = trySwap(solution, i, j);
        if (swapResult.improvement > 0) {
          solution = swapResult.newSolution;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    
    // 2. Move - reassign a shift to a different employee
    if (!improved) {
      for (const assignment of solution.assignments) {
        const moveResult = tryMove(solution, assignment);
        if (moveResult.improvement > 0) {
          solution = moveResult.newSolution;
          improved = true;
          break;
        }
      }
    }
    
    // 3. Fill understaffed shifts
    if (!improved) {
      for (const conflict of solution.conflicts.filter(c => c.type === 'understaffed')) {
        const fillResult = tryFill(solution, conflict);
        if (fillResult.success) {
          solution = fillResult.newSolution;
          improved = true;
          break;
        }
      }
    }
  }
  
  return solution;
}

function trySwap(
  solution: RosterSolution,
  indexA: number,
  indexB: number
): OptimizationResult {
  const assignmentA = solution.assignments[indexA];
  const assignmentB = solution.assignments[indexB];
  
  // Skip if same employee or same shift
  if (assignmentA.employeeId === assignmentB.employeeId ||
      assignmentA.shiftId === assignmentB.shiftId) {
    return { improvement: 0, newSolution: solution };
  }
  
  // Create proposed swap
  const swappedA = { ...assignmentA, employeeId: assignmentB.employeeId };
  const swappedB = { ...assignmentB, employeeId: assignmentA.employeeId };
  
  // Check if swap violates hard constraints
  const tempSolution = cloneSolution(solution);
  tempSolution.assignments[indexA] = swappedA;
  tempSolution.assignments[indexB] = swappedB;
  
  if (violatesHardConstraints(tempSolution)) {
    return { improvement: 0, newSolution: solution };
  }
  
  // Calculate improvement
  const currentScore = calculateTotalScore(solution);
  const newScore = calculateTotalScore(tempSolution);
  
  if (newScore > currentScore) {
    return { improvement: newScore - currentScore, newSolution: tempSolution };
  }
  
  return { improvement: 0, newSolution: solution };
}

function calculateTotalScore(solution: RosterSolution): number {
  let score = 0;
  
  // 1. Workload fairness score
  const workloadVariance = calculateWorkloadVariance(solution);
  score += 100 - (workloadVariance * 10); // Lower variance = higher score
  
  // 2. Preference satisfaction score
  const preferenceScore = calculatePreferenceSatisfaction(solution);
  score += preferenceScore * 50;
  
  // 3. Penalty for conflicts
  score -= solution.conflicts.length * 100;
  
  // 4. Continuity bonus (consecutive same-type shifts)
  const continuityScore = calculateContinuityScore(solution);
  score += continuityScore * 20;
  
  return score;
}

function calculateWorkloadVariance(solution: RosterSolution): number {
  const workloads = new Map<string, number>();
  
  for (const assignment of solution.assignments) {
    const current = workloads.get(assignment.employeeId) || 0;
    workloads.set(assignment.employeeId, current + 1);
  }
  
  const values = Array.from(workloads.values());
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance); // Standard deviation
}
```

### Phase 4: Validation

```typescript
// Pseudocode for validation phase

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: RosterMetrics;
}

function validateRoster(solution: RosterSolution): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Check all hard constraints
  for (const assignment of solution.assignments) {
    for (const constraint of hardConstraints) {
      const result = constraint.check(assignment, solution);
      if (!result.satisfied) {
        errors.push({
          type: 'constraint_violation',
          constraint: constraint.name,
          assignment,
          message: result.violation,
        });
      }
    }
  }
  
  // Check soft constraints and generate warnings
  for (const assignment of solution.assignments) {
    for (const constraint of softConstraints) {
      const result = constraint.check(assignment, solution);
      if (!result.satisfied && result.penalty > 5) {
        warnings.push({
          type: 'preference_not_met',
          constraint: constraint.name,
          assignment,
          penalty: result.penalty,
        });
      }
    }
  }
  
  // Check staffing requirements
  const staffingGaps = checkStaffingRequirements(solution);
  for (const gap of staffingGaps) {
    if (gap.shortage > 0) {
      errors.push({
        type: 'understaffed',
        shiftId: gap.shiftId,
        date: gap.date,
        required: gap.required,
        assigned: gap.assigned,
        message: `Shift understaffed by ${gap.shortage}`,
      });
    }
  }
  
  // Calculate metrics
  const metrics: RosterMetrics = {
    totalAssignments: solution.assignments.length,
    totalEmployees: new Set(solution.assignments.map(a => a.employeeId)).size,
    averageShiftsPerEmployee: 0,
    workloadStandardDeviation: calculateWorkloadVariance(solution),
    preferenceSatisfactionRate: calculatePreferenceSatisfaction(solution),
    complianceRate: errors.length === 0 ? 100 : 
                    (1 - errors.length / solution.assignments.length) * 100,
  };
  
  metrics.averageShiftsPerEmployee = 
    metrics.totalAssignments / metrics.totalEmployees;
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics,
  };
}
```

## 🔄 4-Week Cycle Pattern Algorithm

```typescript
// Algorithm for 4-week repeating cycle

interface CyclePattern {
  id: string;
  weeks: WeekPattern[];
  startDate: Date;
}

interface WeekPattern {
  weekNumber: number;
  shifts: ShiftPattern[];
}

function applyCyclePattern(
  employees: Employee[],
  pattern: CyclePattern,
  month: number,
  year: number
): Assignment[] {
  const assignments: Assignment[] = [];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  
  // Determine which week of the cycle we start with
  const cycleStart = new Date(pattern.startDate);
  const weeksSinceCycleStart = Math.floor(
    (monthStart.getTime() - cycleStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const startingWeek = (weeksSinceCycleStart % pattern.weeks.length) + 1;
  
  // Apply pattern for each week in the month
  let currentDate = monthStart;
  let currentWeek = startingWeek;
  
  while (currentDate <= monthEnd) {
    const weekPattern = pattern.weeks.find(w => w.weekNumber === currentWeek);
    
    if (weekPattern) {
      // Apply this week's pattern
      for (const shiftPattern of weekPattern.shifts) {
        const dayOfWeek = getDayOfWeek(currentDate);
        if (shiftPattern.daysOfWeek.includes(dayOfWeek)) {
          // Find eligible employees for this pattern slot
          const eligibleEmployees = employees.filter(e => 
            matchesPatternCriteria(e, shiftPattern)
          );
          
          for (const employee of eligibleEmployees) {
            assignments.push({
              employeeId: employee.id,
              shiftId: findShiftByPattern(shiftPattern, currentDate),
              date: currentDate.toISOString().split('T')[0],
              score: 100, // Pattern-based assignments have high score
            });
          }
        }
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Check if we've moved to a new week
    if (currentDate.getDay() === 0) { // Sunday = start of new week
      currentWeek = (currentWeek % pattern.weeks.length) + 1;
    }
  }
  
  return assignments;
}

// Handle 5-week months
function handleFiveWeekMonth(
  month: number,
  year: number,
  pattern: CyclePattern
): number {
  const weeksInMonth = getWeeksInMonth(month, year);
  
  if (weeksInMonth === 5) {
    // Fifth week uses Week 1 pattern
    return 1;
  }
  
  return -1; // No fifth week
}
```

## 🏥 Industry-Specific Adaptations

### Hospital Staffing Rules

```typescript
const hospitalRules: IndustryRules = {
  workloadCategories: ['resus', 'edx', 'auc', 'triage', 'observation'],
  
  staffingMatrix: {
    morning: {
      resus: { min: 2, max: 3, roles: ['doctor', 'nurse'] },
      edx: { min: 3, max: 5, roles: ['doctor', 'nurse', 'houseman'] },
      auc: { min: 2, max: 4, roles: ['nurse', 'houseman'] },
    },
    evening: {
      resus: { min: 2, max: 3, roles: ['doctor', 'nurse'] },
      edx: { min: 2, max: 4, roles: ['doctor', 'nurse'] },
    },
    night: {
      resus: { min: 1, max: 2, roles: ['doctor', 'nurse'] },
      edx: { min: 1, max: 2, roles: ['doctor', 'nurse'] },
    },
  },
  
  specialRules: [
    {
      name: 'senior_on_call',
      rule: 'At least one senior doctor must be on each shift',
      validate: (shift, assignments) => {
        return assignments.some(a => 
          a.employee.seniorityLevel >= 3 && a.employee.role === 'doctor'
        );
      },
    },
    {
      name: 'houseman_supervision',
      rule: 'Housemen must work with supervising doctor',
      validate: (shift, assignments) => {
        const hasHouseman = assignments.some(a => a.employee.role === 'houseman');
        const hasDoctor = assignments.some(a => a.employee.role === 'doctor');
        return !hasHouseman || hasDoctor;
      },
    },
  ],
};
```

### Restaurant Staffing Rules

```typescript
const restaurantRules: IndustryRules = {
  workloadCategories: ['kitchen', 'bar', 'floor', 'cashier'],
  
  staffingMatrix: {
    lunch: {
      kitchen: { min: 2, max: 4, roles: ['head_chef', 'sous_chef', 'line_cook'] },
      floor: { min: 3, max: 6, roles: ['waiter', 'server'] },
      bar: { min: 1, max: 2, roles: ['bartender'] },
    },
    dinner: {
      kitchen: { min: 3, max: 5, roles: ['head_chef', 'sous_chef', 'line_cook'] },
      floor: { min: 4, max: 8, roles: ['waiter', 'server'] },
      bar: { min: 2, max: 3, roles: ['bartender'] },
    },
  },
  
  specialRules: [
    {
      name: 'head_chef_required',
      rule: 'Head chef or sous chef must be present for each kitchen shift',
      validate: (shift, assignments) => {
        return assignments.some(a => 
          ['head_chef', 'sous_chef'].includes(a.employee.role)
        );
      },
    },
  ],
};
```

## 📊 Fairness Metrics

```typescript
interface FairnessMetrics {
  workloadDistribution: {
    mean: number;
    standardDeviation: number;
    giniCoefficient: number;
  };
  preferencesSatisfied: {
    total: number;
    satisfied: number;
    rate: number;
  };
  shiftTypeDistribution: {
    [shiftType: string]: {
      mean: number;
      variance: number;
    };
  };
  weekendDistribution: {
    mean: number;
    variance: number;
  };
}

function calculateFairnessMetrics(solution: RosterSolution): FairnessMetrics {
  const employeeStats = new Map<string, EmployeeStats>();
  
  // Gather statistics per employee
  for (const assignment of solution.assignments) {
    let stats = employeeStats.get(assignment.employeeId);
    if (!stats) {
      stats = {
        totalShifts: 0,
        morningShifts: 0,
        eveningShifts: 0,
        nightShifts: 0,
        weekendShifts: 0,
        preferencesMetCount: 0,
        totalPreferences: 0,
      };
      employeeStats.set(assignment.employeeId, stats);
    }
    
    stats.totalShifts++;
    
    const shift = getShift(assignment.shiftId);
    stats[`${shift.type}Shifts`]++;
    
    if (isWeekend(assignment.date)) {
      stats.weekendShifts++;
    }
    
    const employee = getEmployee(assignment.employeeId);
    stats.totalPreferences++;
    if (employee.preferredShift === shift.type || employee.preferredShift === 'any') {
      stats.preferencesMetCount++;
    }
  }
  
  // Calculate metrics
  const workloads = Array.from(employeeStats.values()).map(s => s.totalShifts);
  const mean = workloads.reduce((a, b) => a + b, 0) / workloads.length;
  const variance = workloads.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / workloads.length;
  
  return {
    workloadDistribution: {
      mean,
      standardDeviation: Math.sqrt(variance),
      giniCoefficient: calculateGini(workloads),
    },
    preferencesSatisfied: {
      total: Array.from(employeeStats.values()).reduce((s, e) => s + e.totalPreferences, 0),
      satisfied: Array.from(employeeStats.values()).reduce((s, e) => s + e.preferencesMetCount, 0),
      rate: 0, // Calculated below
    },
    shiftTypeDistribution: calculateShiftTypeDistribution(employeeStats),
    weekendDistribution: calculateWeekendDistribution(employeeStats),
  };
}

function calculateGini(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return numerator / (n * sum);
}
```

## 🔌 AI Integration Points

```typescript
// Integration with Claude/Groq for AI-assisted scheduling

async function aiAssistedRosterGeneration(
  input: RosterInput,
  naturalLanguageInstructions?: string
): Promise<RosterSolution> {
  // 1. Generate initial roster using algorithm
  let solution = await generateRoster(input);
  
  // 2. If there are natural language instructions, apply them
  if (naturalLanguageInstructions) {
    const aiResponse = await callClaudeAPI({
      prompt: `
        Given the following roster and instructions, suggest modifications:
        
        Current Roster Summary:
        ${JSON.stringify(summarizeRoster(solution))}
        
        Instructions: "${naturalLanguageInstructions}"
        
        Respond with a JSON array of modifications:
        [{ "action": "move" | "swap" | "assign" | "unassign",
           "employeeId": "...",
           "fromShiftId": "...",
           "toShiftId": "...",
           "reason": "..." }]
      `,
    });
    
    // Apply AI-suggested modifications
    const modifications = parseAIResponse(aiResponse);
    solution = applyModifications(solution, modifications);
  }
  
  // 3. Validate and optimize
  solution = optimizeRoster(solution);
  const validation = validateRoster(solution);
  
  // 4. Generate AI explanation
  const explanation = await generateAIExplanation(solution, validation);
  
  return {
    ...solution,
    aiExplanation: explanation,
    validation,
  };
}

async function generateAIExplanation(
  solution: RosterSolution,
  validation: ValidationResult
): Promise<string> {
  const prompt = `
    Summarize this roster generation result in 2-3 sentences:
    - Total assignments: ${solution.assignments.length}
    - Employees scheduled: ${new Set(solution.assignments.map(a => a.employeeId)).size}
    - Conflicts: ${validation.errors.length}
    - Warnings: ${validation.warnings.length}
    - Fairness score: ${validation.metrics.workloadStandardDeviation.toFixed(2)}
    
    Focus on key outcomes and any issues that need attention.
  `;
  
  return await callGroqAPI({ prompt });
}
```

