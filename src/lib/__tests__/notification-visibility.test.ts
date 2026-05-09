import {
  filterNotificationsForActiveRole,
  getNotificationRequiredActiveRoles,
  isNotificationVisibleForActiveRole,
} from '../notifications/visibility';

describe('notification visibility', () => {
  it('hides professor group notifications from the member profile', () => {
    const notification = {
      type: 'PROFESSOR_GROUP_ASSIGNED' as const,
      url: '/activities/activity-1/groups/group-1',
    };

    expect(isNotificationVisibleForActiveRole(notification, 'MEMBER')).toBe(
      false
    );
    expect(isNotificationVisibleForActiveRole(notification, 'PROFESSOR')).toBe(
      true
    );
  });

  it('requires an admin or professor profile for activity group links', () => {
    const notification = {
      type: 'ACTIVITY_DAY_UPDATED' as const,
      url: '/activities/activity-1/groups/group-1',
    };

    expect(getNotificationRequiredActiveRoles(notification)).toEqual([
      'ADMIN',
      'PROFESSOR',
      'SUPER_ADMIN',
    ]);
    expect(isNotificationVisibleForActiveRole(notification, 'MEMBER')).toBe(
      false
    );
    expect(isNotificationVisibleForActiveRole(notification, 'ADMIN')).toBe(
      true
    );
  });

  it('filters accounting notifications out of non-accounting profiles', () => {
    const notifications = [
      {
        id: 'member-news',
        type: 'NEWS_CREATED' as const,
        url: '/news#post-1',
      },
      {
        id: 'accounting-movement',
        type: 'PAYMENT_MANUAL_CREATED' as const,
        url: '/accounting/movements',
      },
    ];

    expect(
      filterNotificationsForActiveRole(notifications, 'MEMBER').map(
        (notification) => notification.id
      )
    ).toEqual(['member-news']);
    expect(
      filterNotificationsForActiveRole(notifications, 'COUNTER').map(
        (notification) => notification.id
      )
    ).toEqual(['member-news', 'accounting-movement']);
  });
});
