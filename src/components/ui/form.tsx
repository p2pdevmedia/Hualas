'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const FormPendingContext = createContext(false);

export function useFormPending() {
  return useContext(FormPendingContext);
}

type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
};

export function Form({ onSubmit, children, ...props }: FormProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (!onSubmit) return;
      const result = onSubmit(e);
      if ((result as unknown) instanceof Promise) {
        setIsPending(true);
        ((result as unknown) as Promise<void>).finally(() => setIsPending(false));
      }
    },
    [onSubmit]
  );

  return (
    <FormPendingContext.Provider value={isPending}>
      <form onSubmit={onSubmit ? handleSubmit : undefined} {...props}>
        {children}
      </form>
    </FormPendingContext.Provider>
  );
}
