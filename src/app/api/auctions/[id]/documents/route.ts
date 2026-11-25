import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const VALID_DOC_TYPES = new Set([
  'invoice',
  'authenticity_certificate',
  'ownership_record',
  'condition_report',
  'supporting_doc',
]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data, error } = await supabase
    .from('asset_documents')
    .select('*')
    .eq('auction_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] }, { status: 200 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (!auction) return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
  if (auction.seller_id !== user.id) {
    return NextResponse.json({ error: 'Only the listing seller can add Asset Passport records.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    docType?: string;
    title?: string;
    notes?: string;
    fileUrl?: string;
    contentDigestSource?: string;
  };

  const docType = typeof body.docType === 'string' && VALID_DOC_TYPES.has(body.docType)
    ? body.docType
    : 'supporting_doc';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const fileUrl = typeof body.fileUrl === 'string' && body.fileUrl.trim() ? body.fileUrl.trim() : null;

  if (title.length < 3) {
    return NextResponse.json({ error: 'Document title is required.' }, { status: 400 });
  }

  // Tamper-evident SHA-256 fingerprint over document metadata + content payload
  const hashInput = `${id}|${user.id}|${docType}|${title}|${notes}|${body.contentDigestSource ?? ''}|${new Date().toISOString()}`;
  const sha256Hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  const { data: created, error } = await supabase
    .from('asset_documents')
    .insert({
      auction_id: id,
      seller_id: user.id,
      doc_type: docType,
      title: title.slice(0, 140),
      file_url: fileUrl,
      sha256_hash: sha256Hash,
      verification_status: 'seller_submitted',
      notes: notes.slice(0, 1000),
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'asset_passport_added',
    entity_type: 'asset_document',
    entity_id: created.id,
    metadata: { auction_id: id, sha256_hash: sha256Hash },
  });

  return NextResponse.json({ document: created }, { status: 201 });
}
