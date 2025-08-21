import { Server } from 'socket.io';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

let io: Server | undefined;
const users = new Map<string, { socketId: string; role?: string }>();

export async function GET(req: NextRequest) {
  // @ts-ignore - Next.js doesn't type the underlying Node server
  const server = (req as any).socket?.server;

  if (server && !io) {
    io = new Server(server, {
      path: '/api/socket',
    });

    io.on('connection', (socket) => {
      const { userId, role } = socket.handshake.auth as {
        userId?: string;
        role?: string;
      };
      if (userId) {
        users.set(userId, { socketId: socket.id, role });
      }

      socket.on(
        'message',
        async ({ to, content }: { to: string; content: string }) => {
          const target = users.get(to);
          if (!target) return;
          if (role !== 'ADMIN' && target.role !== 'ADMIN') return;

          let conversation = await prisma.conversation.findFirst({
            where: {
              participants: { some: { userId: userId! } },
              AND: { participants: { some: { userId: to } } },
            },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                participants: {
                  create: [{ userId: userId! }, { userId: to }],
                },
              },
            });
          }

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: userId!,
              body: content,
            },
          });

          io?.to(target.socketId).emit('message', { from: userId, content });
        }
      );

      socket.on('disconnect', () => {
        if (userId) {
          users.delete(userId);
        }
      });
    });
  }
  return new Response('Socket initialized');
}
