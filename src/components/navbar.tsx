'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import LanguageSwitcher from './language-switcher';
import { useLanguage } from '@/lib/language-context';

export default function Navbar() {
  const { data: session } = useSession();
  const { t } = useLanguage();

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="https://lh6.googleusercontent.com/hX1qgSPLZYte1_e1xQwiDdMTxlxH3h1isoxUqgXoFnylzCCyiLC8q9dvMSSM-cbtHBdkrl_wlkqyknspAH12YnDAIEIdo5fmegdteoOHIUNEK_nu_0fHbE6J6S5WtghSXZiqIPcd1A=w16383"
          alt="Hualas Club logo"
          width={40}
          height={40}
          unoptimized
        />
        <span className="font-semibold">Hualas Patagónico</span>
      </Link>
      <div className="flex items-center gap-[5ch]">
        <Link href="/">{t('home')}</Link>
        <Link href="/activities">{t('activities')}</Link>
        <Link href="/contact">{t('contact')}</Link>
        {session && <Link href="/chat">{t('chat')}</Link>}
        {session?.user.role === 'ADMIN' && (
          <>
            <Link href="/admin/users">{t('users')}</Link>
            <Link href="/admin/forms">{t('forms')}</Link>
          </>
        )}
        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hover:underline"
          >
            {t('logout')}
          </button>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              {t('login')}
            </Link>
            <Link href="/register" className="hover:underline">
              {t('register')}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  );
}

