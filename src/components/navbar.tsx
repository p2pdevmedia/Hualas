'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white">
      <Link href="/" className="font-semibold">
        Hualas Club
      </Link>
      <div className="flex items-center gap-[5ch]">
        <Link href="/">Home</Link>
        <Link href="/activities">Actividades</Link>
        {session && <Link href="/chat">Chat</Link>}
        {session?.user.role === 'ADMIN' && (
          <Link href="/admin/users">Users</Link>
        )}
        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hover:underline"
          >
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
