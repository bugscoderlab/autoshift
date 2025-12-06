import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async getTypes(orgId: string) {
    return this.prisma.leaveType.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getRequests(orgId: string, status?: RequestStatus) {
    const where: any = { employee: { orgId } };
    if (status) where.status = status;

    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { firstName: true, lastName: true, role: true },
        },
        leaveType: true,
        approver: { select: { email: true } },
      },
    });
  }

  async getMyRequests(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { leaveType: true },
    });
  }

  async getBalance(employeeId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year: currentYear },
      include: { leaveType: true },
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

  async create(employeeId: string, dto: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    isHalfDay?: boolean;
  }) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // Validate dates
    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (start < new Date()) {
      throw new BadRequestException('Cannot request leave for past dates');
    }

    // Calculate total days
    const totalDays = dto.isHalfDay
      ? 0.5
      : this.calculateBusinessDays(start, end);

    // Check balance
    const year = start.getFullYear();
    const balance = await this.prisma.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId: dto.leaveTypeId, year },
    });

    if (balance) {
      const available = balance.totalDays - balance.usedDays - balance.pendingDays;
      if (totalDays > available) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${available} days`,
        );
      }
    }

    // Check for overlapping requests
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException('Overlapping leave request exists');
    }

    // Create request
    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: dto.reason,
        status: RequestStatus.PENDING,
      },
      include: { leaveType: true },
    });

    // Update pending balance
    if (balance) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pendingDays: { increment: totalDays } },
      });
    }

    return request;
  }

  async approve(requestId: string, approverId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    // Update request
    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: { leaveType: true },
    });

    // Update balance
    const year = request.startDate.getFullYear();
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
      data: {
        usedDays: { increment: request.totalDays },
        pendingDays: { decrement: request.totalDays },
      },
    });

    return updated;
  }

  async reject(requestId: string, approverId: string, reason?: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    // Update request
    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
      include: { leaveType: true },
    });

    // Restore pending balance
    const year = request.startDate.getFullYear();
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
      data: { pendingDays: { decrement: request.totalDays } },
    });

    return updated;
  }

  async cancel(requestId: string, employeeId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.employeeId !== employeeId) {
      throw new BadRequestException('Cannot cancel another employee\'s request');
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending requests');
    }

    // Update request
    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.CANCELLED },
    });

    // Restore pending balance
    const year = request.startDate.getFullYear();
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
      data: { pendingDays: { decrement: request.totalDays } },
    });

    return updated;
  }

  private calculateBusinessDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}

