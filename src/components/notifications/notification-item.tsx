'use client';

import {
  Bell,
  CalendarPlus,
  CalendarClock,
  CalendarX2,
  CalendarCheck2,
  UserCheck,
  CheckCircle2,
  Wallet,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  Newspaper,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import type { NotificationType } from '@prisma/client';
import { cn } from '@/lib/utils';

const ICONS: Record<NotificationType, typeof Bell> = {
  ACTIVITY_DAY_NEW: CalendarPlus,
  ACTIVITY_DAY_UPDATED: CalendarClock,
  ACTIVITY_DAY_CANCELLED: CalendarX2,
  ACTIVITY_DAY_REACTIVATED: CalendarCheck2,
  PICKUP_NOTICE_CREATED: UserCheck,
  PICKUP_NOTICE_ACKNOWLEDGED: CheckCircle2,
  PAYMENT_MANUAL_CREATED: Wallet,
  PAYMENT_APPROVED: CheckCircle,
  PAYMENT_REJECTED: XCircle,
  ACTIVITY_CAPACITY_FULL: Users,
  CHAT_MESSAGE_NEW: MessageSquare,
  NEWS_CREATED: Newspaper,
  PROFESSOR_INVOICE_CREATED: FileText,
  PROFESSOR_ACTIVITY_ASSIGNED: CalendarPlus,
  PROFESSOR_GROUP_ASSIGNED: ClipboardCheck,
};

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.round(hr / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export type NotificationItemProps = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  readAt: Date | null;
  createdAt: Date;
  onClick: (id: string, url: string | null) => void;
};

export default function NotificationItem({
  id,
  type,
  title,
  body,
  url,
  readAt,
  createdAt,
  onClick,
}: NotificationItemProps) {
  const Icon = ICONS[type] ?? Bell;
  const isUnread = !readAt;

  return (
    <button
      type="button"
      onClick={() => onClick(id, url)}
      className={cn(
        'w-full text-left flex gap-3 px-3 py-2.5 transition-colors',
        isUnread ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50'
      )}
    >
      <div
        className={cn(
          'shrink-0 mt-0.5 grid place-items-center w-8 h-8 rounded-full',
          isUnread ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
            )}
          >
            {title}
          </span>
          <span className="shrink-0 text-[11px] text-gray-400">
            {relativeTime(createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{body}</p>
      </div>
      {isUnread && (
        <span
          className="shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500"
          aria-hidden
        />
      )}
    </button>
  );
}
