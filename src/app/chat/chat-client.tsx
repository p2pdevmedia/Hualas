'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const POLL_THREAD_MS = 3000;
const POLL_HISTORY_MS = 8000;

type User = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string | null;
  dni: string | null;
  role: 'ADMIN' | 'COUNTER' | 'MEMBER' | 'PROFESSOR' | 'SUPER_ADMIN';
  profilePhoto: string | null;
  updatedAt: string;
};
type Message = {
  from: string;
  content: string;
  createdAt?: string;
  readAt?: string | null;
};
type Conversation = {
  id: string;
  participants: { id: string; name: string | null }[];
  messages: Message[];
  unreadCount?: number;
};

type ActiveChat = {
  conversationId: string;
  user: User;
  lastMessage: Message | null;
  lastAt: number;
  unreadCount: number;
};

type ProfessorChatPerson = {
  userId: string;
  label: string;
  subtitle: string;
  activityParticipantId: string;
};

type ProfessorChatGroup = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: ProfessorChatPerson[];
};

type ProfessorChatActivity = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string;
  participants: ProfessorChatPerson[];
  groups: ProfessorChatGroup[];
};

type SharedParticipant = {
  userId: string;
  label: string;
  subtitle: string;
  activityCount: number;
  activities: string[];
};

type ProfessorChatContext = {
  activities: ProfessorChatActivity[];
  sharedParticipants: SharedParticipant[];
};

type SelectedGroup = {
  activityId: string;
  groupId: string;
};

type NewChatTab = 'people' | 'groups';

type PersonOption = {
  userId: string;
  label: string;
  subtitle: string;
  activityNames: string[];
  profilePhoto: string | null;
  updatedAt: string;
};

type GroupOption = {
  activityId: string;
  activityName: string;
  groupId: string;
  groupName: string;
  description: string | null;
  memberCount: number;
  members: {
    userId: string;
    label: string;
  }[];
};

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

