'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';

export default function CartStatus() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
        if (!raw) {
          setCount(0);
          return;
        }

        const items = JSON.parse(raw) as ActivityCartItem[];
        setCount(items.length);
      } catch {
        setCount(0);
      }
    };

    updateCount();

    const handleFocus = () => updateCount();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_CART_STORAGE_KEY) {
        updateCount();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Carrito</h2>
        <p className="text-sm text-muted-foreground">
          Actividades pendientes para pagar.
        </p>
        {count > 0 && (
          <p className="mt-2 inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            Tenés {count} {count === 1 ? 'actividad pendiente' : 'actividades pendientes'} en el carrito.
          </p>
        )}
      </div>
      <Link
        href="/activities/cart"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
      >
        Ver carrito
        {count > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
