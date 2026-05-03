import NextAuth, { DefaultSession } from 'next-auth';

type AppRole = 'ADMIN' | 'COUNTER' | 'MEMBER' | 'PROFESSOR' | 'SUPER_ADMIN';

declare module 'next-auth' {
  interface User {
    id: string;
    role: AppRole;
    activeRole: AppRole;
    roles: AppRole[];
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      activeRole: AppRole;
      roles: AppRole[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: AppRole;
    activeRole?: AppRole;
    roles?: AppRole[];
  }
}
