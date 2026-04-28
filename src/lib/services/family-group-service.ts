import { prisma } from '@/lib/prisma';

export const familyGroupService = {
  getFamilyGroupByResponsible: (responsibleUserId: string) =>
    prisma.familyGroup.findFirst({ where: { responsibleUserId }, include: { members: true } }),
  getMembersForFamilyGroup: (familyGroupId: string) =>
    prisma.familyGroupMember.findMany({ where: { familyGroupId }, include: { member: true } }),
  addMemberToFamilyGroup: (familyGroupId: string, memberId: string) =>
    prisma.familyGroupMember.create({ data: { familyGroupId, memberId } }),
  removeMemberFromFamilyGroup: (familyGroupId: string, memberId: string) =>
    prisma.familyGroupMember.delete({ where: { familyGroupId_memberId: { familyGroupId, memberId } } }),
};
