import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  checkPassword,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
} from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';
import type { BookStatus, ProgressStructure, UnitType } from '@/lib/types';

import { validateProgressionFields } from '@/lib/validation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory sliding window rate limiter for login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }
  if (record.count >= 10) {
    return false;
  }
  record.count += 1;
  return true;
}

// ============================================================================
// 1. Auth Sub-Router
// ============================================================================
const authApp = new Hono()
  .post(
    '/login',
    zValidator(
      'json',
      z.object({
        password: z.string().min(1),
      }),
    ),
    async (c) => {
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        c.req.header('x-real-ip') ||
        'unknown-ip';

      if (!checkLoginRateLimit(ip)) {
        return c.json(
          { error: 'Too many failed attempts. Please wait 15 minutes before trying again.' },
          429,
        );
      }

      const { password } = c.req.valid('json');

      if (!checkPassword(password)) {
        return c.json({ error: 'Incorrect password' }, 401);
      }

      // Reset rate limit on success
      loginAttempts.delete(ip);

      const token = await createSessionToken();
      const isProd = process.env.NODE_ENV === 'production';

      setCookie(c, SESSION_COOKIE, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'Lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      });

      return c.json({ ok: true });
    },
  )
  .post('/logout', (c) => {
    deleteCookie(c, SESSION_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });
    return c.json({ ok: true });
  });

