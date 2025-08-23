import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Datos de prueba de Mercado Pago proporcionados
const MP_TEST_USER = {
  id: '2640628356',
  username: 'TESTUSER1967',
  password: 'O0Osdclys4',
};

// Configuramos el token de acceso utilizando el usuario de prueba
process.env.MP_ACCESS_TOKEN = MP_TEST_USER.username;

// Mock de las dependencias externas
const upsertMock = mock.fn(async () => ({}));
mock.module('next-auth', {
  getServerSession: async () => ({ user: { id: 'user-123' } }),
});
mock.module('mercadopago', {
  MercadoPagoConfig: class {},
  Payment: class {
    async get({ id }: { id: string }) {
      return { id, date_approved: new Date('2024-01-01T00:00:00Z') };
    }
  },
});
mock.module('@/lib/prisma', {
  prisma: {
    activityParticipant: {
      upsert: upsertMock,
    },
  },
});

// Importamos después de crear los mocks
const { POST } = await import('./route');

test('usuario logeado se inscribe a una actividad', async () => {
  const req = new Request('http://localhost/api/activities/act1/payment', {
    method: 'POST',
    body: JSON.stringify({ paymentId: 'pay-001' }),
  });

  const res = await POST(req, { params: { id: 'act1' } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { success: true });
  assert.equal(upsertMock.mock.calls.length, 1);
  const args = upsertMock.mock.calls[0].arguments[0];
  assert.equal(args.create.activityId, 'act1');
  assert.equal(args.create.userId, 'user-123');
  assert.equal(args.create.receipt, 'pay-001');
});
