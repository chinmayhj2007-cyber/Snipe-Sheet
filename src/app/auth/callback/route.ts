import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRole } from '@/lib/auth/validation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'recovery',
  'invite',
  'magiclink',
  'email_change',
  'email',
]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const oauthError = requestUrl.searchParams.get('error');
  const requestedRole = requestUrl.searchParams.get('role');

  const invalidRedirect = new URL('/login', requestUrl.origin);
  invalidRedirect.searchParams.set('notice', 'link-invalid');

  if (oauthError) {
    return NextResponse.redirect(invalidRedirect);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    const demoRedirect = new URL('/login', requestUrl.origin);
    demoRedirect.searchParams.set('notice', 'demo');
    return NextResponse.redirect(demoRedirect);
  }

  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type && ALLOWED_OTP_TYPES.has(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    verified = !error;
  }

  if (!verified) {
    return NextResponse.redirect(invalidRedirect);
  }

  // Ensure the profile row exists and respects any initial role chosen on /signup
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedRole = requestedRole
      ? normalizeRole(requestedRole)
      : normalizeRole(user.user_metadata?.role);

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email ?? '',
        role: resolvedRole,
      });
    } else if (requestedRole && existingProfile.role !== resolvedRole) {
      await supabase
        .from('profiles')
        .update({ role: resolvedRole })
        .eq('id', user.id);
    }
  }

  const dashboardRedirect = new URL('/dashboard', requestUrl.origin);
  return NextResponse.redirect(dashboardRedirect);
}
