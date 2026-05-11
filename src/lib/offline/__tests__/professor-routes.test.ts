/**
 * @jest-environment jsdom
 */

import {
  buildProfessorSessionOfflineHrefs,
  warmOfflineRoutes,
} from '../professor-routes';

describe('buildProfessorSessionOfflineHrefs', () => {
  it('builds unique workflow routes for the professor agenda', () => {
    expect(
      buildProfessorSessionOfflineHrefs([
        { activityId: 'activity_1', id: 'day_1' },
        { activityId: 'activity_1', id: 'day_1' },
        { activityId: 'activity_1', id: 'day_2' },
      ])
    ).toEqual([
      '/activities/activity_1/days/day_1',
      '/activities/activity_1/days/day_1/attendance',
      '/activities/activity_1/days/day_1/observaciones',
      '/activities/activity_1/days/day_1/descripcion',
      '/activities/activity_1/days/day_1/informacion',
      '/activities/activity_1/days/day_2',
      '/activities/activity_1/days/day_2/attendance',
      '/activities/activity_1/days/day_2/observaciones',
      '/activities/activity_1/days/day_2/descripcion',
      '/activities/activity_1/days/day_2/informacion',
    ]);
  });
});

describe('warmOfflineRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  it('fetches each route with same-origin credentials so the service worker can cache it', async () => {
    await warmOfflineRoutes(['/activities/activity_1/days/day_1']);

    expect(global.fetch).toHaveBeenCalledWith(
      '/activities/activity_1/days/day_1',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: { Accept: 'text/html' },
        method: 'GET',
      })
    );
  });

  it('does not warm routes while offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    await warmOfflineRoutes(['/activities/activity_1/days/day_1']);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
