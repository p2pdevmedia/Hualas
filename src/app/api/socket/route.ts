import { NextApiResponse } from 'next';
import { Server } from 'socket.io';
import type { NextRequest } from 'next/server';

let io: Server | undefined;

export async function GET(req: NextRequest) {
  // @ts-ignore - Next.js types don't expose socket
  const res = (req as any).socket?.server?.res as NextApiResponse | undefined;
  if (res && !io) {
    io = new Server(res.socket, {
      path: '/api/socket',
    });
    io.on('connection', (socket) => {
      socket.on('message', (message) => {
        socket.broadcast.emit('message', message);
      });
    });
  }
  return new Response('Socket initialized');
}
