import { prisma } from '@/lib/prisma';

export const familyGroupService = {
  getFamilyGroupByResponsible: (responsibleUserId: string) =>
    prisma.familyGroup.findFirst({
      where: { responsibleUserId },
      include: {
        responsibleUser: {
          select: { id: true, name: true, lastName: true, email: true },
        },
        members: {
          include: {
            member: {
              select: { id: true, name: true, lastName: true, email: true },
            },
          },
        },
      },
    }),
  getFamilyGroupsForUser: (userId: string) =>
    prisma.familyGroup.findMany({
      where: {
        OR: [
          { responsibleUserId: userId },
          { members: { some: { memberId: userId } } },
        ],
      },
      include: {
        responsibleUser: {
          select: { id: true, name: true, lastName: true, email: true },
        },
        members: {
          include: {
            member: {
              select: { id: true, name: true, lastName: true, email: true },
            },
          },
        },
      },
    }),
  getMembersForFamilyGroup: (familyGroupId: string) =>
    prisma.familyGroupMember.findMany({
      where: { familyGroupId },
      include: { member: true },
    }),
  getOrCreateFamilyGroupByResponsible: async (
    responsibleUser: {
      id: string;
      name: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
    }
  ) => {
    const existing = await prisma.familyGroup.findFirst({
      where: { responsibleUserId: responsibleUser.id },
      include: {
        responsibleUser: {
          select: { id: true, name: true, lastName: true, email: true },
        },
        members: {
          include: {
            member: {
              select: { id: true, name: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.familyGroup.create({
      data: {
        name: `Familia de ${responsibleUser.name?.trim() || responsibleUser.email}`,
        responsibleUserId: responsibleUser.id,
        responsibleName:
          `${responsibleUser.name ?? ''} ${responsibleUser.lastName ?? ''}`.trim() ||
          responsibleUser.email,
        responsibleEmail: responsibleUser.email,
        responsiblePhone: responsibleUser.phone,
      },
      include: {
        responsibleUser: {
          select: { id: true, name: true, lastName: true, email: true },
        },
        members: {
          include: {
            member: {
              select: { id: true, name: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  },
  addMemberToFamilyGroup: (
    familyGroupId: string,
    memberId: string,
    relationship: 'PARENT' | 'RESPONSIBLE' | 'OTHER' = 'PARENT'
  ) =>
    prisma.familyGroupMember.create({
      data: { familyGroupId, memberId, relationship },
      include: {
        member: {
          select: { id: true, name: true, lastName: true, email: true },
        },
      },
    }),
  removeMemberFromFamilyGroup: (familyGroupId: string, memberId: string) =>
    prisma.familyGroupMember.delete({
      where: { familyGroupId_memberId: { familyGroupId, memberId } },
    }),
};
