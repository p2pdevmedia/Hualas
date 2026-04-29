import Link from 'next/link';

export type ParticipantForAttendance = {
  activityParticipantId: string;
  status: 'GOING' | 'NOT_GOING' | 'PENDING';
  participantName: string;
  registeredUserId: string;
};

interface AttendanceListProps {
  label: string;
  participants: ParticipantForAttendance[];
  isExpanded: boolean;
}

export default function AttendanceList({
  label,
  participants,
  isExpanded,
}: AttendanceListProps) {
  if (!isExpanded || participants.length === 0) return null;

  return (
    <div className="mt-3 rounded-md bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
      <ul className="space-y-1">
        {participants.map((participant) => (
          <li key={participant.activityParticipantId} className="text-xs">
            <Link
              href={`/admin/users/${participant.registeredUserId}`}
              className="text-link hover:underline underline-offset-2"
            >
              {participant.participantName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
