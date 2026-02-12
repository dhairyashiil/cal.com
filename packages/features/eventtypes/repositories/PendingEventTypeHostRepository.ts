import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";

type CreatePendingHostInput = {
  eventTypeId: number;
  email: string;
  isFixed: boolean;
  priority: number;
  weight: number;
  groupId: string | null;
  createdBy: number;
};

export class PendingEventTypeHostRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async create(data: CreatePendingHostInput) {
    return this.prismaClient.pendingEventTypeHost.create({
      data: {
        eventTypeId: data.eventTypeId,
        email: data.email.toLowerCase(),
        isFixed: data.isFixed,
        priority: data.priority,
        weight: data.weight,
        groupId: data.groupId,
        createdBy: data.createdBy,
      },
    });
  }

  async upsert(data: CreatePendingHostInput) {
    return this.prismaClient.pendingEventTypeHost.upsert({
      where: {
        eventTypeId_email: {
          eventTypeId: data.eventTypeId,
          email: data.email.toLowerCase(),
        },
      },
      create: {
        eventTypeId: data.eventTypeId,
        email: data.email.toLowerCase(),
        isFixed: data.isFixed,
        priority: data.priority,
        weight: data.weight,
        groupId: data.groupId,
        createdBy: data.createdBy,
      },
      update: {
        isFixed: data.isFixed,
        priority: data.priority,
        weight: data.weight,
        groupId: data.groupId,
      },
    });
  }

  async findByEventTypeId(eventTypeId: number) {
    return this.prismaClient.pendingEventTypeHost.findMany({
      where: { eventTypeId },
      select: {
        id: true,
        eventTypeId: true,
        email: true,
        isFixed: true,
        priority: true,
        weight: true,
        groupId: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prismaClient.pendingEventTypeHost.findMany({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        eventTypeId: true,
        email: true,
        isFixed: true,
        priority: true,
        weight: true,
        groupId: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async findByEmailAndTeamId(email: string, teamId: number) {
    return this.prismaClient.pendingEventTypeHost.findMany({
      where: {
        email: email.toLowerCase(),
        eventType: {
          teamId,
        },
      },
      select: {
        id: true,
        eventTypeId: true,
        email: true,
        isFixed: true,
        priority: true,
        weight: true,
        groupId: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async delete(eventTypeId: number, email: string) {
    return this.prismaClient.pendingEventTypeHost.delete({
      where: {
        eventTypeId_email: {
          eventTypeId,
          email: email.toLowerCase(),
        },
      },
    });
  }

  async deleteByEventTypeId(eventTypeId: number) {
    return this.prismaClient.pendingEventTypeHost.deleteMany({
      where: { eventTypeId },
    });
  }

  async deleteManyByEmailAndTeamId(email: string, teamId: number) {
    return this.prismaClient.pendingEventTypeHost.deleteMany({
      where: {
        email: email.toLowerCase(),
        eventType: {
          teamId,
        },
      },
    });
  }
}
