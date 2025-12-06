import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All marked as read' };
  }

  async create(userId: string, data: { type: string; title: string; body: string; data?: any }) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        dataJson: data.data || {},
      },
    });
  }

  async delete(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  // Push notification helpers
  async sendShiftReminder(employeeId: string, shift: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (employee?.userId) {
      await this.create(employee.userId, {
        type: 'SHIFT_REMINDER',
        title: 'Upcoming Shift',
        body: `You have a shift tomorrow at ${shift.startTime}`,
        data: { shiftId: shift.id },
      });
    }
  }

  async sendLeaveApproved(employeeId: string, leaveRequest: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (employee?.userId) {
      await this.create(employee.userId, {
        type: 'LEAVE_APPROVED',
        title: 'Leave Approved',
        body: `Your leave request from ${leaveRequest.startDate} to ${leaveRequest.endDate} has been approved.`,
        data: { leaveId: leaveRequest.id },
      });
    }
  }
}

