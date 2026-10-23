import { NextRequest, NextResponse } from 'next/server';
import { supabase, getServiceSupabase } from '@/lib/supabase';
import { AppRole } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const caller = authData?.user;

    if (authErr || !caller) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    // Verify caller has admin privileges
    const service = getServiceSupabase();
    const { data: callerProfile } = await service
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    const isAdmin =
      callerProfile?.role === 'admin' || caller.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Administrator privileges required.' },
        { status: 403 }
      );
    }

    // Fetch auth users, profiles, businesses, and reviews in parallel
    const [uRes, pRes, bRes, rRes] = await Promise.all([
      service.auth.admin.listUsers(),
      service.from('profiles').select('*'),
      service.from('businesses').select('owner_id'),
      service.from('reviews').select('user_id'),
    ]);

    const users = uRes.data?.users || [];
    const profiles = pRes.data || [];
    const businesses = bRes.data || [];
    const reviews = rRes.data || [];

    const combined = users.map((u) => {
      const p = profiles.find((x) => x.id === u.id);
      const bCount = businesses.filter((b) => b.owner_id === u.id).length;
      const rCount = reviews.filter((r) => r.user_id === u.id).length;

      const meta = u.user_metadata || {};
      const resolvedName =
        p?.full_name || meta.full_name || meta.name || u.email?.split('@')[0] || 'User';

      return {
        id: u.id,
        email: u.email || 'No email',
        full_name: resolvedName,
        phone: p?.phone || meta.phone || null,
        avatar_url: p?.avatar_url || meta.avatar_url || null,
        role: (p?.role || meta.role || 'user') as AppRole,
        email_verified: Boolean(u.email_confirmed_at),
        businesses_count: bCount,
        reviews_count: rCount,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
      };
    });

    // Sort by created_at desc
    combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      data: combined,
    });
  } catch (err: unknown) {
    console.error('Error fetching admin users directory:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const caller = authData?.user;

    if (authErr || !caller) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const service = getServiceSupabase();
    const { data: callerProfile } = await service
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    const isAdmin =
      callerProfile?.role === 'admin' || caller.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Administrator privileges required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'userId and role are required' },
        { status: 400 }
      );
    }

    const validRoles: AppRole[] = ['user', 'business_owner', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // 1. Update public.profiles
    const { error: profErr } = await service
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profErr) throw profErr;

    // 2. Update user metadata in auth.users
    await service.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });

    return NextResponse.json({
      success: true,
      data: { userId, role },
    });
  } catch (err: unknown) {
    console.error('Error updating user role:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
