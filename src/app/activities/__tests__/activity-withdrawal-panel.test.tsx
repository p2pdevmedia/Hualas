import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ActivityWithdrawalPanel from '../[id]/activity-withdrawal-panel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const refreshMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe('ActivityWithdrawalPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    refreshMock.mockClear();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  it('sends five stars by default when the member does not change the rating', async () => {
    act(() => {
      root.render(
        <ActivityWithdrawalPanel
          activityId="activity_1"
          registrations={[{ id: 'participant_1', label: 'Participante 1' }]}
        />
      );
    });

    const clickButton = async (label: string) => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (candidate) => candidate.textContent === label
      );

      expect(button).toBeDefined();

      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    };

    await clickButton('Desinscribirme');
    await clickButton('Confirmar baja');

    const fiveStarButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Valorar con 5 estrellas"]'
    );
    expect(fiveStarButton?.className).toContain('border-primary');

    const note = container.querySelector<HTMLTextAreaElement>(
      '#withdrawal-note-participant_1'
    );
    expect(note).not.toBeNull();

    await act(async () => {
      const value =
        'Me doy de baja porque cambiaron mis horarios laborales y ya no puedo asistir normalmente.';
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(note, value);
      note!.dispatchEvent(new Event('input', { bubbles: true }));
      note!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await clickButton('Enviar baja');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/activities/activity_1/withdraw',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: 'participant_1',
          note: 'Me doy de baja porque cambiaron mis horarios laborales y ya no puedo asistir normalmente.',
          rating: 5,
        }),
      }
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});
