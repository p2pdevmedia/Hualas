'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface PasswordResetDialogProps {
  userId: string;
  trigger: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}

export function PasswordResetDialog({
  userId,
  trigger,
}: PasswordResetDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<Status>('idle');
  const [password, setPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function reset() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('reset failed');
      const data = await res.json();
      setPassword(data.password);
      setStatus('success');
      router.refresh();
    } catch {
      setStatus('error');
      toast({
        variant: 'destructive',
        title: 'No se pudo generar la contraseña',
        description: 'Probá de nuevo en unos segundos.',
      });
    }
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({
        variant: 'success',
        title: 'Contraseña copiada',
        description: 'Pegala en un lugar seguro antes de cerrar este diálogo.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'No se pudo copiar',
        description: 'Copiala manualmente desde el campo.',
      });
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPassword(null);
      setStatus('idle');
      setCopied(false);
    }
  }

  const triggerWithHandler = React.cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      trigger.props.onClick?.(e);
      setOpen(true);
    },
  });

  return (
    <>
      {triggerWithHandler}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Vas a generar una nueva contraseña para esta persona. La actual
              dejará de funcionar al instante.
            </DialogDescription>
          </DialogHeader>

          {status === 'idle' || status === 'error' ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
              <p className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  La nueva contraseña se muestra una sola vez. Vas a poder
                  copiarla, pero no la vamos a volver a mostrar después de
                  cerrar este diálogo.
                </span>
              </p>
            </div>
          ) : null}

          {status === 'success' && password ? (
            <div className="space-y-3">
              <div className="rounded-md border border-success/30 bg-success/10 p-4">
                <p className="eyebrow mb-2 text-success">Nueva contraseña</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">
                    {password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    aria-label="Copiar contraseña"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartila por un canal seguro. Después de cerrar, no se puede
                recuperar desde acá.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              {status === 'success' ? 'Listo' : 'Cancelar'}
            </Button>
            {status !== 'success' ? (
              <Button
                type="button"
                onClick={reset}
                disabled={status === 'loading'}
                className={cn(status === 'loading' && 'opacity-90')}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  'Generar contraseña'
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
