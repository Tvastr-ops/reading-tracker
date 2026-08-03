import type { Status } from './types';

export interface StatusConfig {
  variant: 'reading' | 'completed' | 'plan' | 'hold' | 'dropped' | 'secondary';
  dotColor: string;
  sideGradient: string;
  glowShadow: string;
  label: Status;
}

export function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Reading':
      return {
        variant: 'reading',
        dotColor: 'bg-sky-400 shadow-sky-400/50',
        sideGradient: 'from-sky-400 via-sky-500/75 to-sky-600/20',
        glowShadow: 'group-hover:shadow-sky-500/15 group-hover:border-sky-500/40',
        label: 'Reading',
      };
    case 'Completed':
      return {
        variant: 'completed',
        dotColor: 'bg-emerald-400 shadow-emerald-400/50',
        sideGradient: 'from-emerald-400 via-emerald-500/75 to-emerald-600/20',
        glowShadow: 'group-hover:shadow-emerald-500/15 group-hover:border-emerald-500/40',
        label: 'Completed',
      };
    case 'Plan to Read':
      return {
        variant: 'plan',
        dotColor: 'bg-amber-400 shadow-amber-400/50',
        sideGradient: 'from-amber-400 via-amber-500/75 to-amber-600/20',
        glowShadow: 'group-hover:shadow-amber-500/15 group-hover:border-amber-500/40',
        label: 'Plan to Read',
      };
    case 'On Hold':
      return {
        variant: 'hold',
        dotColor: 'bg-orange-400 shadow-orange-400/50',
        sideGradient: 'from-orange-400 via-orange-500/75 to-orange-600/20',
        glowShadow: 'group-hover:shadow-orange-500/15 group-hover:border-orange-500/40',
        label: 'On Hold',
      };
    case 'Dropped':
      return {
        variant: 'dropped',
        dotColor: 'bg-rose-400 shadow-rose-400/50',
        sideGradient: 'from-rose-400 via-rose-500/75 to-rose-600/20',
        glowShadow: 'group-hover:shadow-rose-500/15 group-hover:border-rose-500/40',
        label: 'Dropped',
      };
    default:
      return {
        variant: 'secondary',
        dotColor: 'bg-text-muted',
        sideGradient: 'from-text-muted/40 via-text-muted/20 to-transparent',
        glowShadow: 'group-hover:shadow-accent-color/10',
        label: status as Status,
      };
  }
}

export function getStatusBadgeVariant(status: string) {
  return getStatusConfig(status).variant;
}
