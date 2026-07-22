import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GOAL_KEY = 'yearly_goal';

export const GET = withAuth(async (req: NextRequest) => {

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', GOAL_KEY)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ yearlyGoal: (data?.value as any)?.count ?? null });
});

export const PATCH = withAuth(async (req: NextRequest) => {

  const body = await req.json().catch(() => null);
  const count = Number(body?.yearlyGoal);
  if (!Number.isFinite(count) || count < 0) {
    return NextResponse.json({ error: 'yearlyGoal must be a non-negative number' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: GOAL_KEY, value: { count }, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ yearlyGoal: count });
});
