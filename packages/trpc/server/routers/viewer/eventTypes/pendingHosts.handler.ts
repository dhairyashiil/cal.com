import { PendingEventTypeHostService } from "@calcom/features/eventtypes/services/PendingEventTypeHostService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma/client";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import { inviteMembersWithNoInviterPermissionCheck } from "../teams/inviteMember/inviteMember.handler";
import type {
  TAddPendingHostInputSchema,
  TListPendingHostsInputSchema,
  TRemovePendingHostInputSchema,
} from "./pendingHosts.schema";

type PendingHostOptions<TInput> = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TInput;
};

async function getEventTypeWithTeam(prisma: PrismaClient, eventTypeId: number) {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          id: true,
          parentId: true,
          isOrganization: true,
          slug: true,
          name: true,
          metadata: true,
        },
      },
    },
  });

  if (!eventType?.teamId || !eventType.team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event type not found or is not a team event",
    });
  }

  return eventType as typeof eventType & { teamId: number; team: NonNullable<typeof eventType.team> };
}

export async function addPendingHostHandler({ ctx, input }: PendingHostOptions<TAddPendingHostInputSchema>) {
  const service = new PendingEventTypeHostService(ctx.prisma);
  const eventType = await getEventTypeWithTeam(ctx.prisma, input.eventTypeId);

  const membershipRepo = new MembershipRepository(ctx.prisma);
  const isAlreadyAcceptedMember = await membershipRepo.hasAcceptedMembershipByEmail({
    email: input.email.toLowerCase(),
    teamId: eventType.teamId,
  });

  if (isAlreadyAcceptedMember) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User is already an accepted team member. Add them as a host directly.",
    });
  }

  const hasPendingMembership = await ctx.prisma.membership.findFirst({
    where: {
      user: { email: input.email.toLowerCase() },
      teamId: eventType.teamId,
      accepted: false,
    },
    select: { id: true },
  });

  if (!hasPendingMembership) {
    await inviteMembersWithNoInviterPermissionCheck({
      inviterName: ctx.user.name,
      teamId: eventType.teamId,
      language: ctx.user.locale ?? "en",
      creationSource: CreationSource.WEBAPP,
      orgSlug: null,
      invitations: [
        {
          usernameOrEmail: input.email.toLowerCase(),
          role: MembershipRole.MEMBER,
        },
      ],
      isDirectUserAction: false,
    });
  }

  const pendingHost = await service.addPendingHost({
    eventTypeId: input.eventTypeId,
    email: input.email,
    isFixed: input.isFixed,
    priority: input.priority,
    weight: input.weight,
    groupId: input.groupId,
    inviterId: ctx.user.id,
  });

  return pendingHost;
}

export async function removePendingHostHandler({
  ctx,
  input,
}: PendingHostOptions<TRemovePendingHostInputSchema>) {
  const service = new PendingEventTypeHostService(ctx.prisma);

  try {
    await service.removePendingHost(input.eventTypeId, input.email);
  } catch {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pending host not found",
    });
  }

  return { success: true };
}

export async function listPendingHostsHandler({
  ctx,
  input,
}: PendingHostOptions<TListPendingHostsInputSchema>) {
  const service = new PendingEventTypeHostService(ctx.prisma);
  return service.listPendingHosts(input.eventTypeId);
}
