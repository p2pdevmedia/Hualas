'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ActivityRegisterButton({
  activityId,
}: {
  activityId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [target, setTarget] = useState('self');

  useEffect(() => {
    if (session) {
      fetch('/api/children')
        .then((res) => res.json())
        .then((data) => setChildren(data));
    }
  }, [session]);

  const handleClick = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const qs = target !== 'self' ? `?childId=${target}` : '';
    window.location.href = `/api/activities/${activityId}/checkout${qs}`;
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
      {!session ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Iniciá sesión para finalizar tu inscripción y elegir el participante.
          </p>
          <RegisterButton href="/login" label="Iniciar sesión" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="participant" className="text-sm font-semibold text-slate-700">
              ¿Quién va a participar?
            </label>
            <select
              id="participant"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="self">Para mí</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <RegisterButton onClick={handleClick} label="Continuar con el pago" />
        </>
      )}
    </div>
  );
}
