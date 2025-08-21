'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import type { SiteSettings } from '@/types/site';

const defaultLogo =
  'https://lh6.googleusercontent.com/hX1qgSPLZYte1_e1xQwiDdMTxlxH3h1isoxUqgXoFnylzCCyiLC8q9dvMSSM-cbtHBdkrl_wlkqyknspAH12YnDAIEIdo5fmegdteoOHIUNEK_nu_0fHbE6J6S5WtghSXZiqIPcd1A=w16383';

export default function Navbar({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const { data: session } = useSession();

  return (
    <nav
      className="flex items-center justify-between px-4 py-2 text-white"
      style={{ backgroundColor: settings?.navbarColor || '#1e293b' }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image
          src={settings?.logo || defaultLogo}
          alt="Hualas Club logo"
          width={40}
          height={40}
          unoptimized
        />
        <span className="font-semibold">Hualas Patagónico</span>
      </Link>
      <div className="flex items-center gap-[5ch]">
        <Link href="/">Home</Link>
        <Link href="/activities">Activities</Link>
        <Link href="/contact">Contacto</Link>
        {session && <Link href="/chat">Chat</Link>}
        {session?.user.role === 'ADMIN' && (
          <>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/forms">Forms</Link>
            <Link href="/admin/site">Site Administrator</Link>
          </>
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
