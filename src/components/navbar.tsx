'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { SiteSettings } from '@/types/site';
import {
  useTranslation,
  useLang,
  availableLanguages,
} from './language-provider';
import type { Lang } from '@/lib/i18n';

const defaultLogo =
  'https://lh6.googleusercontent.com/hX1qgSPLZYte1_e1xQwiDdMTxlxH3h1isoxUqgXoFnylzCCyiLC8q9dvMSSM-cbtHBdkrl_wlkqyknspAH12YnDAIEIdo5fmegdteoOHIUNEK_nu_0fHbE6J6S5WtghSXZiqIPcd1A=w16383';

export default function Navbar() {
  const { data: session } = useSession();
  const t = useTranslation().nav;
  const { lang, setLang } = useLang();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/site-settings');
        if (res.ok) {
          setSettings((await res.json()) as SiteSettings);
        }
      } catch (error) {
        console.error('Failed to load site settings', error);
      }
    }
    fetchSettings();
  }, []);

  const logoUrl = settings?.logo
    ? `https://gateway.pinata.cloud/ipfs/${settings.logo}`
    : defaultLogo;

  return (
    <nav
      className="flex items-center justify-between px-4 py-2 text-white"
      style={{ backgroundColor: settings?.navbarColor || '#1e293b' }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image
          src={logoUrl}
          alt="Hualas Club logo"
          width={40}
          height={40}
          unoptimized
        />
        <span className="font-semibold">Hualas Patagónico</span>
      </Link>
      <div className="flex items-center gap-[5ch]">
        <Link href="/">{t.home}</Link>
        <Link href="/activities">{t.activities}</Link>
        <Link href="/contact">{t.contact}</Link>
        {session && <Link href="/chat">{t.chat}</Link>}
        {session && <Link href="/profile">{t.profile}</Link>}
        {session?.user.role === 'ADMIN' && (
          <>
            <Link href="/admin/users">{t.users}</Link>
            <Link href="/admin/forms">{t.forms}</Link>
            <Link href="/admin/site">{t.admin}</Link>
          </>
        )}
        {session ? (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hover:underline"
          >
            {t.logout}
          </button>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              {t.login}
            </Link>
            <Link href="/register" className="hover:underline">
              {t.register}
            </Link>
          </>
        )}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="bg-transparent text-black dark:text-white"
        >
          {availableLanguages.map(({ code, flag }) => (
            <option key={code} value={code}>
              {flag}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