// ============================================================================
// 2. Books Sub-Router
// ============================================================================
const booksApp = new Hono<{
  Variables: { authType: 'cookie' | 'api_key' };
}>()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        favorite: z.string().optional(),
        shelf: z.string().optional(),
        since: z.string().optional(),
        sortField: z.string().optional(),
        sortDir: z.string().optional(),
        all: z.string().optional(),
        sync: z.string().optional(),
        trash: z.string().optional(),
      }),
    ),
    async (c) => {
      const q = c.req.valid('query');
      const includeAll = q.all === '1' || q.sync === '1';
      const showTrash = q.trash === '1';

      const pageParam = parseInt(q.page || '1', 10);
      const limitParam = parseInt(q.limit || '50', 10);
      const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 50;

      const supabase = supabaseServer();
      let query = supabase
        .from('books')
        .select(
          'id, title, type, unit_type, progress_structure, parent_progress, parent_total, latest_units, is_ongoing, author, status, rating, progress, total_units, genre_tags, source_link, cover_url, reading_pace, date_started, date_finished, notes, is_favorite, series_name, series_order, shelf_names, reread_count, deleted_at, created_at, updated_at',
          { count: 'exact' },
        );

      if (showTrash) {
        query = query.not('deleted_at', 'is', null);
      } else if (q.sync !== '1') {
        query = query.is('deleted_at', null);
      }

      if (q.since) {
        query = query.gt('updated_at', q.since);
      }

      if (q.status && q.status !== 'All') {
        query = query.eq('status', q.status as BookStatus);
      }

      if (q.favorite === '1') {
        query = query.eq('is_favorite', true);
      }

      if (q.search?.trim()) {
        const s = q.search.trim();
        query = query.or(
          `title.ilike.%${s}%,author.ilike.%${s}%,series_name.ilike.%${s}%,genre_tags.ilike.%${s}%,shelf_names.ilike.%${s}%`,
        );
      }

      const allowedSortFields = [
        'updated_at',
        'created_at',
        'title',
        'rating',
        'date_finished',
        'status',
        'progress',
        'author',
      ];
      const safeSortField = allowedSortFields.includes(q.sortField || '')
        ? q.sortField!
        : 'updated_at';
      query = query.order(safeSortField as any, { ascending: q.sortDir === 'asc' });

      if (!includeAll && q.page) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }

      const { data, count, error } = await query;
      if (error) {
        return c.json({ error: error.message }, 500);
      }

      const total = count ?? data?.length ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return c.json(
        {
          books: (data as any[]) ?? [],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        200,
        { 'Cache-Control': 'private, no-cache, must-revalidate' },
      );
    },
  )
  .post('/', zValidator('json', z.record(z.string(), z.any())), async (c) => {
    const body = c.req.valid('json');
    const supabase = supabaseServer();

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    const sanitized: any = {
      title,
      type: typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'Novel',
      status: (typeof body.status === 'string' ? body.status : 'Plan to Read') as BookStatus,
      author: typeof body.author === 'string' ? body.author.trim() || null : null,
      rating: typeof body.rating === 'number' ? body.rating : null,
      progress: typeof body.progress === 'number' ? body.progress : null,
      total_units: typeof body.total_units === 'number' ? body.total_units : null,
      unit_type: (typeof body.unit_type === 'string' ? body.unit_type : 'pages') as UnitType,
      progress_structure: (typeof body.progress_structure === 'string'
        ? body.progress_structure
        : 'single') as ProgressStructure,
      parent_progress: typeof body.parent_progress === 'number' ? body.parent_progress : null,
      parent_total: typeof body.parent_total === 'number' ? body.parent_total : null,
      latest_units: typeof body.latest_units === 'number' ? body.latest_units : null,
      is_ongoing: typeof body.is_ongoing === 'boolean' ? body.is_ongoing : false,
      genre_tags: typeof body.genre_tags === 'string' ? body.genre_tags.trim() || null : null,
      source_link: typeof body.source_link === 'string' ? body.source_link.trim() || null : null,
      cover_url: typeof body.cover_url === 'string' ? body.cover_url.trim() || null : null,
      date_started: typeof body.date_started === 'string' ? body.date_started : null,
      date_finished: typeof body.date_finished === 'string' ? body.date_finished : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      is_favorite: typeof body.is_favorite === 'boolean' ? body.is_favorite : false,
      series_name: typeof body.series_name === 'string' ? body.series_name.trim() || null : null,
      series_order: typeof body.series_order === 'number' ? body.series_order : null,
      shelf_names: typeof body.shelf_names === 'string' ? body.shelf_names.trim() || null : null,
      reread_count: typeof body.reread_count === 'number' ? body.reread_count : 0,
    };

    if (typeof body.id === 'string' && UUID_RE.test(body.id)) {
      sanitized.id = body.id;
    }

    const valError = validateProgressionFields(sanitized);
    if (valError) {
      return c.json({ error: valError }, 400);
    }

    const { data, error } = await supabase.from('books').insert(sanitized).select().single();
    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ book: data }, 201);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    if (!UUID_RE.test(id)) return c.json({ error: 'Invalid id' }, 400);

    const supabase = supabaseServer();
    const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
    if (error || !data) return c.json({ error: 'Book not found' }, 404);

    return c.json({ book: data });
  })
  .patch('/:id', zValidator('json', z.record(z.string(), z.any())), async (c) => {
    const id = c.req.param('id');
    if (!UUID_RE.test(id)) return c.json({ error: 'Invalid id' }, 400);

    const body = c.req.valid('json');
    const supabase = supabaseServer();

    const updates: any = {};
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.type === 'string') updates.type = body.type.trim();
    if (typeof body.status === 'string') updates.status = body.status;
    if (typeof body.author !== 'undefined')
      updates.author = body.author ? String(body.author).trim() : null;
    if (typeof body.rating !== 'undefined')
      updates.rating = body.rating != null ? Number(body.rating) : null;
    if (typeof body.progress !== 'undefined')
      updates.progress = body.progress != null ? Number(body.progress) : null;
    if (typeof body.total_units !== 'undefined')
      updates.total_units = body.total_units != null ? Number(body.total_units) : null;
    if (typeof body.unit_type !== 'undefined') updates.unit_type = body.unit_type;
    if (typeof body.progress_structure !== 'undefined')
      updates.progress_structure = body.progress_structure;
    if (typeof body.parent_progress !== 'undefined')
      updates.parent_progress = body.parent_progress != null ? Number(body.parent_progress) : null;
    if (typeof body.parent_total !== 'undefined')
      updates.parent_total = body.parent_total != null ? Number(body.parent_total) : null;
    if (typeof body.latest_units !== 'undefined')
      updates.latest_units = body.latest_units != null ? Number(body.latest_units) : null;
    if (typeof body.is_ongoing !== 'undefined') updates.is_ongoing = Boolean(body.is_ongoing);
    if (typeof body.genre_tags !== 'undefined')
      updates.genre_tags = body.genre_tags ? String(body.genre_tags).trim() : null;
    if (typeof body.source_link !== 'undefined')
      updates.source_link = body.source_link ? String(body.source_link).trim() : null;
    if (typeof body.cover_url !== 'undefined')
      updates.cover_url = body.cover_url ? String(body.cover_url).trim() : null;
    if (typeof body.date_started !== 'undefined') updates.date_started = body.date_started;
    if (typeof body.date_finished !== 'undefined') updates.date_finished = body.date_finished;
    if (typeof body.notes !== 'undefined') updates.notes = body.notes;
    if (typeof body.is_favorite !== 'undefined') updates.is_favorite = Boolean(body.is_favorite);
    if (typeof body.series_name !== 'undefined')
      updates.series_name = body.series_name ? String(body.series_name).trim() : null;
    if (typeof body.series_order !== 'undefined')
      updates.series_order = body.series_order != null ? Number(body.series_order) : null;
    if (typeof body.shelf_names !== 'undefined')
      updates.shelf_names = body.shelf_names ? String(body.shelf_names).trim() : null;
    if (typeof body.reread_count !== 'undefined')
      updates.reread_count = Number(body.reread_count) || 0;
    if (typeof body.deleted_at !== 'undefined') updates.deleted_at = body.deleted_at;

    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ book: data });
  })
  .delete(
    '/:id',
    zValidator(
      'query',
      z.object({
        permanent: z.string().optional(),
      }),
    ),
    async (c) => {
      const id = c.req.param('id');
      if (!UUID_RE.test(id)) return c.json({ error: 'Invalid id' }, 400);

      const q = c.req.valid('query');
      const permanent = q.permanent === '1';
      const supabase = supabaseServer();

      if (permanent) {
        const { error } = await supabase.from('books').delete().eq('id', id);
        if (error) return c.json({ error: error.message }, 500);
        return c.json({ ok: true });
      }

      const { error } = await supabase
        .from('books')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return c.json({ error: error.message }, 500);
      return c.json({ ok: true });
    },
  );

