'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import NotificationBell from './notifications/notification-bell';
import PushManager from './notifications/push-manager';

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
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCounter = isCounterRole(role);
  const isAccounting = role === 'COUNTER' || isAdmin;
  const isProfessor = role === 'PROFESSOR';
  const isMember = !!session && !isAdmin && !isCounter;
  const isMemberRole = role === 'MEMBER';
  const activitiesHref = isMember ? '/my-activities' : '/activities';
  const translations = useTranslation();
  const t = translations.nav;
  const actions = translations.actions;
  const { lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setPhotoFailed(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session || !isMemberRole) {
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
    'opacity-80 hover:opacity-100 hover:text-primary transition-all duration-200 text-sm font-medium';

  const isActiveRoute = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinkClass = (href: string) =>
    cn(
      linkClass,
      'relative w-fit after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:rounded-full after:bg-primary after:transition-transform after:duration-200',
      isActiveRoute(href)
        ? 'text-primary opacity-100 after:scale-x-100'
        : 'after:scale-x-0 hover:after:scale-x-100'
    );

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
    <nav
      className={cn(
        'sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:backdrop-blur-xl',
        isScrolled
          ? 'border-white/10 bg-[#393f45]/85 text-white shadow-lg shadow-black/10'
          : 'border-border/60 bg-white/80 text-foreground shadow-sm'
      )}
    >
      <div className="flex max-w-full items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-colors duration-200 hover:text-primary"
        >
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

        <div className="flex items-center gap-1 md:hidden">
          {session && <NotificationBell />}
          <button
            className="rounded-md p-1.5 opacity-80 hover:opacity-100 hover:text-primary transition-all duration-200"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="hidden md:flex md:items-center md:gap-6">
          {session && !isCounter && (
            <Link
              href={activitiesHref}
              className={navLinkClass(activitiesHref)}
            >
              {isMember ? t.myActivities : t.activities}
            </Link>
          )}
          {session && (
            <div className="relative group">
              <button className={`${linkClass} inline-flex items-center gap-2`}>
                <span>Comunicación</span>
                {hasUnreadMessages && renderUnreadIcon()}
              </button>
              <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-56">
                <Link
                  href="/chat"
                  className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm text-black"
                >
                  {t.chat}
                </Link>
                {(isMember || isAdmin) && (
                  <Link
                    href="/profile/pickup-notices"
                    className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                  >
                    Avisos de Retiro
                  </Link>
                )}
              </div>
            </div>
          )}
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className={navLinkClass('/admin/users')}
              >
                {t.users}
              </Link>
              <Link
                href="/admin/forms"
                className={navLinkClass('/admin/forms')}
              >
                {t.forms}
              </Link>
              {isSuperAdmin && (
                <div className="relative group">
                  <button className={linkClass}>Administrador</button>
                  <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-56">
                    <Link
                      href="/admin/notifications"
                      className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm text-black"
                    >
                      Notificaciones
                    </Link>
                    <Link
                      href="/admin/audit-log"
                      className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                    >
                      Registro de auditoría
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
          {isAccounting && (
            <Link href="/accounting" className={navLinkClass('/accounting')}>
              {t.accounting}
            </Link>
          )}
          {(!session || (!isAdmin && !isCounter)) && (
            <>
              <Link href="/contact" className={navLinkClass('/contact')}>
                {t.contact}
              </Link>
              <Link href="/faq" className={navLinkClass('/faq')}>
                FAQ
              </Link>
            </>
          )}
          {session ? (
            <div className="flex items-center gap-3">
              {isMemberRole && (
                <Link
                  href="/activities/cart"
                  className={cn(
                    navLinkClass('/activities/cart'),
                    'relative inline-flex items-center gap-1'
                  )}
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  {cartItemsCount > 0 && renderCartNotificationIcon()}
                </Link>
              )}
              <div className="relative group">
                <div
                  className={cn(
                    'shrink-0 overflow-hidden rounded-full text-white grid place-items-center font-semibold bg-muted cursor-pointer',
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
                <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-48">
                  <Link
                    href="/profile"
                    className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm text-black"
                  >
                    {t.profile}
                  </Link>
                  <Link
                    href="/profile/children"
                    className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                  >
                    {actions.myChildren}
                  </Link>
                  {isMemberRole && (
                    <Link
                      href="/activities/cart"
                      className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>Carrito</span>
                        {cartItemsCount > 0 && renderCartNotificationIcon()}
                      </span>
                    </Link>
                  )}
                  <Link
                    href="/profile/payments"
                    className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                  >
                    Historial de pagos
                  </Link>
                  {isProfessor && (
                    <Link
                      href="/my-payments"
                      className="block w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                    >
                      Mis pagos
                    </Link>
                  )}
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className="w-full border-t px-4 py-2 text-sm bg-card text-black hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    {availableLanguages.map(({ code, flag, label }) => (
                      <option key={code} value={code}>
                        {flag} {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left px-4 py-2 hover:bg-muted hover:text-primary transition-colors text-sm border-t text-black"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
              <NotificationBell />
            </div>
          ) : (
            <>
              <Link href="/login" className={navLinkClass('/login')}>
                {t.login}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25 hover:text-primary transition-all duration-200"
              >
                {t.register}
              </Link>
            </>
          )}
        </div>
      </div>

      <PushManager />
      {menuOpen && (
        <div className="mt-3 border-t border-white/20 pt-3 flex flex-col gap-3 md:hidden">
          {session && !isCounter && (
            <Link
              href={activitiesHref}
              className={navLinkClass(activitiesHref)}
              onClick={() => setMenuOpen(false)}
            >
              {isMember ? t.myActivities : t.activities}
            </Link>
          )}
          {isMemberRole && (
            <Link
              href="/activities/cart"
              className={cn(
                navLinkClass('/activities/cart'),
                'inline-flex items-center gap-2'
              )}
              onClick={() => setMenuOpen(false)}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Carrito</span>
              {cartItemsCount > 0 && renderCartNotificationIcon()}
            </Link>
          )}
          {session && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium opacity-90">
                Comunicación
              </span>
              <Link
                href="/chat"
                className={navLinkClass('/chat')}
                onClick={() => setMenuOpen(false)}
              >
                {t.chat} {hasUnreadMessages && renderUnreadIcon()}
              </Link>
              {isMember && (
                <Link
                  href="/profile/pickup-notices"
                  className={navLinkClass('/profile/pickup-notices')}
                  onClick={() => setMenuOpen(false)}
                >
                  Avisos de Retiro
                </Link>
              )}
            </div>
          )}
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className={navLinkClass('/admin/users')}
                onClick={() => setMenuOpen(false)}
              >
                {t.users}
              </Link>
              <Link
                href="/admin/forms"
                className={navLinkClass('/admin/forms')}
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
                    className={navLinkClass('/admin/notifications')}
                    onClick={() => setMenuOpen(false)}
                  >
                    Notificaciones
                  </Link>
                  <Link
                    href="/admin/audit-log"
                    className={navLinkClass('/admin/audit-log')}
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
              className={navLinkClass('/accounting')}
              onClick={() => setMenuOpen(false)}
            >
              {t.accounting}
            </Link>
          )}
          {(!session || (!isAdmin && !isCounter)) && (
            <>
              <Link
                href="/contact"
                className={navLinkClass('/contact')}
                onClick={() => setMenuOpen(false)}
              >
                {t.contact}
              </Link>
              <Link
                href="/faq"
                className={navLinkClass('/faq')}
                onClick={() => setMenuOpen(false)}
              >
                FAQ
              </Link>
            </>
          )}
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
                className={navLinkClass('/profile')}
                onClick={() => setMenuOpen(false)}
              >
                {t.profile}
              </Link>
              <Link
                href="/profile/children"
                className={navLinkClass('/profile/children')}
                onClick={() => setMenuOpen(false)}
              >
                {actions.myChildren}
              </Link>
              {isMemberRole && (
                <Link
                  href="/activities/cart"
                  className={cn(
                    navLinkClass('/activities/cart'),
                    'inline-flex items-center gap-2'
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Carrito</span>
                  {cartItemsCount > 0 && renderCartNotificationIcon()}
                </Link>
              )}
              <Link
                href="/profile/payments"
                className={navLinkClass('/profile/payments')}
                onClick={() => setMenuOpen(false)}
              >
                Historial de pagos
              </Link>
              {isProfessor && (
                <Link
                  href="/my-payments"
                  className={navLinkClass('/my-payments')}
                  onClick={() => setMenuOpen(false)}
                >
                  Mis pagos
                </Link>
              )}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className={cn(
                  'bg-transparent opacity-80 hover:opacity-100 hover:text-primary transition-all duration-200 text-sm w-fit',
                  isScrolled
                    ? 'text-white [&>option]:bg-[#393f45] [&>option]:text-white'
                    : 'text-foreground [&>option]:bg-white [&>option]:text-foreground'
                )}
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
                className={navLinkClass('/login')}
                onClick={() => setMenuOpen(false)}
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                className={navLinkClass('/register')}
                onClick={() => setMenuOpen(false)}
              >
                {t.register}
              </Link>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className={cn(
                  'bg-transparent opacity-80 hover:opacity-100 hover:text-primary transition-all duration-200 text-sm w-fit',
                  isScrolled
                    ? 'text-white [&>option]:bg-[#393f45] [&>option]:text-white'
                    : 'text-foreground [&>option]:bg-white [&>option]:text-foreground'
                )}
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
