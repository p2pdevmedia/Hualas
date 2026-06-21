import { buildHumanSummary } from '../audit-log-table';

describe('buildHumanSummary', () => {
  it('groups profile changes into a human-readable summary', () => {
    const summary = buildHumanSummary(
      {
        id: 'log-1',
        model: 'User',
        action: 'update',
        recordId: 'user-1',
        userId: 'admin-1',
        before: {
          name: 'Juan',
          lastName: 'Pérez',
          email: 'juan@club.com',
          phone: '1111',
        },
        after: {
          name: 'Juan',
          lastName: 'Pérez',
          email: 'juan.perez@club.com',
          phone: '2222',
        },
        args: {
          data: {
            email: 'juan.perez@club.com',
            phone: '2222',
          },
        },
        createdAt: '2026-06-21T12:00:00.000Z',
      },
      {
        logs: [],
        total: 0,
        page: 1,
        pageSize: 25,
        lookups: {
          usersById: {
            'admin-1': 'Ana Admin',
            'user-1': 'Juan Pérez',
          },
        },
      }
    );

    expect(summary).toBe(
      'Ana Admin actualizó el perfil de Juan Pérez (perfil y contacto).'
    );
  });
});
