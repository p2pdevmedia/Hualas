
import { NextApiResponse } from 'next';

import { Server } from 'socket.io';
import type { NextRequest } from 'next/server';

let io: Server | undefined;

export async function GET(req: NextRequest) {

  // @ts-ignore - Next.js doesn't type the underlying Node server
  const server = (req as any).socket?.server;

  if (server && !io) {
    io = new Server(server, {
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
