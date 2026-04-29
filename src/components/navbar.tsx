'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { isCounterRole } from '@/lib/accounting';
import {
  useTranslation,
  useLang,
  availableLanguages,
} from './language-provider';
import type { Lang } from '@/lib/i18n';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';

const IPFS_HASH = 'QmToPhMQe1dqt7aVAoPumwkqyRhR2EjnvCmw1stPjCpvq3';
const defaultLogo = `https://gateway.pinata.cloud/ipfs/${IPFS_HASH}/`;

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-orange-500',
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);

  useEffect(() => {
    setPhotoFailed(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session || !isMember) {
      setCartItemsCount(0);
      return;
    }

    const updateCartCount = () => {
      try {
        const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
        if (!raw) {
          setCartItemsCount(0);
          return;
        }

        const items = JSON.parse(raw) as ActivityCartItem[];
        setCartItemsCount(items.length);
      } catch {
        setCartItemsCount(0);
      }
    };

    updateCartCount();

    const handleFocus = () => updateCartCount();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_CART_STORAGE_KEY) {
        updateCartCount();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isMember, session]);
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

  const logoUrl = defaultLogo;

  const linkClass =
    'opacity-80 hover:opacity-100 transition-opacity text-sm font-medium';

  const renderUnreadIcon = () => (
    <span
      className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
      aria-label="Mensajes sin leer"
      title="Mensajes sin leer"
    />
  );

  const renderCartNotificationIcon = () => (
    <span
      className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400"
      aria-label="Tenés actividades en el carrito"
      title="Tenés actividades en el carrito"
    />
  );

  return (
    <nav className="px-4 py-3 text-white shadow-md bg-[#393f45]">
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
          {session && !isCounter && (
            <Link href={activitiesHref} className={linkClass}>
              {isMember ? t.myActivities : t.activities}
            </Link>
          )}
          {isMember && (
            <Link
              href="/activities/cart"
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Carrito</span>
              {cartItemsCount > 0 && renderCartNotificationIcon()}
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
                <div className="relative group">
                  <button className={linkClass}>Administrador</button>
                  <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-56">
                    <Link
                      href="/admin/notifications"
                      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black"
                    >
                      Notificaciones
                    </Link>
                    <Link
                      href="/admin/audit-log"
                      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm border-t text-black"
                    >
                      Registro de auditoría
                    </Link>
                  </div>
                </div>
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
          <Link href="/faq" className={linkClass}>
            FAQ
          </Link>
          {session ? (
            <div className="flex items-center gap-3">
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
                      avatarColor(session.user.id)
                    )}
                  >
                    {initials(session.user.name)}
                  </span>
                )}
              </div>
              <div className="relative group">
                <button className={linkClass}>{t.profile}</button>
                <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-48">
                  <Link
                    href="/profile"
                    className="block w-full text-left px-4 py-2 hover:bg-muted text-sm text-black"
                  >
                    {t.profile}
                  </Link>
                  <Link
                    href="/profile/children"
                    className="block w-full text-left px-4 py-2 hover:bg-muted text-sm border-t text-black"
                  >
                    {actions.myChildren}
                  </Link>
                  <Link
                    href="/activities/cart"
                    className="block w-full text-left px-4 py-2 hover:bg-muted text-sm border-t text-black"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>Carrito</span>
                      {cartItemsCount > 0 && renderCartNotificationIcon()}
                    </span>
                  </Link>
                  <Link
                    href="/profile/payments"
                    className="block w-full text-left px-4 py-2 hover:bg-muted text-sm border-t text-black"
                  >
                    Historial de pagos
                  </Link>
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
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t text-black"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            </div>
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
        </div>
      </div>

      {menuOpen && (
        <div className="mt-3 border-t border-white/20 pt-3 flex flex-col gap-3 md:hidden">
          {session && !isCounter && (
            <Link
              href={activitiesHref}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {isMember ? t.myActivities : t.activities}
            </Link>
          )}
          {isMember && (
            <Link
              href="/activities/cart"
              className={`${linkClass} inline-flex items-center gap-2`}
              onClick={() => setMenuOpen(false)}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Carrito</span>
              {cartItemsCount > 0 && renderCartNotificationIcon()}
            </Link>
          )}
          {session && (
            <Link
              href="/chat"
              className={`${linkClass} inline-flex items-center gap-2`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{t.chat}</span>
              {hasUnreadMessages && renderUnreadIcon()}
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
              {isSuperAdmin && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium opacity-90">
                    Administrador
                  </span>
                  <Link
                    href="/admin/notifications"
                    className={linkClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    Notificaciones
                  </Link>
                  <Link
                    href="/admin/audit-log"
                    className={linkClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    Registro de auditoría
                  </Link>
                </div>
              )}
            </>
          )}
          {isAccounting && (
            <Link
              href="/accounting"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {t.accounting}
            </Link>
          )}
          <Link
            href="/contact"
            className={linkClass}
            onClick={() => setMenuOpen(false)}
          >
            {t.contact}
          </Link>
          <Link
            href="/faq"
            className={linkClass}
            onClick={() => setMenuOpen(false)}
          >
            FAQ
          </Link>
          {session ? (
            <>
              <div className="flex items-center gap-3 py-2">
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
                        avatarColor(session.user.id)
                      )}
                    >
                      {initials(session.user.name)}
                    </span>
                  )}
                </div>
                <span className="text-sm opacity-80">
                  {session.user.name || 'Usuario'}
                </span>
              </div>
              <Link
                href="/profile"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {t.profile}
              </Link>
              <Link
                href="/profile/children"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {actions.myChildren}
              </Link>
              <Link
                href="/activities/cart"
                className={`${linkClass} inline-flex items-center gap-2`}
                onClick={() => setMenuOpen(false)}
              >
                <span>Carrito</span>
                {cartItemsCount > 0 && renderCartNotificationIcon()}
              </Link>
              <Link
                href="/profile/payments"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Historial de pagos
              </Link>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="bg-transparent text-white opacity-80 text-sm w-fit [&>option]:bg-[#393f45] [&>option]:text-white"
              >
                {availableLanguages.map(({ code, flag, label }) => (
                  <option key={code} value={code}>
                    {flag} {label}
                  </option>
                ))}
              </select>
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
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="bg-transparent text-white opacity-80 text-sm w-fit [&>option]:bg-[#393f45] [&>option]:text-white"
              >
                {availableLanguages.map(({ code, flag, label }) => (
                  <option key={code} value={code}>
                    {flag} {label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
