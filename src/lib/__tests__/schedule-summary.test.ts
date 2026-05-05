import { summarizeActivitySchedules } from '../activities/schedule-summary';

describe('summarizeActivitySchedules', () => {
  it('agrupa sesiones anuales repetidas por día semanal y horario', () => {
    const summaries = summarizeActivitySchedules('ANNUAL', [
      {
        id: 'thu-1',
        date: new Date('2026-01-01T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
      {
        id: 'tue-1',
        date: new Date('2026-01-06T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
      {
        id: 'thu-2',
        date: new Date('2026-01-08T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
      {
        id: 'tue-2',
        date: new Date('2026-01-13T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({
        id: 'tue-1',
        weekday: 2,
        schedule: '17.30 a 18.30',
        repeatsWeekly: true,
      }),
      expect.objectContaining({
        id: 'thu-1',
        weekday: 4,
        schedule: '17.30 a 18.30',
        repeatsWeekly: true,
      }),
    ]);
  });

  it('mantiene cada sesión para actividades temporarias', () => {
    const summaries = summarizeActivitySchedules('TEMPORARY', [
      {
        id: 'session-1',
        date: new Date('2026-01-01T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
      {
        id: 'session-2',
        date: new Date('2026-01-08T12:00:00.000Z'),
        schedule: '17.30 a 18.30',
        cancelled: false,
      },
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.repeatsWeekly)).toEqual([
      false,
      false,
    ]);
  });
});
