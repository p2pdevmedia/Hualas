'use client';

import { useEffect, useState } from 'react';
import type { NotificationType } from '@prisma/client';

type PreferenceItem = {
  type: NotificationType;
  title: string;
  description: string;
  preference: { inApp: boolean; push: boolean };
};

type Device = {
  id: string;
  label: string;
  addedAt: string;
  failed: boolean;
};

type Props = {
  items: PreferenceItem[];
  devices: Device[];
};

export default function PreferencesForm({ items: initialItems, devices: initialDevices }: Props) {
  const [items, setItems] = useState(initialItems);
  const [devices, setDevices] = useState(initialDevices);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported',
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  async function updatePreference(
    type: NotificationType,
    field: 'inApp' | 'push',
    value: boolean,
  ) {
    const target = items.find((i) => i.type === type);
    if (!target) return;
    const next = { ...target.preference, [field]: value };
    setItems((prev) =>
      prev.map((i) => (i.type === type ? { ...i, preference: next } : i)),
    );
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, inApp: next.inApp, push: next.push }),
      });
    } catch (err) {
      console.error('[preferences] save failed', err);
    }
  }

  async function deleteDevice(id: string) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    try {
      await fetch(`/api/notifications/subscriptions/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[preferences] delete device failed', err);
    }
  }

  async function activateBrowser() {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) return;
        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as BufferSource,
          }));
        const json = sub.toJSON();
        await fetch('/api/notifications/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
            userAgent: navigator.userAgent,
          }),
        });
      }
    } catch (err) {
      console.error('[preferences] activate failed', err);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Estado del navegador actual
        </h2>
        <BrowserStateBanner permission={permission} onActivate={activateBrowser} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Tipos de notificación
        </h2>
        <div className="border rounded-md divide-y">
          {items.map((item) => (
            <div key={item.type} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={item.preference.inApp}
                    onChange={(e) => updatePreference(item.type, 'inApp', e.target.checked)}
                  />
                  En la app
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={item.preference.push}
                    onChange={(e) => updatePreference(item.type, 'push', e.target.checked)}
                  />
                  Push
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Dispositivos suscriptos
        </h2>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500 border rounded-md px-4 py-3">
            No tenés ningún dispositivo suscripto a notificaciones push.
          </p>
        ) : (
          <ul className="border rounded-md divide-y">
            {devices.map((device) => (
              <li key={device.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{device.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Agregado el {new Date(device.addedAt).toLocaleDateString('es-AR')}
                    {device.failed && ' · entrega fallida'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDevice(device.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Desactivar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BrowserStateBanner({
  permission,
  onActivate,
}: {
  permission: NotificationPermission | 'unsupported';
  onActivate: () => void;
}) {
  if (permission === 'unsupported') {
    return (
      <p className="text-sm text-gray-600 border rounded-md px-4 py-3">
        Este navegador no soporta notificaciones push.
      </p>
    );
  }
  if (permission === 'granted') {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
        Las notificaciones push están activadas en este navegador.
      </p>
    );
  }
  if (permission === 'denied') {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
        Bloqueaste las notificaciones en este navegador. Reactivalas desde la configuración del sitio.
      </p>
    );
  }
  return (
    <div className="text-sm text-gray-700 border rounded-md px-4 py-3 flex items-center justify-between gap-4">
      <span>Las notificaciones aún no están activadas en este navegador.</span>
      <button
        type="button"
        onClick={onActivate}
        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
      >
        Activar en este navegador
      </button>
    </div>
  );
}
