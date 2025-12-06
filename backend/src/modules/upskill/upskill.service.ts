import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ContentType } from '@prisma/client';

@Injectable()
export class UpskillService {
  constructor(private prisma: PrismaService) {}

  async getContent(orgId: string, category?: string) {
    const where: any = { orgId, isActive: true };
    if (category) where.category = category;

    return this.prisma.upskillContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContent(orgId: string, dto: {
    title: string;
    description?: string;
    type: ContentType;
    url?: string;
    durationMinutes?: number;
    category?: string;
    tags?: string[];
  }) {
    return this.prisma.upskillContent.create({
      data: {
        orgId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        url: dto.url,
        durationMinutes: dto.durationMinutes,
        category: dto.category,
        tags: dto.tags || [],
      },
    });
  }

  async getMyProgress(employeeId: string) {
    const skills = await this.prisma.employeeSkill.findMany({
      where: { employeeId },
      include: { content: true },
    });

    return skills.map((s) => ({
      contentId: s.contentId,
      title: s.content.title,
      type: s.content.type,
      progress: s.progressPct,
      completed: !!s.completedAt,
      score: s.score,
    }));
  }

  async markComplete(employeeId: string, contentId: string, score?: number) {
    return this.prisma.employeeSkill.upsert({
      where: {
        employeeId_contentId: { employeeId, contentId },
      },
      create: {
        employeeId,
        contentId,
        completedAt: new Date(),
        progressPct: 100,
        score,
      },
      update: {
        completedAt: new Date(),
        progressPct: 100,
        score,
      },
    });
  }

  async updateProgress(employeeId: string, contentId: string, progressPct: number) {
    return this.prisma.employeeSkill.upsert({
      where: {
        employeeId_contentId: { employeeId, contentId },
      },
      create: {
        employeeId,
        contentId,
        progressPct,
      },
      update: {
        progressPct,
        completedAt: progressPct >= 100 ? new Date() : null,
      },
    });
  }
}

