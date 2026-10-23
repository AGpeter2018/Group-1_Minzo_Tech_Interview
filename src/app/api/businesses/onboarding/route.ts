import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getCountyCoordinates } from '@/lib/location';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      category_id,
      phone,
      public_email,
      address,
      country = 'Liberia',
      city,
      county,
      town,
      website_url,
      description,
      owner_id,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business name is required.' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: 'Business category is required.' },
        { status: 400 }
      );
    }

    const effectiveCounty = (county || city || 'Liberia').trim();
    const effectiveTown = (town || address || effectiveCounty).trim();
    const coords = getCountyCoordinates(effectiveCounty);

    const service = getServiceSupabase();

    // 1. Check if facility already exists for this owner_id
    let businessId: string | null = null;
    let existingBusiness = null;

    if (owner_id) {
      const { data: found } = await service
        .from('businesses')
        .select('id, name')
        .eq('owner_id', owner_id)
        .maybeSingle();

      existingBusiness = found;
    }

    if (existingBusiness) {
      businessId = existingBusiness.id;

      const { error: updateError } = await service
        .from('businesses')
        .update({
          name: name.trim(),
          category_id,
          address: (address || '').trim(),
          county: effectiveCounty,
          town: effectiveTown,
          phone: (phone || '').trim(),
          public_email: (public_email || '').trim(),
          website_url: website_url ? website_url.trim() : null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          verification_status: 'pending',
          record_status: 'pending',
        })
        .eq('id', businessId);

      if (updateError) {
        console.error('Update business error:', updateError);
        throw updateError;
      }
    } else {
      // Generate slug
      const slug =
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Math.random().toString(36).substring(2, 6);

      const { data: inserted, error: insertError } = await service
        .from('businesses')
        .insert({
          name: name.trim(),
          slug,
          category_id,
          owner_id: owner_id || null,
          address: (address || '').trim(),
          county: effectiveCounty,
          town: effectiveTown,
          phone: (phone || '').trim(),
          public_email: (public_email || '').trim(),
          website_url: website_url ? website_url.trim() : null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          source: 'business_registration',
          verification_status: 'pending',
          record_status: 'pending',
          is_published: false,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert business error:', insertError);
        throw insertError;
      }

      businessId = inserted?.id || null;
    }

    // 2. Ensure profile role is business_owner if owner_id provided
    if (owner_id) {
      try {
        await service.from('profiles').upsert(
          {
            id: owner_id,
            role: 'business_owner',
            phone: (phone || '').trim(),
          },
          { onConflict: 'id' }
        );
      } catch (profErr) {
        console.warn('Profile role update notice:', profErr);
      }
    }

    // 3. Store facility details / description if provided
    if (businessId && description && typeof description === 'string' && description.trim()) {
      try {
        await service.from('healthcare_facility_details').upsert(
          {
            business_id: businessId,
            additional_notes: description.trim(),
          },
          { onConflict: 'business_id' }
        );
      } catch (detailErr) {
        console.warn('Facility details upsert notice:', detailErr);
      }
    }

    return NextResponse.json({
      success: true,
      business_id: businessId,
      message: 'Business listing submitted for verification successfully.',
    });
  } catch (error: unknown) {
    console.error('Onboarding API unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit business listing.',
      },
      { status: 500 }
    );
  }
}

