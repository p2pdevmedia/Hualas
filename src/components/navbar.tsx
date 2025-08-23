'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
  const role = session?.user.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const t = useTranslation().nav;
  const { lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetch('/api/site-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSettings(data));
  }, []);

  const logoUrl = settings?.logo
    ? `https://gateway.pinata.cloud/ipfs/${settings.logo}`
    : defaultLogo;

  return (
    <nav
      className="flex flex-col px-4 py-2 text-white"
      style={{ backgroundColor: settings?.navbarColor || '#1e293b' }}
    >
      <div className="flex items-center justify-between">
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
        <button
          className="md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <Menu />
        </button>
      </div>
      <div
        className={`${menuOpen ? 'flex' : 'hidden'} flex-col gap-2 mt-2 md:mt-0 md:flex md:flex-row md:items-center md:gap-[5ch]`}
      >
        <Link href="/activities">{t.activities}</Link>
        {session && <Link href="/chat">{t.chat}</Link>}
        {isAdmin && (
          <>
            <Link href="/admin/users">{t.users}</Link>
            <Link href="/admin/forms">{t.forms}</Link>
            {isSuperAdmin && <Link href="/admin/site">{t.admin}</Link>}
          </>
        )}
        <Link href="/contact">{t.contact}</Link>
        {session ? (
          <>
            <Link href="/profile">{t.profile}</Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="hover:underline"
            >
              {t.logout}
            </button>
          </>
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
