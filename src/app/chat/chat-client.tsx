'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Send } from 'lucide-react';
import { socket } from '@/lib/socket';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
};
type Message = { from: string; content: string; createdAt?: string };
type Conversation = {
  id: string;
  participants: { id: string; name: string | null }[];
  messages: Message[];
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
  size = 'md',
}: {
  id: string;
  name: string | null;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-full text-white grid place-items-center font-semibold',
        size === 'md' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs',
        avatarColor(id)
      )}
    >
      {initials(name)}
    </div>
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

  useEffect(() => {
    if (!session) return;
    socket.auth = { userId: session.user.id, role: session.user.role };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [session]);

  useEffect(() => {
    const handler = (msg: Message) => {
      const stamped = {
        ...msg,
        createdAt: msg.createdAt ?? new Date().toISOString(),
      };
      if (stamped.from === recipient) {
        setMessages((prev) => [...prev, stamped]);
      }
      setHistory((prev) => {
        const conv = prev.find((c) =>
          c.participants.some((p) => p.id === stamped.from)
        );
        if (conv) {
          return prev.map((c) =>
            c.id === conv.id ? { ...c, messages: [...c.messages, stamped] } : c
          );
        }
        return prev;
      });
    };
    socket.on('message', handler);
    return () => {
      socket.off('message', handler);
    };
  }, [recipient]);

  useEffect(() => {
    if (!recipient) {
      setMessages([]);
      return;
    }
    fetch(`/api/messages/${recipient}`)
      .then((res) => res.json())
      .then((data: Message[]) => setMessages(data));
  }, [recipient]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/messages')
      .then((res) => res.json())
      .then((data: Conversation[]) => setHistory(data));
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const contacts = useMemo(() => {
    if (!session) return [];
    const isAdmin =
      session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const selectable = isAdmin
      ? users.filter((u) => u.id !== session.user.id)
      : users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

    type Contact = {
      user: User;
      lastMessage: Message | null;
      lastAt: number;
    };

    const items: Contact[] = selectable.map((u) => {
      const conv = history.find((c) =>
        c.participants.some((p) => p.id === u.id)
      );
      const last = conv?.messages[conv.messages.length - 1] ?? null;
      const lastAt = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
      return { user: u, lastMessage: last, lastAt };
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

  const sendMessage = () => {
    if (!recipient || !session || !input.trim()) return;
    const content = input.trim();
    socket.emit('message', { to: recipient, content });
    const own: Message = {
      from: session.user.id,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, own]);
    setHistory((prev) => {
      const conv = prev.find((c) =>
        c.participants.some((p) => p.id === recipient)
      );
      if (conv) {
        return prev.map((c) =>
          c.id === conv.id ? { ...c, messages: [...c.messages, own] } : c
        );
      }
      return [
        ...prev,
        {
          id: `pending-${recipient}`,
          participants: [
            { id: session.user.id, name: session.user.name ?? null },
            { id: recipient, name: selectedUser?.name ?? null },
          ],
          messages: [own],
        },
      ];
    });
    setInput('');
  };

  return (
    <div className="mx-auto h-[calc(100vh-9rem)] max-w-6xl px-2 py-4 md:px-4">
      <div className="flex h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <aside
          className={cn(
            'w-full flex-col border-r md:flex md:w-80',
            recipient ? 'hidden' : 'flex'
          )}
        >
          <div className="border-b px-4 py-4">
            <h1 className="text-xl font-bold tracking-tight">Mensajes</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No hay contactos disponibles
              </p>
            ) : (
              contacts.map(({ user, lastMessage }) => {
                const isSelected = recipient === user.id;
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
                    <Avatar id={user.id} name={user.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-sm">
                          {user.name ?? 'Sin nombre'}
                        </span>
                        {lastMessage?.createdAt && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatPreviewTime(lastMessage.createdAt)}
                          </span>
                        )}
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
            recipient ? 'flex' : 'hidden md:flex'
          )}
        >
          {selectedUser ? (
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
                  name={selectedUser.name}
                  size="sm"
                />
                <span className="font-semibold">
                  {selectedUser.name ?? 'Sin nombre'}
                </span>
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
                Seleccioná un contacto para empezar a chatear
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
