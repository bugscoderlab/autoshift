import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SwapStatus } from '@prisma/client';

@Injectable()
export class SwapService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, status?: SwapStatus) {
    const where: any = { requester: { orgId } };
    if (status) where.status = status;

    return this.prisma.swapRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        target: { select: { firstName: true, lastName: true } },
        requesterShift: {
          include: { shift: { include: { template: true } } },
        },
        targetShift: {
          include: { shift: { include: { template: true } } },
        },
      },
    });
  }

  async findMyRequests(employeeId: string) {
    return this.prisma.swapRequest.findMany({
      where: {
        OR: [{ requesterId: employeeId }, { targetId: employeeId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        target: { select: { firstName: true, lastName: true } },
        requesterShift: {
          include: { shift: { include: { template: true } } },
        },
        targetShift: {
          include: { shift: { include: { template: true } } },
        },
      },
    });
  }

  async create(requesterId: string, dto: {
    targetEmployeeId: string;
    myShiftAssignmentId: string;
    theirShiftAssignmentId: string;
    reason?: string;
  }) {
    // Validate assignments exist
    const [myAssignment, theirAssignment] = await Promise.all([
      this.prisma.shiftAssignment.findUnique({
        where: { id: dto.myShiftAssignmentId },
      }),
      this.prisma.shiftAssignment.findUnique({
        where: { id: dto.theirShiftAssignmentId },
      }),
    ]);

    if (!myAssignment || myAssignment.employeeId !== requesterId) {
      throw new BadRequestException('Invalid requester shift assignment');
    }

    if (!theirAssignment || theirAssignment.employeeId !== dto.targetEmployeeId) {
      throw new BadRequestException('Invalid target shift assignment');
    }

    // Check for existing pending swap
    const existing = await this.prisma.swapRequest.findFirst({
      where: {
        requesterId,
        requesterShiftId: dto.myShiftAssignmentId,
        status: { in: ['PENDING', 'TARGET_APPROVED'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Swap request already exists for this shift');
    }

    return this.prisma.swapRequest.create({
      data: {
        requesterId,
        targetId: dto.targetEmployeeId,
        requesterShiftId: dto.myShiftAssignmentId,
        targetShiftId: dto.theirShiftAssignmentId,
        reason: dto.reason,
        status: SwapStatus.PENDING,
      },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        target: { select: { firstName: true, lastName: true } },
        requesterShift: {
          include: { shift: { include: { template: true } } },
        },
        targetShift: {
          include: { shift: { include: { template: true } } },
        },
      },
    });
  }

  async respond(requestId: string, targetId: string, accept: boolean) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Swap request not found');
    if (request.targetId !== targetId) {
      throw new BadRequestException('Only the target can respond');
    }
    if (request.status !== SwapStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    return this.prisma.swapRequest.update({
      where: { id: requestId },
      data: {
        targetResponse: accept ? 'accepted' : 'rejected',
        targetRespondedAt: new Date(),
        status: accept ? SwapStatus.TARGET_APPROVED : SwapStatus.REJECTED,
      },
    });
  }

  async approve(requestId: string, approverId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: { requesterShift: true, targetShift: true },
    });

    if (!request) throw new NotFoundException('Swap request not found');
    if (request.status !== SwapStatus.TARGET_APPROVED) {
      throw new BadRequestException('Target has not approved this swap');
    }

    // Execute the swap
    await this.prisma.$transaction([
      // Swap employee IDs
      this.prisma.shiftAssignment.update({
        where: { id: request.requesterShiftId },
        data: { employeeId: request.targetId },
      }),
      this.prisma.shiftAssignment.update({
        where: { id: request.targetShiftId },
        data: { employeeId: request.requesterId },
      }),
      // Update swap request
      this.prisma.swapRequest.update({
        where: { id: requestId },
        data: {
          status: SwapStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      }),
    ]);

    return this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        target: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async reject(requestId: string, approverId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Swap request not found');
    if (!['PENDING', 'TARGET_APPROVED'].includes(request.status)) {
      throw new BadRequestException('Cannot reject this request');
    }

    return this.prisma.swapRequest.update({
      where: { id: requestId },
      data: {
        status: SwapStatus.REJECTED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  async cancel(requestId: string, requesterId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Swap request not found');
    if (request.requesterId !== requesterId) {
      throw new BadRequestException('Only requester can cancel');
    }
    if (!['PENDING', 'TARGET_APPROVED'].includes(request.status)) {
      throw new BadRequestException('Cannot cancel this request');
    }

    return this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: SwapStatus.CANCELLED },
    });
  }
}

