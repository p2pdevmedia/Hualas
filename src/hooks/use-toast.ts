import { useState, useCallback } from 'react';

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: Toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, options]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== options));
    }, 3000);
  }, []);

  return { toast, toasts };
}
