'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';

type User = { id: string; name: string | null; role: 'ADMIN' | 'MEMBER' };
type Message = { from: string; content: string };

export default function ChatPage() {
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
        const selectable =
          session.user.role === 'ADMIN'
            ? data.filter((u) => u.id !== session.user.id)
            : data.filter((u) => u.role === 'ADMIN');
        if (selectable.length > 0) {
          setRecipient(selectable[0].id);
        }
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    socket.auth = { userId: session.user.id, role: session.user.role };
    socket.connect();
    socket.on('message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off('message');
      socket.disconnect();
    };
  }, [session]);

  const selectableUsers = session
    ? session.user.role === 'ADMIN'
      ? users.filter((u) => u.id !== session.user.id)
      : users.filter((u) => u.role === 'ADMIN')
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
