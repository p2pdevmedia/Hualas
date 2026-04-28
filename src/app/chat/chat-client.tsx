'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Send } from 'lucide-react';
import {
  Box,
  Flex,
  Container,
  Text,
  Button as RadixButton,
} from '@radix-ui/themes';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const POLL_THREAD_MS = 3000;
const POLL_HISTORY_MS = 8000;

type User = {
  id: string;
  name: string | null;
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
        'shrink-0 overflow-hidden rounded-full text-white grid place-items-center font-semibold',
        size === 'md' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs',
        avatarColor(id)
      )}
    >
      {src ? (
        <img
          src={src}
          alt={`Foto de perfil de ${name ?? 'usuario'}`}
          className="h-full w-full object-cover"
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
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => setUsers(data));
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const contacts = useMemo(() => {
    if (!session) return [];
    const isAdmin =
      session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isCounter = session.user.role === 'COUNTER';
    const selectable = isAdmin
      ? users.filter((u) => u.id !== session.user.id)
      : isCounter
        ? users.filter((u) => u.id !== session.user.id)
        : users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

    type Contact = {
      user: User;
      lastMessage: Message | null;
      lastAt: number;
      unreadCount: number;
    };

    const items: Contact[] = selectable.map((u) => {
      const conv = history.find((c) =>
        c.participants.some((p) => p.id === u.id)
      );
      const last = conv?.messages[conv.messages.length - 1] ?? null;
      const lastAt = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
      return {
        user: u,
        lastMessage: last,
        lastAt,
        unreadCount: conv?.unreadCount ?? 0,
      };
    });

    items.sort((a, b) => {
      if (a.lastAt && b.lastAt) return b.lastAt - a.lastAt;
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return (a.user.name ?? '').localeCompare(b.user.name ?? '');
    });

    return items;
  }, [users, history, session]);

  const selectedUser = users.find((u) => u.id === recipient) ?? null;

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

  return (
    <Container size="4" px={{ initial: '2', md: '4' }} py="4">
      <Box className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-xl border bg-card shadow-sm">
        <Box
          asChild
          className={cn(
            'w-full flex-col border-r md:flex md:w-80',
            recipient ? 'hidden' : 'flex'
          )}
        >
          <aside>
            <Box className="border-b px-4 py-4">
              <Text size="6" weight="bold" className="tracking-tight">
                Mensajes
              </Text>
            </Box>
            <Box className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <Box p="4">
                  <Text size="2" color="gray">
                    No hay contactos disponibles
                  </Text>
                </Box>
              ) : (
                contacts.map(({ user, lastMessage, unreadCount }) => {
                  const isSelected = recipient === user.id;
                  const hasUnread = unreadCount > 0;
                  const previewSender =
                    lastMessage && lastMessage.from === session?.user.id
                      ? 'Vos: '
                      : '';
                  return (
                    <Box
                      asChild
                      key={user.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer',
                        isSelected && 'bg-muted'
                      )}
                    >
                      <button onClick={() => setRecipient(user.id)}>
                        <Avatar
                          id={user.id}
                          name={user.name}
                          profilePhoto={user.profilePhoto}
                          photoVersion={user.updatedAt}
                        />
                        <Box className="min-w-0 flex-1">
                          <Flex justify="between" align="center" gap="2">
                            <Text size="2" weight="medium" className="truncate">
                              {user.name ?? 'Sin nombre'}
                            </Text>
                            <Flex align="center" gap="2" className="shrink-0">
                              {hasUnread && <UnreadIndicator />}
                              {lastMessage?.createdAt && (
                                <Text
                                  size="1"
                                  color="gray"
                                  className="shrink-0"
                                >
                                  {formatPreviewTime(lastMessage.createdAt)}
                                </Text>
                              )}
                            </Flex>
                          </Flex>
                          <Text size="1" color="gray" className="truncate">
                            {lastMessage
                              ? `${previewSender}${lastMessage.content}`
                              : 'Iniciar conversación'}
                          </Text>
                        </Box>
                      </button>
                    </Box>
                  );
                })
              )}
            </Box>
          </aside>
        </Box>

        <Box
          asChild
          className={cn(
            'flex-1 flex-col',
            recipient ? 'flex' : 'hidden md:flex'
          )}
        >
          <section>
            {selectedUser ? (
              <>
                <Flex align="center" gap="3" className="border-b px-4 py-3">
                  <Box
                    asChild
                    className="rounded-md p-1 hover:bg-muted md:hidden cursor-pointer"
                  >
                    <button
                      onClick={() => setRecipient('')}
                      aria-label="Volver"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </Box>
                  <Avatar
                    id={selectedUser.id}
                    name={selectedUser.name}
                    profilePhoto={selectedUser.profilePhoto}
                    photoVersion={selectedUser.updatedAt}
                    size="sm"
                  />
                  <Text weight="medium">
                    {selectedUser.name ?? 'Sin nombre'}
                  </Text>
                </Flex>

                <Box className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {messages.length === 0 ? (
                    <Box className="text-center py-8">
                      <Text size="2" color="gray">
                        Empezá la conversación enviando un mensaje
                      </Text>
                    </Box>
                  ) : (
                    messages.map((m, i) => {
                      const isOwn = m.from === session?.user.id;
                      return (
                        <Flex key={i} justify={isOwn ? 'end' : 'start'}>
                          <Box
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words',
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            )}
                          >
                            <Text size="2">{m.content}</Text>
                          </Box>
                        </Flex>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                <Box className="border-t p-3">
                  <Flex gap="2" align="center">
                    <Box className="flex-1">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribir mensaje..."
                        className="flex-1 rounded-full border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                    </Box>
                    <Box
                      asChild
                      className="rounded-full bg-primary p-2.5 text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
                    >
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        aria-label="Enviar"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </Box>
                  </Flex>
                </Box>
              </>
            ) : (
              <Box className="flex-1 flex items-center justify-center px-6 text-center">
                <Text size="2" color="gray">
                  Seleccioná un contacto para empezar a chatear
                </Text>
              </Box>
            )}
          </section>
        </Box>
      </Box>
    </Container>
  );
}
