import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const MOBILE_ALLOWED_ROLES = ['MEMBER', 'PROFESSOR'] as const;
export type MobileAllowedRole = (typeof MOBILE_ALLOWED_ROLES)[number];

const MOBILE_SESSION_DAYS = 30;

export function hashMobileToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createMobileToken() {
  return randomBytes(32).toString('base64url');
}

export function getMobileAllowedRoles(user: {
  role: Role;
  roleAssignments?: Array<{ role: Role }>;
}) {
  const roles = new Set<MobileAllowedRole>(['MEMBER']);

  if (
    user.role === 'PROFESSOR' ||
    user.roleAssignments?.some((assignment) => assignment.role === 'PROFESSOR')
  ) {
    roles.add('PROFESSOR');
  }

  return Array.from(roles);
}

export function resolveMobileRole(
  availableRoles: MobileAllowedRole[],
  requestedRole?: MobileAllowedRole | null
) {
  if (requestedRole) {
    return availableRoles.includes(requestedRole) ? requestedRole : null;
  }

  if (availableRoles.includes('MEMBER')) return 'MEMBER';
  if (availableRoles.includes('PROFESSOR')) return 'PROFESSOR';
  return null;
}

export async function createMobileSession(input: {
  userId: string;
  appRole: MobileAllowedRole;
  platform?: string | null;
  deviceName?: string | null;
  deviceModel?: string | null;
  appVersion?: string | null;
}) {
  const token = createMobileToken();
  const tokenHash = hashMobileToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MOBILE_SESSION_DAYS);

  const session = await prisma.mobileSession.create({
    data: {
      userId: input.userId,
      tokenHash,
      appRole: input.appRole,
      platform: input.platform?.trim() || null,
      deviceName: input.deviceName?.trim() || null,
      deviceModel: input.deviceModel?.trim() || null,
      appVersion: input.appVersion?.trim() || null,
      expiresAt,
    },
    select: {
      id: true,
      userId: true,
      appRole: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return {
    token,
    session,
  };
}

export async function switchMobileSessionRole(input: {
  sessionId: string;
  appRole: MobileAllowedRole;
}) {
  const result = await prisma.mobileSession.updateMany({
    where: {
      id: input.sessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      appRole: input.appRole,
      lastUsedAt: new Date(),
    },
  });

  return result.count > 0;
}

function extractBearerToken(req: Request) {
  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const fallback = req.headers.get('x-mobile-token');
  return fallback?.trim() || null;
}

export async function getMobileSessionFromRequest(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return null;

  const tokenHash = hashMobileToken(token);
  const now = new Date();

  const session = await prisma.mobileSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
      user: { isActive: true },
    },
    select: {
      id: true,
      userId: true,
      appRole: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          birthDate: true,
          role: true,
          activeRole: true,
          isActive: true,
          roleAssignments: {
            select: { role: true },
          },
        },
      },
    },
  });

  if (!session) return null;

  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { lastUsedAt: now },
  });

  return session;
}

export async function revokeMobileSessionFromRequest(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return false;

  const result = await prisma.mobileSession.updateMany({
    where: {
      tokenHash: hashMobileToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}
