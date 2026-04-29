"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface PickupNotice {
  id: string;
  childId: string;
  child: {
    id: string;
    name: string;
    user: {
      id: string;
      name: string;
    };
  };
  alternatePersonUserId: string | null;
  alternatePersonName: string | null;
  alternatePersonUser?: {
    id: string;
    name: string;
  } | null;
  description: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  acknowledgments: Array<{
    id: string;
    acknowledgedBy: {
      id: string;
      name: string;
    };
    notes: string | null;
    confirmedAt: string;
  }>;
}

interface ProfessorListProps {
  notices: PickupNotice[];
  activityDayId: string;
  currentUserId: string;
}

export function ProfessorPickupNoticeList({
  notices,
  activityDayId,
  currentUserId,
}: ProfessorListProps) {
  const { toast } = useToast();
  const [confirmingNoticeId, setConfirmingNoticeId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (noticeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/pickup-notices/${noticeId}/acknowledgments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes || null }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm");
      }

      toast({
        title: "Confirmed",
        description: "Pickup notice confirmed",
      });

      setConfirmingNoticeId(null);
      setNotes("");
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to confirm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (notices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No pickup notices for this day
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notices.map((notice) => {
        const currentUserAck = notice.acknowledgments.find(
          (ack) => ack.acknowledgedBy.id === currentUserId
        );
        const isConfirming = confirmingNoticeId === notice.id;

        return (
          <div
            key={notice.id}
            className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">
                  {notice.child.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Parent: {notice.createdBy.name}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(notice.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm font-medium mb-1">Pickup Person:</p>
              <p className="font-semibold">
                {notice.alternatePersonUser?.name ||
                  notice.alternatePersonName ||
                  "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Description:</p>
              <p className="text-sm text-gray-700">{notice.description}</p>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Confirmations:</p>
              {notice.acknowledgments.length === 0 ? (
                <p className="text-xs text-gray-500">No confirmations yet</p>
              ) : (
                <ul className="space-y-2">
                  {notice.acknowledgments.map((ack) => (
                    <li key={ack.id} className="bg-green-50 p-2 rounded text-sm">
                      <p className="font-medium">{ack.acknowledgedBy.name}</p>
                      {ack.notes && (
                        <p className="text-gray-700">{ack.notes}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(ack.confirmedAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!currentUserAck && (
              <div>
                {isConfirming ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add optional notes (e.g., 'Anotado en lista de asistencia')"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="px-3 py-1 text-xs"
                        onClick={() => handleConfirm(notice.id)}
                        disabled={loading}
                      >
                        {loading ? "Confirming..." : "Confirm Receipt"}
                      </Button>
                      <Button
                        className="px-3 py-1 text-xs"
                        variant="outline"
                        onClick={() => {
                          setConfirmingNoticeId(null);
                          setNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="px-3 py-1 text-xs"
                    onClick={() => setConfirmingNoticeId(notice.id)}
                  >
                    Confirm Receipt
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
