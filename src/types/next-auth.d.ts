import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'ADMIN' | 'MEMBER';
  }

  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'MEMBER';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'MEMBER';
  }
}
