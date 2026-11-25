import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const [{ data: notifications }, { data: prefs }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json(
    {
      notifications: notifications ?? [],
      preferences: prefs ?? {
        in_app_bids: true,
        in_app_outbid: true,
        in_app_ending_soon: true,
        email_enabled: false,
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
    action?: 'mark_read' | 'mark_all_read' | 'update_prefs';
    notificationId?: string;
    preferences?: {
      in_app_bids?: boolean;
      in_app_outbid?: boolean;
      in_app_ending_soon?: boolean;
      email_enabled?: boolean;
    };
  };

  if (body.action === 'mark_all_read') {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (body.action === 'mark_read' && body.notificationId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.notificationId)
      .eq('user_id', user.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (body.action === 'update_prefs' && body.preferences) {
    await supabase.from('notification_preferences').upsert(
      {
        user_id: user.id,
        in_app_bids: Boolean(body.preferences.in_app_bids ?? true),
        in_app_outbid: Boolean(body.preferences.in_app_outbid ?? true),
        in_app_ending_soon: Boolean(body.preferences.in_app_ending_soon ?? true),
        email_enabled: Boolean(body.preferences.email_enabled ?? false),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid notification action.' }, { status: 400 });
}
