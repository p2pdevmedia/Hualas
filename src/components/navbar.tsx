'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
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

  const linkClass =
    'opacity-80 hover:opacity-100 transition-opacity text-sm font-medium';

  return (
    <nav
      className="px-4 py-3 text-white shadow-md"
      style={{ backgroundColor: settings?.navbarColor || '#1e293b' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={logoUrl}
            alt="Hualas Club logo"
            width={36}
            height={36}
            unoptimized
            className="rounded-full"
          />
          <span className="font-semibold tracking-tight">
            Hualas Patagónico
          </span>
        </Link>

        <button
          className="rounded-md p-1.5 opacity-80 hover:opacity-100 md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="hidden md:flex md:items-center md:gap-6">
          <Link href="/activities" className={linkClass}>
            {t.activities}
          </Link>
          {session && (
            <Link href="/chat" className={linkClass}>
              {t.chat}
            </Link>
          )}
          {isAdmin && (
            <>
              <Link href="/admin/users" className={linkClass}>
                {t.users}
              </Link>
              <Link href="/admin/forms" className={linkClass}>
                {t.forms}
              </Link>
              <Link href="/admin/notifications" className={linkClass}>
                {t.notifications}
              </Link>
              {isSuperAdmin && (
                <Link href="/admin/site" className={linkClass}>
                  {t.admin}
                </Link>
              )}
            </>
          )}
          <Link href="/contact" className={linkClass}>
            {t.contact}
          </Link>
          {session ? (
            <>
              <Link href="/profile" className={linkClass}>
                {t.profile}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={linkClass}
              >
                {t.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25 transition-colors"
              >
                {t.register}
              </Link>
            </>
          )}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="bg-transparent text-white opacity-80 hover:opacity-100 cursor-pointer text-sm [&>option]:bg-slate-800 [&>option]:text-white"
          >
            {availableLanguages.map(({ code, flag }) => (
              <option key={code} value={code}>
                {flag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {menuOpen && (
        <div className="mt-3 border-t border-white/20 pt-3 flex flex-col gap-3 md:hidden">
          <Link
            href="/activities"
            className={linkClass}
            onClick={() => setMenuOpen(false)}
          >
            {t.activities}
          </Link>
          {session && (
            <Link
              href="/chat"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {t.chat}
            </Link>
          )}
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.users}
              </Link>
              <Link
                href="/admin/forms"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.forms}
              </Link>
              <Link
                href="/admin/notifications"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.notifications}
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/admin/site"
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {t.admin}
                </Link>
              )}
            </>
          )}
          <Link
            href="/contact"
            className={linkClass}
            onClick={() => setMenuOpen(false)}
          >
            {t.contact}
          </Link>
          {session ? (
            <>
              <Link
                href="/profile"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.profile}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={`${linkClass} text-left`}
              >
                {t.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.register}
              </Link>
            </>
          )}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="bg-transparent text-white opacity-80 text-sm w-fit [&>option]:bg-slate-800 [&>option]:text-white"
          >
            {availableLanguages.map(({ code, flag }) => (
              <option key={code} value={code}>
                {flag}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
}
