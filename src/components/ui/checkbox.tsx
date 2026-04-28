'use client';

import React from 'react';
import { Checkbox as RadixCheckbox } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof RadixCheckbox> {
  label?: string;
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: CheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <RadixCheckbox
        id={id}
        className={cn(className)}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
