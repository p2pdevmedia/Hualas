import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, onChange, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onChange={(e) => {
        onValueChange?.(e.target.value);
        onChange?.(e);
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const SelectTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative', className)} {...props} />
  )
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
SelectContent.displayName = 'SelectContent';

export const SelectItem = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => <option value={value}>{children}</option>;
SelectItem.displayName = 'SelectItem';

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <>{placeholder}</>
);
SelectValue.displayName = 'SelectValue';
