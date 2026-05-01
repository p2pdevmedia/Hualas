'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PushPermissionModal from './push-permission-modal';

const DISMISSED_KEY = 'pushPromptDismissedAt';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  await fetch('/api/notifications/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    }),
  });
}

export default function PushManager() {
  const { status } = useSession();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(
    null,
  );
  const [supported, setSupported] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const ua = navigator.userAgent || '';
    const isIosDevice = /iPhone|iPad|iPod/.test(ua);
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsIos(isIosDevice && !standalone);

    let cancelled = false;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (cancelled) return;
        setRegistration(reg);
      })
      .catch((err) => {
        console.error('[push-manager] service worker registration failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !registration || !supported) return;
    const permission = Notification.permission;
    if (permission === 'default') {
      const dismissedAt = parseInt(
        localStorage.getItem(DISMISSED_KEY) ?? '0',
        10,
      );
      if (!dismissedAt || Date.now() - dismissedAt > SEVEN_DAYS_MS) {
        setShowModal(true);
      }
    } else if (permission === 'granted') {
      ensureSubscription(registration).catch((err) =>
        console.error('[push-manager] resubscribe failed', err),
      );
    }
  }, [status, registration, supported]);

  async function ensureSubscription(reg: ServiceWorkerRegistration): Promise<void> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error(
        '[push-manager] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing. Browser push subscriptions are disabled.',
      );
      return;
    }
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await postSubscription(existing);
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    await postSubscription(sub);
  }

  async function handleEnable() {
    setShowModal(false);
    if (!registration) return;
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await ensureSubscription(registration);
      }
    } catch (err) {
      console.error('[push-manager] permission request failed', err);
    }
  }

  function handleDismiss() {
    setShowModal(false);
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {}
  }

  if (!supported || !showModal) return null;
  return (
    <PushPermissionModal
      isIos={isIos}
      onEnable={handleEnable}
      onDismiss={handleDismiss}
    />
  );
}
