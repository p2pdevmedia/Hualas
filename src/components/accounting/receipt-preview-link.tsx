'use client';

import { useId, useState } from 'react';
import { ExternalLink, ReceiptText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  href?: string | null;
  title: string;
};

export default function ReceiptPreviewLink({ label, href, title }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  if (!href) {
    return <span className="text-muted-foreground">{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-link hover:underline"
      >
        <ReceiptText className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full p-0"
                onClick={() => setOpen(false)}
                aria-label="Cerrar comprobante"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-[60vh] flex-1 bg-muted/20">
              <iframe
                src={href}
                title={title}
                className="h-[70vh] w-full border-0"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3">
              <Button asChild variant="outline">
                <a href={href} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir en pestaña
                </a>
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
