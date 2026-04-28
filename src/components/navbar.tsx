'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Box, Flex, Button as RadixButton, Avatar as RadixAvatar, Text } from '@radix-ui/themes';
import { HamburgerMenuIcon, ExitIcon, DotFilledIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { isCounterRole } from '@/lib/accounting';
import {
  useTranslation,
  useLang,
  availableLanguages,
} from './language-provider';
import type { Lang } from '@/lib/i18n';
import { Button } from './ui/button';

const IPFS_HASH = 'QmToPhMQe1dqt7aVAoPumwkqyRhR2EjnvCmw1stPjCpvq3';
const defaultLogo = `https://gateway.pinata.cloud/ipfs/${IPFS_HASH}/`;

const AVATAR_COLORS = [
  'tomato',
  'orange',
  'amber',
  'grass',
  'sky',
  'violet',
  'pink',
  'plum',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string | null | undefined) {
  const parts = (name ?? '?').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

export default function Navbar() {
  const { data: session } = useSession();
  const role = session?.user.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCounter = isCounterRole(role);
  const isAccounting = role === 'COUNTER' || isAdmin;
  const isMember = !!session && !isAdmin && !isCounter;
  const activitiesHref = isMember ? '/my-activities' : '/activities';
  const translations = useTranslation();
  const t = translations.nav;
  const actions = translations.actions;
  const { lang, setLang } = useLang();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) {
      setHasUnreadMessages(false);
      return;
    }

    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) return;
        const conversations = (await res.json()) as { unreadCount?: number }[];
        if (!cancelled) {
          setHasUnreadMessages(
            conversations.some((c) => (c.unreadCount ?? 0) > 0)
          );
        }
      } catch {
        if (!cancelled) {
          setHasUnreadMessages(false);
        }
      }
    };

    fetchUnread();
    const id = window.setInterval(fetchUnread, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session]);

  const linkClass =
    'text-sm font-medium text-white opacity-80 hover:opacity-100 transition-opacity';

  const mobileNavLinkClass =
    'text-sm font-medium text-white opacity-80 hover:opacity-100 transition-opacity block w-full text-left px-4 py-2';

  const renderUnreadIcon = () => (
    <span
      className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
      aria-label="Mensajes sin leer"
      title="Mensajes sin leer"
    />
  );

  return (
    <nav className="px-4 py-3 text-white shadow-md bg-slate-800">
      <Flex
        justify="between"
        align="center"
        className="mx-auto max-w-6xl"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={defaultLogo}
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

        {/* Desktop Menu */}
        <Flex
          gap="6"
          align="center"
          className="hidden md:flex md:items-center"
        >
          {session && !isCounter && (
            <Link href={activitiesHref} className={linkClass}>
              {isMember ? t.myActivities : t.activities}
            </Link>
          )}
          {session && (
            <Link
              href="/chat"
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <span>{t.chat}</span>
              {hasUnreadMessages && renderUnreadIcon()}
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
              {isSuperAdmin && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className={linkClass}>Administrador</button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content
                    className="min-w-56 rounded-md border bg-card shadow-lg z-50"
                    align="start"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/admin/notifications"
                        className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black cursor-pointer"
                      >
                        Notificaciones
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="border-t" />
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/admin/audit-log"
                        className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black cursor-pointer"
                      >
                        Registro de auditoría
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </>
          )}
          {isAccounting && (
            <Link href="/accounting" className={linkClass}>
              {t.accounting}
            </Link>
          )}
          <Link href="/contact" className={linkClass}>
            {t.contact}
          </Link>
          {session ? (
            <Flex gap="3" align="center">
              {/* Avatar with Dropdown */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className={cn(
                      'shrink-0 overflow-hidden rounded-full text-white grid place-items-center font-semibold bg-muted',
                      'h-9 w-9 text-xs cursor-pointer',
                      !photoFailed && 'bg-transparent'
                    )}
                    aria-label="User menu"
                  >
                    {!photoFailed ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={`/api/users/${session.user.id}/photo`}
                          alt={session.user.name ?? 'Profile photo'}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="36px"
                          onError={() => setPhotoFailed(true)}
                        />
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'grid h-full w-full place-items-center text-white',
                          {
                            'bg-rose-500': avatarColor(session.user.id) === 'tomato',
                            'bg-amber-500': avatarColor(session.user.id) === 'orange',
                            'bg-yellow-500': avatarColor(session.user.id) === 'amber',
                            'bg-emerald-500': avatarColor(session.user.id) === 'grass',
                            'bg-sky-500': avatarColor(session.user.id) === 'sky',
                            'bg-violet-500': avatarColor(session.user.id) === 'violet',
                            'bg-pink-500': avatarColor(session.user.id) === 'pink',
                            'bg-purple-500': avatarColor(session.user.id) === 'plum',
                          }
                        )}
                      >
                        {initials(session.user.name)}
                      </span>
                    )}
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  className="min-w-48 rounded-md border bg-card shadow-lg z-50"
                  align="end"
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile"
                      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black cursor-pointer"
                    >
                      {t.profile}
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile/children"
                      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black border-t cursor-pointer"
                    >
                      {actions.myChildren}
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as Lang)}
                      className="w-full border-t px-4 py-2 text-sm bg-card text-black hover:bg-muted cursor-pointer"
                    >
                      {availableLanguages.map(({ code, flag, label }) => (
                        <option key={code} value={code}>
                          {flag} {label}
                        </option>
                      ))}
                    </select>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="border-t" />
                  <DropdownMenu.Item
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-sm text-black cursor-pointer flex items-center gap-2"
                  >
                    <ExitIcon width={16} height={16} />
                    {t.logout}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          ) : (
            <Flex gap="2" align="center">
              <Link href="/login" className={linkClass}>
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25 transition-colors"
              >
                {t.register}
              </Link>
            </Flex>
          )}
        </Flex>

        {/* Mobile Menu Trigger */}
        <RadixButton
          variant="ghost"
          size="1"
          className="md:hidden text-white opacity-80 hover:opacity-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <HamburgerMenuIcon width={20} height={20} />
        </RadixButton>
      </Flex>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <Box className="md:hidden border-t border-white/20 mt-3 pt-3">
          <Flex direction="column" gap="0">
            {session && !isCounter && (
              <Link
                href={activitiesHref}
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                {isMember ? t.myActivities : t.activities}
              </Link>
            )}
            {session && (
              <Link
                href="/chat"
                className={`${mobileNavLinkClass} inline-flex items-center gap-2`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{t.chat}</span>
                {hasUnreadMessages && renderUnreadIcon()}
              </Link>
            )}
            {isAdmin && (
              <>
                <Link
                  href="/admin/users"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.users}
                </Link>
                <Link
                  href="/admin/forms"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.forms}
                </Link>
                {isSuperAdmin && (
                  <Box className="flex flex-col gap-2 px-4 py-2">
                    <span className="text-sm font-medium opacity-90">
                      Administrador
                    </span>
                    <Link
                      href="/admin/notifications"
                      className={linkClass}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Notificaciones
                    </Link>
                    <Link
                      href="/admin/audit-log"
                      className={linkClass}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Registro de auditoría
                    </Link>
                  </Box>
                )}
              </>
            )}
            {isAccounting && (
              <Link
                href="/accounting"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.accounting}
              </Link>
            )}
            <Link
              href="/contact"
              className={mobileNavLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.contact}
            </Link>
            {session ? (
              <>
                <Flex gap="3" align="center" className="px-4 py-2">
                  <div
                    className={cn(
                      'shrink-0 overflow-hidden rounded-full text-white grid place-items-center font-semibold bg-muted',
                      'h-9 w-9 text-xs',
                      !photoFailed && 'bg-transparent'
                    )}
                  >
                    {!photoFailed ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={`/api/users/${session.user.id}/photo`}
                          alt={session.user.name ?? 'Profile photo'}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="36px"
                          onError={() => setPhotoFailed(true)}
                        />
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'grid h-full w-full place-items-center text-white',
                          {
                            'bg-rose-500': avatarColor(session.user.id) === 'tomato',
                            'bg-amber-500': avatarColor(session.user.id) === 'orange',
                            'bg-yellow-500': avatarColor(session.user.id) === 'amber',
                            'bg-emerald-500': avatarColor(session.user.id) === 'grass',
                            'bg-sky-500': avatarColor(session.user.id) === 'sky',
                            'bg-violet-500': avatarColor(session.user.id) === 'violet',
                            'bg-pink-500': avatarColor(session.user.id) === 'pink',
                            'bg-purple-500': avatarColor(session.user.id) === 'plum',
                          }
                        )}
                      >
                        {initials(session.user.name)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm opacity-80">
                    {session.user.name || 'Usuario'}
                  </span>
                </Flex>
                <Link
                  href="/profile"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.profile}
                </Link>
                <Link
                  href="/profile/children"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {actions.myChildren}
                </Link>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="bg-transparent text-white opacity-80 text-sm w-fit mx-4 my-2 [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  {availableLanguages.map(({ code, flag, label }) => (
                    <option key={code} value={code}>
                      {flag} {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className={`${mobileNavLinkClass} text-left flex items-center gap-2`}
                >
                  <ExitIcon width={16} height={16} />
                  {t.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.register}
                </Link>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="bg-transparent text-white opacity-80 text-sm w-fit mx-4 my-2 [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  {availableLanguages.map(({ code, flag, label }) => (
                    <option key={code} value={code}>
                      {flag} {label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </Flex>
        </Box>
      )}
    </nav>
  );
}
