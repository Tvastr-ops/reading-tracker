'use client';

import { Check } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only"
        {...props}
      />
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-sm border-2 border-border bg-surface transition-all',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-text-muted',
          disabled ? 'cursor-not-allowed opacity-50' : '',
          className,
        )}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </span>
    </label>
  );
}
