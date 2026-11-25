import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Authentication service unavailable.' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { fullName?: unknown };
  try {
    body = (await request.json()) as { fullName?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (fullName.length < 2 || fullName.length > 80) {
    return NextResponse.json(
      { error: 'Display name must be between 2 and 80 characters.' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Unable to update profile right now.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fullName }, { status: 200 });
}
