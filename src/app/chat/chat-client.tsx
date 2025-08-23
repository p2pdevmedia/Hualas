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

export default function ChatClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    if (!session) return;
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => {
        setUsers(data);
        const isAdmin =
          session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const selectable = isAdmin
          ? data.filter((u) => u.id !== session.user.id)
          : data.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
        if (selectable.length > 0) {
          setRecipient(selectable[0].id);
        }
      });
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
      if (msg.from === recipient) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('message', handler);
    return () => {
      socket.off('message', handler);
    };
  }, [recipient]);

  useEffect(() => {
    if (!recipient) return;
    fetch(`/api/messages/${recipient}`)
      .then((res) => res.json())
      .then((data: Message[]) => setMessages(data));
  }, [recipient]);

  const selectableUsers = session
    ? session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN'
      ? users.filter((u) => u.id !== session.user.id)
      : users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
    : [];

  const userName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? 'Unknown';

  return (
    <div className="p-4">
      <div className="mb-4">
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="border px-2 py-1"
        >
          {selectableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? 'Unnamed'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i}>
            {m.from === session?.user.id ? 'You' : userName(m.from)}:{' '}
            {m.content}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border px-2 py-1"
        />
        <Button
          onClick={() => {
            if (!recipient || !session) return;
            socket.emit('message', { to: recipient, content: input });
            setMessages((prev) => [
              ...prev,
              { from: session.user.id, content: input },
            ]);
            setInput('');
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
