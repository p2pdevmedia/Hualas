/**
 * @jest-environment jsdom
 */

import { enqueueMutation } from '../pending-mutations';
import { saveOrQueueProfessorMutation } from '../professor-workflow';

jest.mock('../pending-mutations', () => ({
  enqueueMutation: jest.fn(),
}));

const mockEnqueueMutation = enqueueMutation as jest.Mock;

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('saveOrQueueProfessorMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOnline(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    }) as jest.Mock;
  });

  it('queues professor workflow changes when the browser is offline', async () => {
    setOnline(false);

    await expect(
      saveOrQueueProfessorMutation({
        url: '/api/activity-days/day_1',
        method: 'PATCH',
        body: { description: 'Salida al mirador' },
        dedupeKey: 'activity-day:day_1:description',
      })
    ).resolves.toEqual({ savedLocally: true });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockEnqueueMutation).toHaveBeenCalledWith({
      url: '/api/activity-days/day_1',
      method: 'PATCH',
      body: { description: 'Salida al mirador' },
      dedupeKey: 'activity-day:day_1:description',
    });
  });

  it('falls back to the queue if connectivity drops during a save', async () => {
    (global.fetch as jest.Mock).mockImplementation(async () => {
      setOnline(false);
      throw new Error('NetworkError');
    });

    await expect(
      saveOrQueueProfessorMutation({
        url: '/api/activity-days/day_2/attendance',
        method: 'PATCH',
        body: { participantId: 'participant_1', status: 'GOING' },
        dedupeKey: 'attendance:day_2:participant_1',
      })
    ).resolves.toEqual({ savedLocally: true });

    expect(mockEnqueueMutation).toHaveBeenCalledWith({
      url: '/api/activity-days/day_2/attendance',
      method: 'PATCH',
      body: { participantId: 'participant_1', status: 'GOING' },
      dedupeKey: 'attendance:day_2:participant_1',
    });
  });

  it('surfaces server errors while online instead of queuing them', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
    });

    await expect(
      saveOrQueueProfessorMutation({
        url: '/api/activity-days/day_3/cancel',
        method: 'PATCH',
        body: { cancelled: true, cancellationReason: 'Temporal' },
        dedupeKey: 'activity-day:day_3:cancelled',
      })
    ).rejects.toThrow('Unauthorized');

    expect(mockEnqueueMutation).not.toHaveBeenCalled();
  });
});
