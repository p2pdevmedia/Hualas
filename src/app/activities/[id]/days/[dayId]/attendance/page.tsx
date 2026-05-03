import { redirect } from 'next/navigation';

export default async function DayAttendancePage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  redirect(`/activities/${params.id}/days/${params.dayId}`);
}
