'use client';

import React from 'react';
import { TextArea as RadixTextArea } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.ComponentPropsWithoutRef<typeof RadixTextArea> {
  label?: string;
  error?: string;
}

export function Textarea({
  className,
  label,
  error,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <RadixTextArea
        className={cn('w-full', className)}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
