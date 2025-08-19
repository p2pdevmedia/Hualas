'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.connect();
    socket.on('message', (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-4">
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
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
            socket.emit('message', input);
            setMessages((prev) => [...prev, input]);
            setInput('');
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
