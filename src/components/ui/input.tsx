'use client';

import React from 'react';
import { TextField } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.ComponentPropsWithoutRef<typeof TextField.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  className,
  label,
  error,
  helperText,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <TextField.Root
        className={cn('w-full', className)}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
}
