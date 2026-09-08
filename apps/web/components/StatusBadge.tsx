'use client';

import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/lib/status';
import type { BookStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps {
  status: BookStatus | string;
  className?: string;
  dotClassName?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, dotClassName, showDot = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-bold tracking-tight shadow-xs backdrop-blur-md',
        className,
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', config.dotColor, dotClassName)} />
      )}
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

export default StatusBadge;
