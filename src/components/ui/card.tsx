'use client';

import React from 'react';
import { Card as RadixCard } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

export interface CardProps extends React.ComponentPropsWithoutRef<
  typeof RadixCard
> {}

export function Card({ className, ...props }: CardProps) {
  return <RadixCard className={cn(className)} {...props} />;
}
