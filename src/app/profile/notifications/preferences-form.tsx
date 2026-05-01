'use client';

import { useState } from 'react';
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

export default function PreferencesForm({
  items: initialItems,
  devices: initialDevices,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [devices, setDevices] = useState(initialDevices);

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

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Tipos de notificación
        </h2>
        <div className="divide-y rounded-md border">
          {items.map((item) => (
            <div
              key={item.type}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {item.description}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
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
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Dispositivos suscriptos
        </h2>
        {devices.length === 0 ? (
          <p className="rounded-md border px-4 py-3 text-sm text-gray-500">
            No tenés ningún dispositivo suscripto a notificaciones push.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900">{device.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
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
