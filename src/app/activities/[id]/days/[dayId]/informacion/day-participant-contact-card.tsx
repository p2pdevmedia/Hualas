'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X } from 'lucide-react';
import { saveOrQueueProfessorMutation } from '@/lib/offline/professor-workflow';

type ParticipantContact = {
  id: string;
  displayName: string;
  isChild: boolean;
  contactName: string;
  contactUserId: string;
  email: string | null;
  phone: string | null;
  existingReport: string | null;
};

function getWhatsAppHref(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const withCountry = digits.startsWith('54') ? digits : `54${digits}`;
  return `https://wa.me/${withCountry}`;
}

function WhatsAppLineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.2 18.8 6.1 15A7.6 7.6 0 1 1 9 17.9l-3.8.9Z" />
      <path d="M9.2 8.7c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2.1.4-.1.6l-.4.5c.5.9 1.2 1.6 2.2 2.1l.5-.5c.2-.2.4-.2.6-.1l1.4.7c.3.1.4.3.4.6v.4c0 .3-.1.5-.4.7-.4.3-1 .5-1.7.4-2.9-.4-5.1-2.6-5.5-5.4-.1-.6.1-1.2.4-1.6Z" />
    </svg>
  );
}

export default function DayParticipantContactCard({
  activityId,
  dayId,
  participant,
}: {
  activityId: string;
  dayId: string;
  participant: ParticipantContact;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState(participant.existingReport ?? '');
  const [savedBody, setSavedBody] = useState(participant.existingReport ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedLocally, setSavedLocally] = useState(false);
  const whatsappHref = getWhatsAppHref(participant.phone);

  useEffect(() => {
    const onSynced = () => setSavedLocally(false);
    window.addEventListener('hualas-mutations-synced', onSynced);
    return () =>
      window.removeEventListener('hualas-mutations-synced', onSynced);
  }, []);

  async function saveReport() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Escribí el reporte antes de guardar.');
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    setSavedLocally(false);

    try {
      const result = await saveOrQueueProfessorMutation({
        url: `/api/activities/${activityId}/days/${dayId}/reports`,
        method: 'POST',
        body: {
          activityParticipantId: participant.id,
          body: trimmed,
        },
        dedupeKey: `participant-report:${dayId}:${participant.id}`,
      });

      setSavedBody(trimmed);
      setBody(trimmed);
      if (result.savedLocally) {
        setSavedLocally(true);
        setSuccess('Reporte guardado localmente. Se enviará al reconectar.');
      } else {
        setSuccess('Reporte guardado en el historial del participante.');
      }
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el reporte.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-sm">{participant.displayName}</p>
          {participant.isChild && participant.contactName && (
            <p className="text-xs text-muted-foreground">
              Responsable: {participant.contactName}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {participant.email && (
              <a
                href={`mailto:${participant.email}`}
                className="text-xs text-link hover:underline underline-offset-4"
              >
                {participant.email}
              </a>
            )}
            {participant.phone && (
              <a
                href={`tel:${participant.phone}`}
                className="text-xs text-link hover:underline underline-offset-4"
              >
                {participant.phone}
              </a>
            )}
            {!participant.email && !participant.phone && (
              <p className="text-xs text-muted-foreground italic">
                Sin datos de contacto
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contactar por WhatsApp a ${participant.contactName || participant.displayName}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 text-emerald-700 transition-colors hover:bg-emerald-500/10"
            >
              <WhatsAppLineIcon className="h-4 w-4" />
            </a>
          ) : (
            <span
              aria-label="Sin teléfono para WhatsApp"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground opacity-40"
            >
              <WhatsAppLineIcon className="h-4 w-4" />
            </span>
          )}
          <Link
            href={`/chat?with=${participant.contactUserId}`}
            aria-label={`Chatear con ${participant.contactName || participant.displayName}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-primary transition-colors hover:bg-primary/10"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setBody(savedBody);
              setError('');
              setSuccess('');
              setSavedLocally(false);
              setIsOpen(true);
            }}
            className="inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Hacer reporte
          </button>
        </div>
      </div>

      {savedBody && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Ya hay un reporte guardado para este día. Podés abrirlo para editarlo.
        </p>
      )}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
      {savedLocally && (
        <p className="text-xs font-medium text-amber-700">
          Pendiente de sincronización.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`report-title-${participant.id}`}
        >
          <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id={`report-title-${participant.id}`}
                  className="font-heading text-lg font-semibold"
                >
                  Hacer reporte
                </p>
                <p className="text-sm text-muted-foreground">
                  {participant.displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar reporte"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label
              className="mt-4 block text-sm font-medium"
              htmlFor={`report-body-${participant.id}`}
            >
              Reporte del día
            </label>
            <textarea
              id={`report-body-${participant.id}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-2 min-h-40 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Escribí observaciones, evolución o comentarios importantes..."
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveReport}
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
