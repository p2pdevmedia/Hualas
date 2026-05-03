import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import type { Role } from '@prisma/client';

async function loadRoleState(userId: string): Promise<{
  roles: Role[];
  activeRole: Role;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeRole: true,
      roleAssignments: { select: { role: true } },
    },
  });

  // MEMBER is implicit: every user can act as a parent/member without an
  // explicit assignment. Elevated roles come from UserRoleAssignment rows.
  const elevated = user?.roleAssignments.map((a) => a.role) ?? [];
  const roles = Array.from(new Set<Role>(['MEMBER', ...elevated]));
  const activeRole: Role =
    user?.activeRole && roles.includes(user.activeRole)
      ? user.activeRole
      : 'MEMBER';
  return { roles, activeRole };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.password || !user.isActive) return null;
        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          activeRole: user.activeRole,
          roles: [],
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? `__Secure-next-auth.session-token`
          : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider !== 'credentials') {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });
        if (!existingUser) {
          const randomPassword = await hash(randomUUID(), 12);
          existingUser = await prisma.user.create({
            data: {
              email,
              name: user.name,
              password: randomPassword,
            },
          });
        }
        if (!existingUser.isActive) return false;
        user.id = existingUser.id;
        (user as any).role = existingUser.role;
        (user as any).activeRole = existingUser.activeRole;
      }

      const now = new Date();
      await Promise.all([
        prisma.user.update({
          where: { id: user.id! },
          data: { lastLogin: now },
        }),
        prisma.dbAuditLog.create({
          data: {
            model: 'User',
            action: 'login',
            recordId: user.id,
            userId: user.id,
            after: {
              email: user.email,
              name: user.name,
            },
          },
        }),
      ]);

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const state = await loadRoleState(user.id!);
        token.roles = state.roles;
        token.activeRole = state.activeRole;
        token.role = state.activeRole;
      }
      // Refresh roles + activeRole from DB whenever the client requests an
      // update (e.g. after switching active profile).
      if (trigger === 'update' && token.sub) {
        const state = await loadRoleState(token.sub);
        token.roles = state.roles;
        token.activeRole = state.activeRole;
        token.role = state.activeRole;
        if (session && (session as any).updatedAt) {
          token.updatedAt = (session as any).updatedAt;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).roles = token.roles ?? ['MEMBER'];
        (session.user as any).activeRole = token.activeRole ?? 'MEMBER';
        (session.user as any).role = token.activeRole ?? token.role ?? 'MEMBER';
        (session.user as any).updatedAt = token.updatedAt;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
