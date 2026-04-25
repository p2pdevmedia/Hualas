'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';

type User = {
  id: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
};
type Message = { from: string; content: string };
type Conversation = {
  id: string;
  participants: { id: string; name: string | null }[];
  messages: Message[];
};

export default function ChatClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState('');

  const inputClass =
    'rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  useEffect(() => {
    if (!session) return;
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => {
        setUsers(data);
        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const selectable = isAdmin
          ? data.filter((u) => u.id !== session.user.id)
          : data.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
        if (selectable.length > 0) setRecipient(selectable[0].id);
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    socket.auth = { userId: session.user.id, role: session.user.role };
    socket.connect();
    return () => { socket.disconnect(); };
  }, [session]);

  useEffect(() => {
    const handler = (msg: Message) => {
      if (msg.from === recipient) setMessages((prev) => [...prev, msg]);
      setHistory((prev) =>
        prev.map((c) =>
          c.participants.some((p) => p.id === msg.from)
            ? { ...c, messages: [...c.messages, msg] }
            : c
        )
      );
    };
    socket.on('message', handler);
    return () => { socket.off('message', handler); };
  }, [recipient]);

  useEffect(() => {
    if (!recipient) return;
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

  const selectableUsers = session
    ? session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'
      ? users.filter((u) => u.id !== session.user.id)
      : users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
    : [];

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Unknown';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>

      {history.length > 0 && (
        <div className="space-y-3">
          {history.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <p className="font-semibold text-sm">
                {c.participants.filter((p) => p.id !== session?.user.id).map((p) => p.name ?? 'Sin nombre').join(', ')}
              </p>
              <div className="space-y-1">
                {c.messages.map((m, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {m.from === session?.user.id ? 'Vos' : c.participants.find((p) => p.id === m.from)?.name ?? 'Unknown'}
                    </span>
                    : {m.content}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className={`w-full ${inputClass}`}
        >
          {selectableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? 'Sin nombre'}</option>
          ))}
        </select>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {messages.map((m, i) => (
            <p key={i} className="text-sm">
              <span className="font-medium">{m.from === session?.user.id ? 'Vos' : userName(m.from)}</span>: {m.content}
            </p>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribir mensaje..."
            className={`flex-1 ${inputClass}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!recipient || !session || !input.trim()) return;
                socket.emit('message', { to: recipient, content: input });
                setMessages((prev) => [...prev, { from: session.user.id, content: input }]);
                setInput('');
              }
            }}
          />
          <Button
            onClick={() => {
              if (!recipient || !session || !input.trim()) return;
              socket.emit('message', { to: recipient, content: input });
              setMessages((prev) => [...prev, { from: session.user.id, content: input }]);
              setInput('');
            }}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
