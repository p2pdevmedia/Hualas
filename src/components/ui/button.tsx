'use client';

import React from 'react';
import { Button as RadixButton } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ComponentPropsWithoutRef<
  typeof RadixButton
> {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  size?: '1' | '2' | '3' | '4';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'solid',
  size = '2',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <RadixButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? '...' : children}
    </RadixButton>
  );
}
