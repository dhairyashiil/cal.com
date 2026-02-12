import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { PendingEventTypeHostRepository } from "../repositories/PendingEventTypeHostRepository";

const log = logger.getSubLogger({ prefix: ["PendingEventTypeHostService"] });

type AddPendingHostInput = {
  eventTypeId: number;
  email: string;
  isFixed: boolean;
  priority?: number;
  weight?: number;
  groupId?: string | null;
  inviterId: number;
};

type PromotePendingHostsInput = {
  email: string;
  userId: number;
  teamId: number;
};

export class PendingEventTypeHostService {
  private pendingHostRepo: PendingEventTypeHostRepository;
  private membershipRepo: MembershipRepository;

  constructor(private readonly prismaClient: PrismaClient = prisma) {
    this.pendingHostRepo = new PendingEventTypeHostRepository(prismaClient);
    this.membershipRepo = new MembershipRepository(prismaClient);
  }

  async addPendingHost(input: AddPendingHostInput) {
    const { eventTypeId, email, isFixed, priority = 2, weight = 100, groupId = null, inviterId } = input;
    const normalizedEmail = email.toLowerCase().trim();

    const eventType = await this.prismaClient.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        id: true,
        teamId: true,
        team: {
          select: {
            id: true,
            parentId: true,
          },
        },
      },
    });

    if (!eventType?.teamId) {
      throw new ErrorWithCode(ErrorCode.EventTypeNotFound, "Event type not found or is not a team event");
    }

    const teamId = eventType.teamId;

    const isAlreadyAcceptedMember = await this.membershipRepo.hasAcceptedMembershipByEmail({
      email: normalizedEmail,
      teamId,
    });

    if (isAlreadyAcceptedMember) {
      throw new ErrorWithCode(
        ErrorCode.EventTypeNotFound,
        "User is already an accepted team member. Add them as a host directly."
      );
    }

    return this.pendingHostRepo.upsert({
      eventTypeId,
      email: normalizedEmail,
      isFixed,
      priority,
      weight,
      groupId,
      createdBy: inviterId,
    });
  }

  async removePendingHost(eventTypeId: number, email: string) {
    return this.pendingHostRepo.delete(eventTypeId, email.toLowerCase().trim());
  }

  async listPendingHosts(eventTypeId: number) {
    return this.pendingHostRepo.findByEventTypeId(eventTypeId);
  }

  /**
   * Promotes all pending event type host records for a given email+team
   * into real Host records. Called when a team membership is accepted.
   */
  async promotePendingHosts({ email, userId, teamId }: PromotePendingHostsInput) {
    const normalizedEmail = email.toLowerCase().trim();
    const pendingHosts = await this.pendingHostRepo.findByEmailAndTeamId(normalizedEmail, teamId);

    if (pendingHosts.length === 0) {
      return { promoted: 0 };
    }

    log.info(`Promoting ${pendingHosts.length} pending host(s) for ${normalizedEmail} in team ${teamId}`);

    let promoted = 0;

    for (const pending of pendingHosts) {
      try {
        await this.prismaClient.host.create({
          data: {
            userId,
            eventTypeId: pending.eventTypeId,
            isFixed: pending.isFixed,
            priority: pending.priority,
            weight: pending.weight,
            groupId: pending.groupId,
          },
        });
        promoted++;
      } catch (error) {
        // Host already exists for this user+eventType (e.g., manually added in the meantime)
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          log.warn(`Host already exists for userId=${userId}, eventTypeId=${pending.eventTypeId}. Skipping.`);
        } else {
          throw error;
        }
      }
    }

    await this.pendingHostRepo.deleteManyByEmailAndTeamId(normalizedEmail, teamId);

    log.info(`Promoted ${promoted} pending host(s), cleaned up records for ${normalizedEmail}`);

    return { promoted };
  }
}
