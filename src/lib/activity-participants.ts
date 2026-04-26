export function getActivityParticipantKey(
  activityId: string,
  userId: string,
  childId: string | null | undefined
) {
  return [activityId, userId, childId ?? 'self'].join(':');
}
