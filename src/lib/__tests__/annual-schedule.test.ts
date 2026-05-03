import { buildAnnualActivityDays } from '../activities/annual-schedule';

describe('buildAnnualActivityDays', () => {
  it('aplica los campos compartidos a todas las sesiones generadas', () => {
    const days = buildAnnualActivityDays(
      new Date('2026-05-04T00:00:00.000Z'),
      new Date('2026-05-11T00:00:00.000Z'),
      [
        {
          tempId: 'draft_1',
          weekday: 1,
          schedule: '18:00',
          groupTempId: 'group_tmp_1',
        },
      ],
      {
        description: 'Descripción general',
        geoLocation: 'Cancha principal',
        latitude: -40.157,
        longitude: -71.351,
        sportIcon: 'Escalada_v.png',
      }
    );

    expect(days).toHaveLength(2);
    expect(
      days.map((day) => ({
        tempId: day.tempId,
        groupTempId: day.groupTempId,
        description: day.description,
        geoLocation: day.geoLocation,
        latitude: day.latitude,
        longitude: day.longitude,
        sportIcon: day.sportIcon,
        date: day.date.toISOString().slice(0, 10),
      }))
    ).toEqual([
      {
        tempId: 'draft_1',
        groupTempId: 'group_tmp_1',
        description: 'Descripción general',
        geoLocation: 'Cancha principal',
        latitude: -40.157,
        longitude: -71.351,
        sportIcon: 'Escalada_v.png',
        date: '2026-05-04',
      },
      {
        tempId: 'draft_1',
        groupTempId: 'group_tmp_1',
        description: 'Descripción general',
        geoLocation: 'Cancha principal',
        latitude: -40.157,
        longitude: -71.351,
        sportIcon: 'Escalada_v.png',
        date: '2026-05-11',
      },
    ]);
  });
});
