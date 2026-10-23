import { NextRequest, NextResponse } from 'next/server';
import { supabase, getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to submit a review.' },
        { status: 401 }
      );
    }

    // Verify token with Supabase auth
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const user = authData?.user;

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session. Please sign in again.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { business_id, rating, comment, is_anonymous, reviewer_name } = body;

    if (!business_id) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required.' },
        { status: 400 }
      );
    }

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    const cleanComment = typeof comment === 'string' ? comment.trim() : '';

    const service = getServiceSupabase();

    // 1. Ensure the user exists in public.profiles to satisfy foreign key constraint reviews_user_id_fkey
    const { data: existingProfile } = await service
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle();

    const userMeta = user.user_metadata || {};
    const resolvedName =
      (typeof reviewer_name === 'string' && reviewer_name.trim()) ||
      existingProfile?.full_name ||
      userMeta.full_name ||
      user.email?.split('@')[0] ||
      'Verified Patient';

    if (!existingProfile) {
      // Auto-provision missing profile row
      await service.from('profiles').insert({
        id: user.id,
        full_name: resolvedName,
        phone: userMeta.phone || null,
        role: userMeta.role || 'user',
      });
    } else if (reviewer_name && reviewer_name.trim() && reviewer_name.trim() !== existingProfile.full_name) {
      // Update custom name if specified
      await service
        .from('profiles')
        .update({ full_name: resolvedName })
        .eq('id', user.id);
    }

    // 2. Insert the review
    const { data: newRev, error: revError } = await service
      .from('reviews')
      .insert({
        business_id,
        user_id: user.id,
        rating: numRating,
        comment: cleanComment,
        is_anonymous: Boolean(is_anonymous),
        status: 'published',
      })
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (revError) {
      console.error('Database review insert error:', revError);
      return NextResponse.json(
        { success: false, error: revError.message || 'Failed to record review.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newRev,
    });
  } catch (err: unknown) {
    console.error('Unhandled error submitting review:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
