'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
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

  const navbarStyle = settings?.navbarColor
    ? {
        backgroundColor: `${settings.navbarColor}e6`,
      }
    : undefined;

  const NavLink = ({ href, children }: { href: string; children: ReactNode }) => (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
    >
      {children}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav
        className="border-b border-white/40 bg-white/90 backdrop-blur"
        style={navbarStyle}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 text-slate-700 md:flex-row md:items-center md:justify-between md:py-3">
          <div className="flex w-full items-center justify-between gap-4 md:w-auto">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 shadow-lg shadow-slate-900/20">
                <Image
                  src={logoUrl}
                  alt="Hualas Club logo"
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain"
                  unoptimized
                />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900">
                  Hualas Patagónico
                </span>
                <span className="text-sm text-slate-500">
                  Club Social &amp; Deportivo
                </span>
              </div>
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-full bg-white/80 p-2 text-slate-600 shadow-sm ring-1 ring-white/60 transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 md:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div
            className={`${
              menuOpen ? 'flex' : 'hidden'
            } flex-col gap-2 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur md:flex md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <NavLink href="/activities">{t.activities}</NavLink>
              {session && <NavLink href="/chat">{t.chat}</NavLink>}
              {isAdmin && (
                <>
                  <NavLink href="/admin/users">{t.users}</NavLink>
                  <NavLink href="/admin/forms">{t.forms}</NavLink>
                  <NavLink href="/admin/notifications">{t.notifications}</NavLink>
                  {isSuperAdmin && <NavLink href="/admin/site">{t.admin}</NavLink>}
                </>
              )}
              <NavLink href="/contact">{t.contact}</NavLink>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              {session ? (
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <NavLink href="/profile">{t.profile}</NavLink>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                  >
                    {t.logout}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <NavLink href="/login">{t.login}</NavLink>
                  <NavLink href="/register">{t.register}</NavLink>
                </div>
              )}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="w-full rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 md:w-auto"
              >
                {availableLanguages.map(({ code, flag }) => (
                  <option key={code} value={code}>
                    {flag}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
