import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
  }

  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
  }
}