// ============================================================================
// 3. Journeys & Logs Sub-Routers
// ============================================================================
const journeysApp = new Hono<{
  Variables: { authType: 'cookie' | 'api_key' };
}>().get('/', async (c) => {
  const since = c.req.query('since');
  const bookId = c.req.query('book_id');

  const supabase = supabaseServer();
  let query = supabase
    .from('reading_journeys')
    .select('*')
    .order('updated_at', { ascending: false });

  if (since) query = query.gt('updated_at', since);
  if (bookId) query = query.eq('book_id', bookId);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ journeys: data ?? [] });
});

const logsApp = new Hono<{
  Variables: { authType: 'cookie' | 'api_key' };
}>().get('/', async (c) => {
  const limitParam = parseInt(c.req.query('limit') || '500', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 10000) : 500;
  const since = c.req.query('since');
  const bookIds = c.req
    .query('book_ids')
    ?.split(',')
    .filter((id) => UUID_RE.test(id));

  const supabase = supabaseServer();
  let query = supabase
    .from('reading_log')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (since) query = query.gt('logged_at', since);
  if (bookIds && bookIds.length > 0) query = query.in('book_id', bookIds);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ entries: data ?? [] });
});

// ============================================================================
// 4. Settings Sub-Router
// ============================================================================
const settingsApp = new Hono<{
  Variables: { authType: 'cookie' | 'api_key' };
}>()
  .get('/', async (c) => {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'user_settings')
      .single();

    const val: any = data?.value ?? {};
    return c.json({
      yearlyGoal: typeof val?.yearlyGoal === 'number' ? val.yearlyGoal : 12,
      goals: val?.goals ?? {},
      readingPace: val?.readingPace ?? 50,
    });
  })
  .patch('/', zValidator('json', z.record(z.string(), z.any())), async (c) => {
    const body = c.req.valid('json');
    const supabase = supabaseServer();

    const { data: existing } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'user_settings')
      .single();
    const currentVal = (existing?.value as any) ?? {};
    const newVal = { ...currentVal, ...body };

    const { error } = await supabase.from('app_settings').upsert({
      key: 'user_settings',
      value: newVal,
    });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ ok: true, settings: newVal });
  });

// ============================================================================
// Auth Guard Middleware for Protected Routes
// ============================================================================
async function authGuard(c: any, next: any) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token && (await verifySessionToken(token))) {
    c.set('authType', 'cookie');
    return next();
  }

  const apiKey =
    c.req.header('x-api-key') ||
    c.req.header('x-app-password') ||
    c.req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (apiKey && checkPassword(apiKey)) {
    c.set('authType', 'api_key');
    return next();
  }

  return c.json({ error: 'Unauthorized' }, 401);
}

// Chained Root App
export const app = new Hono()
  .route('/api/auth', authApp)
  .use('/api/books/*', authGuard)
  .use('/api/books', authGuard)
  .use('/api/journeys/*', authGuard)
  .use('/api/journeys', authGuard)
  .use('/api/logs/*', authGuard)
  .use('/api/logs', authGuard)
  .use('/api/settings/*', authGuard)
  .use('/api/settings', authGuard)
  .route('/api/books', booksApp)
  .route('/api/journeys', journeysApp)
  .route('/api/logs', logsApp)
  .route('/api/settings', settingsApp);

export type AppType = typeof app;
