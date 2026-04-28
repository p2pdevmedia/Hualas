'use client';

import React from 'react';
import { Select as RadixSelect } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  label,
  placeholder,
  error,
  children,
  className,
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange}>
        <RadixSelect.Trigger
          className={cn('w-full', className)}
          placeholder={placeholder}
        />
        <RadixSelect.Content>{children}</RadixSelect.Content>
      </RadixSelect.Root>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export const SelectItem = RadixSelect.Item;
export const SelectGroup = RadixSelect.Group;
