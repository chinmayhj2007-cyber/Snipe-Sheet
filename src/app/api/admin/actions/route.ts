import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Administrator role required.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'review_verification') {
    const sellerId = String(body.sellerId ?? '');
    const status = body.status === 'verified' ? 'verified' : body.status === 'rejected' ? 'rejected' : 'restricted';
    const reviewNotes = String(body.reviewNotes ?? '').trim().slice(0, 500);

    await Promise.all([
      supabase
        .from('seller_verifications')
        .update({
          status,
          reviewed_by: user.id,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('seller_id', sellerId),
      supabase
        .from('profiles')
        .update({
          verification_status: status === 'verified' ? 'verified' : status === 'restricted' ? 'restricted' : 'unverified',
          trust_score: status === 'verified' ? 88 : status === 'restricted' ? 20 : 50,
        })
        .eq('id', sellerId),
      supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'system',
        title: status === 'verified' ? 'Seller Account Verified' : 'Verification Update',
        message:
          status === 'verified'
            ? 'Your SnipeShield Verified Seller badge is now active.'
            : `Seller verification status updated to ${status}. ${reviewNotes}`,
        link: '/profile',
      }),
    ]);

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: `admin_verification_${status}`,
      entity_type: 'seller_verification',
      entity_id: sellerId,
      metadata: { reviewNotes },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === 'review_fraud_alert') {
    const alertId = String(body.alertId ?? '');
    const status = String(body.status ?? 'investigating');
    const notes = String(body.resolutionNotes ?? '').trim().slice(0, 500);
    const targetUserId = body.targetUserId ? String(body.targetUserId) : null;
    const suspendUser = Boolean(body.suspendUser);

    await supabase
      .from('fraud_alerts')
      .update({
        status,
        reviewed_by: user.id,
        resolution_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (suspendUser && targetUserId) {
      await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspended_reason: notes || 'Suspended after ShieldGuard investigation.',
          verification_status: 'restricted',
        })
        .eq('id', targetUserId);
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: `admin_fraud_${status}`,
      entity_type: 'fraud_alert',
      entity_id: alertId,
      metadata: { suspendUser, targetUserId, notes },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === 'toggle_suspension') {
    const targetUserId = String(body.targetUserId ?? '');
    const suspend = Boolean(body.suspend);
    const reason = String(body.reason ?? '').trim().slice(0, 300);

    await supabase
      .from('profiles')
      .update({
        is_suspended: suspend,
        suspended_reason: suspend ? reason || 'Administrative suspension' : null,
      })
      .eq('id', targetUserId);

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: suspend ? 'admin_user_suspended' : 'admin_user_unsuspended',
      entity_type: 'profile',
      entity_id: targetUserId,
      metadata: { reason },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === 'moderate_auction') {
    const auctionId = String(body.auctionId ?? '');
    const moderationStatus = ['approved', 'flagged', 'removed'].includes(
      String(body.moderationStatus)
    )
      ? String(body.moderationStatus)
      : 'flagged';
    const reason = String(body.reason ?? '').trim().slice(0, 400);

    await supabase
      .from('auctions')
      .update({
        moderation_status: moderationStatus,
        moderation_reason: reason || null,
        status: moderationStatus === 'removed' ? 'cancelled' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionId);

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: `admin_moderate_auction_${moderationStatus}`,
      entity_type: 'auction',
      entity_id: auctionId,
      metadata: { reason },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === 'resolve_dispute') {
    const disputeId = String(body.disputeId ?? '');
    const orderId = String(body.orderId ?? '');
    const status = ['under_review', 'resolved_refund', 'resolved_release', 'rejected'].includes(
      String(body.status)
    )
      ? String(body.status)
      : 'under_review';
    const resolution = String(body.resolution ?? '').trim().slice(0, 500);

    await supabase
      .from('disputes')
      .update({
        status,
        resolution,
        resolved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (orderId && (status === 'resolved_refund' || status === 'resolved_release')) {
      await supabase
        .from('orders')
        .update({
          status: status === 'resolved_refund' ? 'refunded' : 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: `admin_dispute_${status}`,
      entity_type: 'dispute',
      entity_id: disputeId,
      metadata: { orderId, resolution },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === 'update_platform_settings') {
    const value = body.settings;
    if (!value || typeof value !== 'object') {
      return NextResponse.json({ error: 'Settings payload required.' }, { status: 400 });
    }

    await supabase.from('platform_settings').upsert(
      {
        key: 'anti_sniping',
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'admin_settings_updated',
      entity_type: 'platform_settings',
      entity_id: 'anti_sniping',
      metadata: value as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Unknown admin action.' }, { status: 400 });
}
