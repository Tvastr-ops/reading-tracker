import type { Status } from './types';

export interface StatusConfig {
  variant: 'reading' | 'completed' | 'plan' | 'hold' | 'dropped' | 'secondary';
  dotColor: string;
  label: Status;
}

export function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Reading':
      return {
        variant: 'reading',
        dotColor: 'bg-sky-400 shadow-sky-400/50',
        label: 'Reading',
      };
    case 'Completed':
      return {
        variant: 'completed',
        dotColor: 'bg-emerald-400 shadow-emerald-400/50',
        label: 'Completed',
      };
    case 'Plan to Read':
      return {
        variant: 'plan',
        dotColor: 'bg-amber-400 shadow-amber-400/50',
        label: 'Plan to Read',
      };
    case 'On Hold':
      return {
        variant: 'hold',
        dotColor: 'bg-orange-400 shadow-orange-400/50',
        label: 'On Hold',
      };
    case 'Dropped':
      return {
        variant: 'dropped',
        dotColor: 'bg-rose-400 shadow-rose-400/50',
        label: 'Dropped',
      };
    default:
      return {
        variant: 'secondary',
        dotColor: 'bg-text-muted',
        label: status as Status,
      };
  }
}

export function getStatusBadgeVariant(status: string) {
  return getStatusConfig(status).variant;
}
