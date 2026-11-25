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
    .from('seller_verifications')
    .select('*')
    .eq('seller_id', user.id)
    .maybeSingle();

  return NextResponse.json({ verification: data ?? null }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'seller') {
    return NextResponse.json({ error: 'Only Seller accounts can request seller verification.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    businessName?: string;
    governmentIdType?: string;
    documentReference?: string;
    notes?: string;
  };

  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
  const governmentIdType = typeof body.governmentIdType === 'string' ? body.governmentIdType.trim() : 'PAN / Aadhaar';
  const documentReference = typeof body.documentReference === 'string' ? body.documentReference.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (businessName.length < 2 || documentReference.length < 4) {
    return NextResponse.json(
      { error: 'Business/legal name and document reference ID are required.' },
      { status: 400 }
    );
  }

  const { data: record, error } = await supabase
    .from('seller_verifications')
    .upsert(
      {
        seller_id: user.id,
        business_name: businessName.slice(0, 120),
        government_id_type: governmentIdType.slice(0, 60),
        document_reference: documentReference.slice(0, 120),
        notes: notes.slice(0, 500),
        status: 'identity_submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'seller_id' }
    )
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'seller_verification_submitted',
    entity_type: 'seller_verification',
    entity_id: record.id,
    metadata: { businessName, governmentIdType },
  });

  return NextResponse.json({ verification: record }, { status: 201 });
}