function fullName(user: { name: string | null; lastName: string | null }) {
  return [user.name, user.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

function initials(name: string | null) {
  const parts = (name ?? '?').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

function formatPreviewTime(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'ayer';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

function formatActivityRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startText = start.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
  const endText = end.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
  return start.toDateString() === end.toDateString()
    ? startText
    : `${startText} al ${endText}`;
}

function Avatar({
  id,
  name,
  profilePhoto,
  photoVersion,
  size = 'md',
}: {
  id: string;
  name: string | null;
  profilePhoto?: string | null;
  photoVersion?: string | null;
  size?: 'sm' | 'md';
}) {
  const src = profilePhoto
    ? `/api/users/${id}/photo${photoVersion ? `?v=${new Date(photoVersion).getTime()}` : ''}`
    : null;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full text-white grid place-items-center font-semibold',
        size === 'md' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs',
        avatarColor(id)
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`Foto de perfil de ${name ?? 'usuario'}`}
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function UnreadIndicator() {
  return (
    <span
      className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
      aria-label="Mensajes sin leer"
      title="Mensajes sin leer"
    />
  );
}

export default function ChatClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(
    null
  );
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<NewChatTab>('people');
  const [newChatQuery, setNewChatQuery] = useState('');
  const [professorContext, setProfessorContext] =
    useState<ProfessorChatContext | null>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupSendStatus, setGroupSendStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => setUsers(data));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const roles = ((session.user as any).roles as string[] | undefined) ?? [];
    const isProfessor =
      roles.includes('PROFESSOR') ||
      session.user.role === 'PROFESSOR' ||
      session.user.activeRole === 'PROFESSOR';
    if (!isProfessor) {
      setProfessorContext(null);
      return;
    }

    fetch('/api/chat')
      .then((res) => res.json())
      .then((data: ProfessorChatContext) => setProfessorContext(data))
      .catch(() => setProfessorContext(null));
  }, [session]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch('/api/messages');
    if (!res.ok) return;
    const data: Conversation[] = await res.json();
    setHistory(data);
  }, []);

  const fetchThread = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages/${userId}`);
    if (!res.ok) return;
    const data: Message[] = await res.json();
    setMessages(data);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchHistory();
    const id = window.setInterval(fetchHistory, POLL_HISTORY_MS);
    return () => window.clearInterval(id);
  }, [session, fetchHistory]);

  useEffect(() => {
    if (!recipient) {
      setMessages([]);
      return;
    }
    fetchThread(recipient).then(fetchHistory);
    const id = window.setInterval(() => fetchThread(recipient), POLL_THREAD_MS);
    return () => window.clearInterval(id);
  }, [recipient, fetchThread, fetchHistory]);

  useEffect(() => {
    if (recipient) {
      setSelectedGroup(null);
      setGroupSendStatus('');
    }
  }, [recipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sessionRoles =
    ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const hasProfessorCapability =
    sessionRoles.includes('PROFESSOR') ||
    session?.user.role === 'PROFESSOR' ||
    session?.user.activeRole === 'PROFESSOR';

  const activeChats = useMemo(() => {
    if (!session) return [];

    return history
      .map<ActiveChat | null>((conversation) => {
        const otherParticipant =
          conversation.participants.find(
            (participant) => participant.id !== session.user.id
          ) ?? conversation.participants[0];
        if (!otherParticipant) {
          return null;
        }

        const user = users.find((item) => item.id === otherParticipant.id);
        if (!user) {
          return null;
        }

        const lastMessage = conversation.messages.at(-1) ?? null;
        return {
          conversationId: conversation.id,
          user,
          lastMessage,
          lastAt: lastMessage?.createdAt
            ? new Date(lastMessage.createdAt).getTime()
            : 0,
          unreadCount: conversation.unreadCount ?? 0,
        };
      })
      .filter((item): item is ActiveChat => item !== null)
      .sort((a, b) => {
        if (a.lastAt && b.lastAt) return b.lastAt - a.lastAt;
        if (a.lastAt) return -1;
        if (b.lastAt) return 1;
        return fullName(a.user).localeCompare(fullName(b.user), 'es');
      });
  }, [history, session, users]);

  const visibleActiveChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeChats;
    return activeChats.filter(
      (chat) =>
        fullName(chat.user).toLowerCase().includes(q) ||
        (chat.user.email ?? '').toLowerCase().includes(q) ||
        (chat.user.dni ?? '').toLowerCase().includes(q)
    );
  }, [activeChats, searchQuery]);

  const pickerPeople = useMemo<PersonOption[]>(() => {
    if (!session) return [];

    if (hasProfessorCapability && professorContext) {
      const map = new Map<string, PersonOption>();
      for (const activity of professorContext.activities) {
        for (const person of activity.participants) {
          const existing = map.get(person.userId);
          if (existing) {
            existing.activityNames = Array.from(
              new Set([...existing.activityNames, activity.name])
            ).sort((a, b) => a.localeCompare(b, 'es'));
            continue;
          }

          const match = users.find((user) => user.id === person.userId);
          map.set(person.userId, {
            userId: person.userId,
            label: person.label,
            subtitle: person.subtitle,
            activityNames: [activity.name],
            profilePhoto: match?.profilePhoto ?? null,
            updatedAt: match?.updatedAt ?? new Date().toISOString(),
          });
        }
      }

      return Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'es')
      );
    }

    return users
      .filter((user) => user.id !== session.user.id)
      .filter((user) => {
        const isAdmin =
          session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const isCounter = session.user.role === 'COUNTER';
        if (isAdmin || isCounter) return true;
        return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      })
      .map((user) => ({
        userId: user.id,
        label: fullName(user),
        subtitle: user.email ?? 'Sin correo',
        activityNames: [],
        profilePhoto: user.profilePhoto,
        updatedAt: user.updatedAt,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [hasProfessorCapability, professorContext, session, users]);

  const pickerGroups = useMemo<GroupOption[]>(() => {
    if (!hasProfessorCapability || !professorContext) return [];

    return professorContext.activities.flatMap((activity) =>
      activity.groups.map((group) => ({
        activityId: activity.id,
        activityName: activity.name,
        groupId: group.id,
        groupName: group.name,
        description: group.description,
        memberCount: group.memberCount,
        members: group.members.map((member) => ({
          userId: member.userId,
          label: member.label,
        })),
      }))
    );
  }, [hasProfessorCapability, professorContext]);

  const selectedUser = users.find((u) => u.id === recipient) ?? null;
  const selectedActivity = professorContext?.activities.find(
    (activity) => activity.id === selectedGroup?.activityId
  );
  const selectedGroupData = selectedActivity?.groups.find(
    (group) => group.id === selectedGroup?.groupId
  );
  const canUseProfessorTools = professorContext != null;

  const selectedGroupMessageCount = selectedGroupData?.memberCount ?? 0;

  const filteredPickerPeople = useMemo(() => {
    const q = newChatQuery.trim().toLowerCase();
    if (!q) return pickerPeople;
    return pickerPeople.filter((person) => {
      return (
        person.label.toLowerCase().includes(q) ||
        person.subtitle.toLowerCase().includes(q) ||
        person.activityNames.some((name) => name.toLowerCase().includes(q))
      );
    });
  }, [newChatQuery, pickerPeople]);

  const filteredPickerGroups = useMemo(() => {
    const q = newChatQuery.trim().toLowerCase();
    if (!q) return pickerGroups;
    return pickerGroups.filter((group) => {
      return (
        group.groupName.toLowerCase().includes(q) ||
        group.activityName.toLowerCase().includes(q) ||
        (group.description ?? '').toLowerCase().includes(q) ||
        group.members.some((member) => member.label.toLowerCase().includes(q))
      );
    });
  }, [newChatQuery, pickerGroups]);

  const openNewChat = () => {
    setNewChatOpen(true);
    setNewChatTab('people');
    setNewChatQuery('');
  };

  const startDirectChat = (userId: string) => {
    setSelectedGroup(null);
    setRecipient(userId);
    setMessages([]);
    setInput('');
    setGroupSendStatus('');
    setNewChatOpen(false);
  };

  const startGroupChat = (activityId: string, groupId: string) => {
    setRecipient('');
    setMessages([]);
    setInput('');
    setGroupSendStatus('');
    setSelectedGroup({ activityId, groupId });
    setNewChatOpen(false);
  };

  const sendMessage = async () => {
    if (!recipient || !session || !input.trim()) return;
    const content = input.trim();
    setInput('');
    try {
      const res = await fetch(`/api/messages/${recipient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        setInput(content);
        return;
      }
      const saved: Message = await res.json();
      setMessages((prev) => [...prev, saved]);
      fetchHistory();
    } catch {
      setInput(content);
    }
  };

  const sendGroupMessage = async () => {
    if (!selectedGroup || !session || !input.trim()) return;
    const content = input.trim();
    setInput('');
    setGroupSendStatus('');

    try {
      const res = await fetch(`/api/messages/groups/${selectedGroup.groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo enviar el mensaje');
      }

      setGroupSendStatus(
        `Mensaje enviado a ${payload?.recipientCount ?? selectedGroupMessageCount} usuarios.`
      );
    } catch {
      setInput(content);
    }
  };

  return (
    <div className="mx-auto h-[calc(100vh-9rem)] max-w-6xl px-2 py-4 md:px-4">
      <div className="flex h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <aside
          className={cn(
            'w-full flex-col border-r md:flex md:w-80',
            recipient || selectedGroup ? 'hidden' : 'flex'
          )}
        >
          <div className="border-b px-4 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold tracking-tight">Chats</h1>
              <button
                type="button"
                onClick={() => {
                  setNewChatOpen(true);
                  setNewChatTab('people');
                  setNewChatQuery('');
                }}
                className="rounded-full border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                Nuevo chat
              </button>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar chats activos..."
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chats activos
              </h2>
              <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                {activeChats.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleActiveChats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? 'Sin resultados'
                  : 'Todavía no tenés chats activos'}
              </p>
            ) : (
              visibleActiveChats.map(({ user, lastMessage, unreadCount }) => {
                const isSelected = recipient === user.id;
                const hasUnread = unreadCount > 0;
                const previewSender =
                  lastMessage && lastMessage.from === session?.user.id
                    ? 'Vos: '
                    : '';
                return (
                  <button
                    key={user.id}
                    onClick={() => setRecipient(user.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <Avatar
                      id={user.id}
                      name={fullName(user)}
                      profilePhoto={user.profilePhoto}
                      photoVersion={user.updatedAt}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-sm">
                          {fullName(user)}
                        </span>
                        <div className="flex items-center gap-2">
                          {hasUnread && <UnreadIndicator />}
                          {lastMessage?.createdAt && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatPreviewTime(lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {lastMessage
                          ? `${previewSender}${lastMessage.content}`
                          : 'Iniciar conversación'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={cn(
            'flex-1 flex-col',
            recipient || selectedGroup ? 'flex' : 'hidden md:flex'
          )}
        >
          {selectedGroup && selectedActivity && selectedGroupData ? (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setInput('');
                    setGroupSendStatus('');
                  }}
                  className="rounded-md p-1 hover:bg-muted md:hidden"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {selectedActivity.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Grupo {selectedGroupData.name} · {selectedGroupMessageCount}{' '}
                    usuario{selectedGroupMessageCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">
                    Mensaje para todo el grupo
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    El mensaje se duplicará en una conversación individual con
                    cada integrante del grupo.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedGroupData.members.map((person) => (
                      <span
                        key={person.activityParticipantId}
                        className="rounded-full border bg-background px-3 py-1 text-xs"
                      >
                        {person.label}
                      </span>
                    ))}
                  </div>
                </div>

                {groupSendStatus && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {groupSendStatus}
                  </div>
                )}
              </div>

              <div className="border-t p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribir mensaje al grupo..."
                    className="flex-1 rounded-full border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendGroupMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendGroupMessage}
                    disabled={!input.trim()}
                    className="rounded-full bg-primary p-2.5 text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40"
                    aria-label="Enviar al grupo"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : selectedUser ? (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <button
                  onClick={() => setRecipient('')}
                  className="rounded-md p-1 hover:bg-muted md:hidden"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar
                  id={selectedUser.id}
                  name={fullName(selectedUser)}
                  profilePhoto={selectedUser.profilePhoto}
                  photoVersion={selectedUser.updatedAt}
                  size="sm"
                />
                <span className="font-semibold">{fullName(selectedUser)}</span>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Empezá la conversación enviando un mensaje
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const isOwn = m.from === session?.user.id;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted text-foreground rounded-bl-sm'
                          )}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribir mensaje..."
                    className="flex-1 rounded-full border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="rounded-full bg-primary p-2.5 text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40"
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {canUseProfessorTools
                  ? 'Seleccioná un contacto o un grupo para empezar a chatear'
                  : 'Seleccioná un contacto para empezar a chatear'}
              </p>
            </div>
          )}
        </section>
      </div>

      {newChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4">
              <div>
                <h2 className="text-lg font-semibold">Nuevo chat</h2>
                <p className="text-sm text-muted-foreground">
                  Elegí una persona o un grupo de actividad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewChatOpen(false)}
                className="rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Cerrar
              </button>
            </div>

            <div className="border-b px-4 py-3">
              <div className="inline-flex rounded-lg border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => setNewChatTab('people')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    newChatTab === 'people'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Personas
                </button>
                <button
                  type="button"
                  onClick={() => setNewChatTab('groups')}
                  disabled={
                    !hasProfessorCapability || pickerGroups.length === 0
                  }
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    newChatTab === 'groups'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    (!hasProfessorCapability || pickerGroups.length === 0) &&
                      'cursor-not-allowed opacity-40'
                  )}
                >
                  Grupos
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <input
                value={newChatQuery}
                onChange={(e) => setNewChatQuery(e.target.value)}
                placeholder="Buscar por nombre, actividad o grupo..."
                className="mb-4 w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {newChatTab === 'people' ? (
                filteredPickerPeople.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No se encontraron personas.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredPickerPeople.map((person) => (
                      <button
                        key={person.userId}
                        type="button"
                        onClick={() => startDirectChat(person.userId)}
                        className="rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            id={person.userId}
                            name={person.label}
                            profilePhoto={person.profilePhoto}
                            photoVersion={person.updatedAt}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {person.label}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {person.subtitle}
                            </p>
                          </div>
                        </div>
                        {person.activityNames.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {person.activityNames.map((activityName) => (
                              <span
                                key={activityName}
                                className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                              >
                                {activityName}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              ) : filteredPickerGroups.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No se encontraron grupos.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredPickerGroups.map((group) => (
                    <button
                      key={group.groupId}
                      type="button"
                      onClick={() =>
                        startGroupChat(group.activityId, group.groupId)
                      }
                      className="w-full rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {group.groupName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {group.activityName}
                          </p>
                          {group.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                          {group.memberCount} miembros
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.members.slice(0, 5).map((member) => (
                          <span
                            key={member.userId}
                            className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                          >
                            {member.label}
                          </span>
                        ))}
                        {group.members.length > 5 && (
                          <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                            +{group.members.length - 5}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
