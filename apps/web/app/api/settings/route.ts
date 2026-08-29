import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GOAL_KEY = 'yearly_goal';

export const GET = withAuth(async (_req: NextRequest) => {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', GOAL_KEY)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const val = (data?.value as any) || {};
  const count = typeof val.count === 'number' ? val.count : null;
  const goals = typeof val.goals === 'object' && val.goals !== null ? val.goals : {};

  return NextResponse.json({
    yearlyGoal: count,
    goals: goals,
  });
});

export const PATCH = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: existingData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', GOAL_KEY)
    .maybeSingle();

  const existingVal = (existingData?.value as any) || {};
  const currentGoals: Record<string, number> =
    typeof existingVal.goals === 'object' && existingVal.goals !== null
      ? { ...existingVal.goals }
      : {};

  let updatedCount: number | null =
    typeof existingVal.count === 'number' ? existingVal.count : null;
  const currentYear = new Date().getFullYear();

  // 1. If direct yearlyGoal was passed
  if (body.yearlyGoal != null) {
    const g = Number(body.yearlyGoal);
    if (!Number.isFinite(g) || g < 0) {
      return NextResponse.json(
        { error: 'yearlyGoal must be a non-negative number' },
        { status: 400 },
      );
    }
    updatedCount = g;
    currentGoals[`${currentYear}_books`] = g;
  }

  // 2. If single year/metric/target was passed
  if (body.year != null && body.metric != null && body.target != null) {
    const y = Number(body.year);
    const m = String(body.metric).toLowerCase().trim();
    const t = Number(body.target);
    if (!Number.isFinite(y) || !Number.isFinite(t) || t < 0 || !m) {
      return NextResponse.json({ error: 'Invalid year, metric, or target' }, { status: 400 });
    }
    currentGoals[`${y}_${m}`] = t;
    if (m === 'books' && y === currentYear) {
      updatedCount = t;
    }
  }

  // 3. If batch goals map was passed
  if (body.goals && typeof body.goals === 'object') {
    for (const [k, v] of Object.entries(body.goals)) {
      const num = Number(v);
      if (Number.isFinite(num) && num >= 0) {
        currentGoals[k] = num;
        if (k === `${currentYear}_books`) {
          updatedCount = num;
        }
      }
    }
  }

  if (updatedCount == null && currentGoals[`${currentYear}_books`] != null) {
    updatedCount = currentGoals[`${currentYear}_books`];
  }

  const newValue = {
    count: updatedCount,
    goals: currentGoals,
  };

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: GOAL_KEY, value: newValue, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    yearlyGoal: updatedCount,
    goals: currentGoals,
  });
});
