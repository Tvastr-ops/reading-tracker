import { hc } from 'hono/client';
import type { AppType } from '@/lib/server/app';

export const client = hc<AppType>('/');
