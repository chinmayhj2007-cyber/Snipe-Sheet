import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(
    {
      preferences: data ?? {
        preferred_categories: [],
        search_history: [],
        personalization_enabled: true,
        show_completed_purchases: false,
      },
    },
    { status: 200 }
  );
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    preferredCategories?: string[];
    personalizationEnabled?: boolean;
    showCompletedPurchases?: boolean;
    clearHistory?: boolean;
  };

  if (body.clearHistory) {
    await Promise.all([
      supabase.from('recently_viewed').delete().eq('user_id', user.id),
      supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          search_history: [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      ),
    ]);
    return NextResponse.json({ ok: true, cleared: true }, { status: 200 });
  }

  const updates: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (Array.isArray(body.preferredCategories)) {
    updates.preferred_categories = body.preferredCategories.slice(0, 14);
  }
  if (typeof body.personalizationEnabled === 'boolean') {
    updates.personalization_enabled = body.personalizationEnabled;
  }
  if (typeof body.showCompletedPurchases === 'boolean') {
    updates.show_completed_purchases = body.showCompletedPurchases;
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert(updates, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
