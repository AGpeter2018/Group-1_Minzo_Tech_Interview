import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

// ─── Guardrail Constants ──────────────────────────────────────────────────────

/** Maximum characters allowed in a single user message */
const MAX_QUERY_LENGTH = 500;

/** Safe list of Groq model identifiers */
const ALLOWED_MODELS = new Set([
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

/** The 15 official counties of Liberia */
const LIBERIA_COUNTIES = [
  'Bomi',
  'Bong',
  'Gbarpolu',
  'Grand Bassa',
  'Grand Cape Mount',
  'Grand Gedeh',
  'Grand Kru',
  'Lofa',
  'Margibi',
  'Maryland',
  'Montserrado',
  'Nimba',
  'River Cess',
  'River Gee',
  'Sinoe',
];

/** Stop words that should not be used as broad ilike substrings */
const STOP_WORDS = new Set([
  'which', 'what', 'where', 'when', 'who', 'how', 'why',
  'are', 'is', 'was', 'were', 'be', 'been', 'being',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then',
  'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'about', 'into', 'through',
  'top', 'best', 'good', 'rated', 'rating', 'ratings', 'most', 'popular',
  'can', 'could', 'would', 'should', 'will',
  'you', 'me', 'my', 'we', 'our', 'us',
  'tell', 'show', 'find', 'list', 'give', 'get', 'see', 'look',
  'any', 'some', 'all', 'many', 'few', 'there', 'here',
  'near', 'close', 'nearby', 'around', 'area', 'county',
  'please', 'thanks', 'thank', 'hello', 'hey', 'hi',
]);

// ─── Public Interfaces ────────────────────────────────────────────────────────

export interface RagSearchRequest {
  query: string;
  county?: string;
  category?: string;
  limit?: number;
}

export interface RagLink {
  title: string;
  url: string;
  type: 'profile' | 'website' | 'map' | 'phone';
}

export interface RagSearchResponse {
  answer: string;
  suggestions: string[];
  links: RagLink[];
  places: any[];
  query: string;
  sourceCount: number;
}

// ─── Guardrail 1: Input Validation & Sanitization ────────────────────────────

function validateQuery(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Query must be a non-empty string.');
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('Query cannot be blank.');
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new Error(
      `Query is too long (${trimmed.length} chars). Please keep it under ${MAX_QUERY_LENGTH} characters.`
    );
  }
  return trimmed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

// ─── Guardrail 2: Model Whitelist Validation ─────────────────────────────────

function validateModel(model: string): string {
  if (ALLOWED_MODELS.has(model)) return model;
  console.warn(`[RAG] Unsupported model "${model}", falling back to default.`);
  return 'openai/gpt-oss-120b';
}

// ─── Guardrail 3: Output Hallucination Scanner ───────────────────────────────

const HALLUCINATION_PATTERNS = [
  /I (don'?t|do not) have (access|information)/i,
  /as an? (AI|language model|LLM)/i,
  /I cannot (browse|access|search) the (internet|web)/i,
  /my knowledge (cutoff|was last updated)/i,
];

function sanitiseAnswer(answer: string, sourceCount: number): string {
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(answer)) {
      if (sourceCount === 0) {
        return 'I could not find any facilities in the Minzo directory matching your search. Please try searching for a specific town, county, or service.';
      }
      return 'Here are the matching healthcare facilities registered in the Minzo directory. Please review the details below.';
    }
  }
  return answer;
}

// ─── Groq LLM Caller ─────────────────────────────────────────────────────────

async function callGroqChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string,
  apiKey: string
): Promise<string> {
  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1200,
    });
    const choice = completion.choices[0]?.message;
    return choice?.content || (choice as any)?.reasoning || 'No response generated.';
  } catch (sdkError: any) {
    // REST fallback if SDK fails
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const restChoice = data.choices?.[0]?.message;
    return restChoice?.content || restChoice?.reasoning || 'No response generated.';
  }
}

// ─── Query Intent Extractor ──────────────────────────────────────────────────

function parseQueryIntent(rawQuery: string, explicitCounty?: string, explicitCategory?: string) {
  const lower = rawQuery.toLowerCase();

  // Detect County (e.g. "Bomi", "Montserrado", "Grand Bassa")
  let targetCounty: string | null = null;
  if (explicitCounty && explicitCounty.trim().toLowerCase() !== 'all') {
    targetCounty = explicitCounty.trim();
  } else {
    for (const c of LIBERIA_COUNTIES) {
      const regex = new RegExp(`\\b${c.toLowerCase()}\\b`, 'i');
      if (regex.test(lower)) {
        targetCounty = c;
        break;
      }
    }
  }

  // Detect Category (Hospital, Clinic, Pharmacy)
  let targetCategory: string | null = null;
  if (explicitCategory && explicitCategory.trim().toLowerCase() !== 'all') {
    targetCategory = explicitCategory.trim();
  } else {
    if (/\bhospitals?\b/i.test(lower)) {
      targetCategory = 'Hospital';
    } else if (/\bclinics?\b/i.test(lower)) {
      targetCategory = 'Clinic';
    } else if (/\bpharmac(y|ies)\b|\bmedicine store\b|\bdispensar(y|ies)\b/i.test(lower)) {
      targetCategory = 'Pharmacy';
    }
  }

  // Extract meaningful search terms (remove stop words, county names, and category names)
  const rawTokens = lower.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const meaningfulTerms = rawTokens.filter((t) => {
    if (t.length < 3) return false;
    if (STOP_WORDS.has(t)) return false;
    if (targetCounty && targetCounty.toLowerCase().includes(t)) return false;
    if (targetCategory && targetCategory.toLowerCase().startsWith(t.slice(0, 4))) return false;
    return true;
  });

  return { targetCounty, targetCategory, meaningfulTerms };
}

// ─── Database Multi-Table Retrieval Engine ───────────────────────────────────

/**
 * Searches across ALL tables and ALL fields in Supabase to find matching businesses:
 * - businesses (name, address, town, county, phone, email, website, slug, verification)
 * - healthcare_facility_details (facility_type, facility_level, services, services_raw, opening_hours_raw, additional_notes)
 * - categories (name, slug, description)
 * - staff (full_name, profession, specialty, cadre, town, county)
 * - reviews (comment, reviewer_name_display)
 * - business_photos (caption)
 * - business_documents (document_type, status)
 *
 * Then loads ALL fields on ALL tables for each matched business to give the LLM full grounded context.
 */
async function retrieveFullDatabaseContext(
  query: string,
  county?: string,
  category?: string,
  limit = 8
): Promise<{ places: any[]; directorySummary: any; targetCounty: string | null; targetCategory: string | null }> {
  try {
    const { targetCounty, targetCategory, meaningfulTerms } = parseQueryIntent(query, county, category);

    // Fetch directory metadata (categories, summary)
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, name, slug, description');

    const matchedBusinessIds = new Set<string>();

    // If there are meaningful extra terms (e.g. services like "emergency", "pediatrics", doctor names, town names)
    if (meaningfulTerms.length > 0) {
      // 1. Search `businesses` table
      const bizClauses = meaningfulTerms
        .map((t) => `name.ilike.%${t}%,address.ilike.%${t}%,town.ilike.%${t}%,public_email.ilike.%${t}%,phone.ilike.%${t}%,slug.ilike.%${t}%`)
        .join(',');
      let bQuery = supabase.from('businesses').select('id').eq('is_published', true).or(bizClauses);
      if (targetCounty) bQuery = bQuery.ilike('county', `%${targetCounty}%`);
      const { data: bData } = await bQuery.limit(30);
      bData?.forEach((b) => matchedBusinessIds.add(b.id));

      // 2. Search `healthcare_facility_details` table
      const hfdClauses = meaningfulTerms
        .map((t) => `services_raw.ilike.%${t}%,facility_type.ilike.%${t}%,opening_hours_raw.ilike.%${t}%,additional_notes.ilike.%${t}%,facility_level.ilike.%${t}%`)
        .join(',');
      const { data: hData } = await supabase
        .from('healthcare_facility_details')
        .select('business_id')
        .or(hfdClauses)
        .limit(30);
      hData?.forEach((h) => {
        if (h.business_id) matchedBusinessIds.add(h.business_id);
      });

      // 3. Search `staff` table
      const staffClauses = meaningfulTerms
        .map((t) => `full_name.ilike.%${t}%,profession.ilike.%${t}%,specialty.ilike.%${t}%,cadre.ilike.%${t}%,town.ilike.%${t}%`)
        .join(',');
      const { data: sData } = await supabase
        .from('staff')
        .select('business_id')
        .eq('is_published', true)
        .or(staffClauses)
        .limit(20);
      sData?.forEach((s) => {
        if (s.business_id) matchedBusinessIds.add(s.business_id);
      });

      // 4. Search `reviews` table
      const reviewClauses = meaningfulTerms
        .map((t) => `comment.ilike.%${t}%,reviewer_name_display.ilike.%${t}%`)
        .join(',');
      const { data: rData } = await supabase
        .from('reviews')
        .select('business_id')
        .eq('status', 'published')
        .or(reviewClauses)
        .limit(20);
      rData?.forEach((r) => {
        if (r.business_id) matchedBusinessIds.add(r.business_id);
      });

      // 5. Search `business_photos` (captions)
      const photoClauses = meaningfulTerms.map((t) => `caption.ilike.%${t}%`).join(',');
      const { data: pData } = await supabase
        .from('business_photos')
        .select('business_id')
        .or(photoClauses)
        .limit(10);
      pData?.forEach((p) => {
        if (p.business_id) matchedBusinessIds.add(p.business_id);
      });

      // 6. Search `business_documents`
      const docClauses = meaningfulTerms.map((t) => `document_type.ilike.%${t}%`).join(',');
      const { data: dData } = await supabase
        .from('business_documents')
        .select('business_id')
        .or(docClauses)
        .limit(10);
      dData?.forEach((d) => {
        if (d.business_id) matchedBusinessIds.add(d.business_id);
      });
    }

    // Now construct the primary business query
    let bizQuery = supabase.from('businesses').select(`
      id,
      import_key,
      name,
      slug,
      category_id,
      owner_id,
      address,
      county,
      town,
      phone,
      public_email,
      website_url,
      latitude,
      longitude,
      source,
      verification_status,
      record_status,
      is_published,
      created_at,
      updated_at,
      category:categories!inner(
        id,
        name,
        slug,
        description,
        icon,
        created_at
      )
    `).eq('is_published', true);

    // Apply target county
    if (targetCounty) {
      bizQuery = bizQuery.ilike('county', `%${targetCounty}%`);
    }

    // Apply target category
    if (targetCategory) {
      bizQuery = bizQuery.ilike('category.name', `%${targetCategory}%`);
    }

    // Apply matched IDs if specific search terms were present
    if (matchedBusinessIds.size > 0) {
      bizQuery = bizQuery.in('id', Array.from(matchedBusinessIds));
    } else if (meaningfulTerms.length > 0 && !targetCounty && !targetCategory) {
      // User searched specific keywords but 0 matches were found in any table
      return {
        places: [],
        directorySummary: {
          categories: allCategories || [],
          totalAvailable: 249,
          note: 'No facility matched the exact search keywords in any database table.',
        },
        targetCounty,
        targetCategory,
      };
    }

    bizQuery = bizQuery.limit(limit);

    const { data: businesses, error: bizError } = await bizQuery;

    if (bizError || !businesses || businesses.length === 0) {
      return {
        places: [],
        directorySummary: {
          categories: allCategories || [],
          totalAvailable: 249,
        },
        targetCounty,
        targetCategory,
      };
    }

    const ids = businesses.map((b: any) => b.id);

    // Fetch ALL fields from ALL secondary tables in parallel for the matched IDs
    const [detailsRes, staffRes, reviewsRes, photosRes, docsRes] = await Promise.all([
      supabase
        .from('healthcare_facility_details')
        .select(`
          business_id,
          facility_type,
          facility_level,
          services_raw,
          opening_hours_raw,
          services,
          opening_hours,
          emergency_services,
          ambulance_available,
          bed_count,
          registration_number,
          additional_notes,
          created_at,
          updated_at
        `)
        .in('business_id', ids),

      supabase
        .from('staff')
        .select(`
          id,
          business_id,
          full_name,
          profession,
          specialty,
          cadre,
          license_number,
          is_verified,
          years_of_experience,
          county,
          town,
          phone,
          public_email,
          is_published,
          created_at,
          updated_at
        `)
        .in('business_id', ids)
        .eq('is_published', true),

      supabase
        .from('reviews')
        .select(`
          id,
          business_id,
          user_id,
          rating,
          comment,
          is_anonymous,
          reviewer_name_display,
          status,
          created_at,
          updated_at
        `)
        .in('business_id', ids)
        .eq('status', 'published'),

      supabase
        .from('business_photos')
        .select(`
          id,
          business_id,
          storage_path,
          caption,
          is_primary,
          created_at
        `)
        .in('business_id', ids),

      supabase
        .from('business_documents')
        .select(`
          id,
          business_id,
          document_type,
          storage_path,
          status,
          created_at
        `)
        .in('business_id', ids),
    ]);

    // Build lookup maps keyed by business_id
    const detailsMap: Record<string, any> = {};
    for (const d of detailsRes.data || []) {
      detailsMap[d.business_id] = d;
    }

    const staffMap: Record<string, any[]> = {};
    for (const s of staffRes.data || []) {
      if (!staffMap[s.business_id]) staffMap[s.business_id] = [];
      staffMap[s.business_id].push(s);
    }

    const reviewsMap: Record<string, any[]> = {};
    for (const r of reviewsRes.data || []) {
      if (!reviewsMap[r.business_id]) reviewsMap[r.business_id] = [];
      reviewsMap[r.business_id].push(r);
    }

    const photosMap: Record<string, any[]> = {};
    for (const p of photosRes.data || []) {
      if (!photosMap[p.business_id]) photosMap[p.business_id] = [];
      photosMap[p.business_id].push(p);
    }

    const docsMap: Record<string, any[]> = {};
    for (const d of docsRes.data || []) {
      if (!docsMap[d.business_id]) docsMap[d.business_id] = [];
      docsMap[d.business_id].push(d);
    }

    // Merge into enriched business objects containing every single field
    const enrichedPlaces = businesses.map((b: any) => {
      const revs: any[] = reviewsMap[b.id] || [];
      const reviewCount = revs.length;
      const avgRating =
        reviewCount > 0
          ? Number(
              (
                revs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) /
                reviewCount
              ).toFixed(1)
            )
          : null;

      return {
        ...b,
        healthcare_details: detailsMap[b.id] || null,
        staff: staffMap[b.id] || [],
        reviews: revs,
        photos: photosMap[b.id] || [],
        documents: docsMap[b.id] || [],
        review_count: reviewCount,
        avg_rating: avgRating,
      };
    });

    return {
      places: enrichedPlaces,
      directorySummary: {
        categories: allCategories || [],
        totalAvailable: 249,
      },
      targetCounty,
      targetCategory,
    };
  } catch (err) {
    console.error('[RAG] retrieveFullDatabaseContext error:', err);
    return { places: [], directorySummary: null, targetCounty: null, targetCategory: null };
  }
}

// ─── Formatting & Text Cleaning Helpers ──────────────────────────────────────

/**
 * Post-processes the LLM answer to strictly guarantee clean text format:
 * - Clear, readable paragraphs of natural words
 * - Strips all asterisks (* and **)
 * - Strips all markdown symbols, bullets, hashes, tables, and raw links
 * - Keeps standard punctuation (periods, commas, hyphens, quotation marks)
 * - Extracts suggestions from text so they appear in interactive buttons
 */
function cleanToPlainParagraphs(raw: string, defaultCounty?: string): { cleanAnswer: string; suggestions: string[] } {
  if (!raw) {
    return {
      cleanAnswer: '',
      suggestions: [
        `Explore emergency facilities in ${defaultCounty || 'Liberia'}`,
        'Find pharmacies nearby',
        'Browse clinics and health centers',
      ],
    };
  }

  const suggestions: string[] = [];

  // Detect and extract any suggestions section at the bottom
  const splitMatch = raw.split(/(?:(?:💡\s*)?(?:Suggestions|Suggested\s+Searches|Follow-up\s+Questions|Follow-ups)\s*:)/i);
  let mainBody = splitMatch[0] || '';
  const suggestionsBlock = splitMatch.slice(1).join('\n');

  if (suggestionsBlock) {
    const sLines = suggestionsBlock.split('\n');
    for (const line of sLines) {
      const parts = line.includes('?') ? line.split(/(?<=\?)\s*,?\s*/) : line.split(/,\s+/);
      for (const part of parts) {
        const cleanLine = part
          .replace(/^[\s\-*•\d.)\]💡]+\s*/, '')
          .replace(/[*_~`#|]/g, '')
          .trim();
        if (cleanLine.length > 4 && !cleanLine.includes('http') && !cleanLine.includes('/facility/')) {
          suggestions.push(cleanLine);
        }
      }
    }
  }

  // Fallback suggestions if none detected in text
  if (suggestions.length === 0) {
    suggestions.push(`Explore emergency facilities in ${defaultCounty || 'Liberia'}`);
    suggestions.push('Find pharmacies nearby');
    suggestions.push('Browse clinics and health centers');
  }

  // 1. Convert markdown links [Label](url) into just Label
  let text = mainBody.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 2. Remove all asterisks, underscores, backticks, tildes, hashes, pipe table dividers
  text = text.replace(/[*_~`#|]/g, '');

  // 3. Remove bullet characters at line starts: -, *, •, digits with period
  text = text.replace(/^[\s\-*•\d.)]+\s+/gm, '');

  // 4. Remove HTML tags if any were emitted
  text = text.replace(/<[^>]+>/g, '');

  // 5. Split by blank lines to isolate genuine paragraphs
  const rawParagraphs = text.split(/\n\s*\n|\r\n\s*\r\n/);
  const cleanParagraphs: string[] = [];

  for (const p of rawParagraphs) {
    // Merge soft line breaks within a paragraph into a single continuous sentence flow
    const smoothed = p
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (smoothed.length > 0) {
      cleanParagraphs.push(smoothed);
    }
  }

  return {
    cleanAnswer: cleanParagraphs.join('\n\n'),
    suggestions: suggestions.slice(0, 4),
  };
}

function buildStructuredLinks(places: any[]): RagLink[] {
  const links: RagLink[] = [];
  for (const place of places) {
    if (place.id) {
      links.push({
        title: `View ${place.name} Profile`,
        url: `/facility/${place.id}`,
        type: 'profile',
      });
    }
    const website = place.website_url;
    if (website) {
      links.push({
        title: `${place.name} Website`,
        url: website.startsWith('http') ? website : `https://${website}`,
        type: 'website',
      });
    }
    const mapQuery = encodeURIComponent(
      `${place.name}, ${place.town || ''}, ${place.county || ''}, Liberia`
    );
    links.push({
      title: `Directions to ${place.name}`,
      url: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
      type: 'map',
    });
    if (place.phone) {
      links.push({
        title: `Call ${place.name}`,
        url: `tel:${place.phone}`,
        type: 'phone',
      });
    }
  }
  return links;
}

/**
 * Builds clean, comprehensive JSON context for the LLM prompt.
 * Exposes each field from each table explicitly.
 */
function buildContextJson(places: any[], summary: any): string {
  const formattedFacilities = places.map((p) => ({
    // Table: businesses
    business: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      import_key: p.import_key,
      address: p.address,
      town: p.town,
      county: p.county,
      phone: p.phone || null,
      public_email: p.public_email || null,
      website_url: p.website_url || null,
      latitude: p.latitude,
      longitude: p.longitude,
      verification_status: p.verification_status,
      record_status: p.record_status,
      is_published: p.is_published,
      created_at: p.created_at,
      updated_at: p.updated_at,
    },
    // Table: categories
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
          description: p.category.description,
          icon: p.category.icon,
        }
      : null,
    // Table: healthcare_facility_details
    healthcare_details: p.healthcare_details
      ? {
          business_id: p.healthcare_details.business_id,
          facility_type: p.healthcare_details.facility_type,
          facility_level: p.healthcare_details.facility_level,
          services: p.healthcare_details.services || [],
          services_raw: p.healthcare_details.services_raw || null,
          opening_hours_raw: p.healthcare_details.opening_hours_raw || null,
          opening_hours: p.healthcare_details.opening_hours || null,
          emergency_services: p.healthcare_details.emergency_services,
          ambulance_available: p.healthcare_details.ambulance_available,
          bed_count: p.healthcare_details.bed_count,
          registration_number: p.healthcare_details.registration_number,
          additional_notes: p.healthcare_details.additional_notes,
          created_at: p.healthcare_details.created_at,
          updated_at: p.healthcare_details.updated_at,
        }
      : null,
    // Table: staff
    staff: (p.staff || []).map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      profession: s.profession,
      specialty: s.specialty,
      cadre: s.cadre,
      license_number: s.license_number,
      is_verified: s.is_verified,
      years_of_experience: s.years_of_experience,
      town: s.town,
      county: s.county,
      phone: s.phone,
      public_email: s.public_email,
    })),
    // Table: reviews
    reviews: (p.reviews || []).slice(0, 5).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reviewer: r.is_anonymous ? 'Anonymous User' : (r.reviewer_name_display || 'Verified User'),
      created_at: r.created_at,
    })),
    // Table: business_photos
    photos: (p.photos || []).map((ph: any) => ({
      id: ph.id,
      caption: ph.caption,
      is_primary: ph.is_primary,
      storage_path: ph.storage_path,
    })),
    // Table: business_documents
    documents: (p.documents || []).map((doc: any) => ({
      id: doc.id,
      document_type: doc.document_type,
      status: doc.status,
    })),
    // UI Action Links pre-formatted
    links: {
      profile_url: `/facility/${p.id}`,
      website_url: p.website_url || null,
      map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${p.name}, ${p.town || ''}, ${p.county || ''}, Liberia`
      )}`,
      call_url: p.phone ? `tel:${p.phone}` : null,
    },
    computed: {
      avg_rating: p.avg_rating,
      review_count: p.review_count,
    },
  }));

  return JSON.stringify(
    {
      directory_summary: summary,
      matching_facilities: formattedFacilities,
    },
    null,
    2
  );
}

// ─── Main Exported RAG Agent ──────────────────────────────────────────────────

/**
 * RAG AI Agent — grounded 100% in the live Supabase database.
 *
 * Implemented Guardrails:
 *   1. Input length limit (500 chars max)
 *   2. Input sanitization (strips control characters, safe trimming)
 *   3. Model allowlist (only approved Groq models accepted)
 *   4. Intent-aware multi-table deep search (county, category, services, towns, staff, reviews)
 *   5. Grounding System Prompt (strict constraint: MUST answer ONLY from database context)
 *   6. Domain Boundary Guardrail (politely declines non-healthcare/general questions)
 *   7. Medical Advice Guardrail (clarifies directory role, warns on acute emergencies)
 *   8. Low temperature (0.2) + max token limit (1200)
 *   9. Output Hallucination Scanner (catches & sanitizes ungrounded boilerplate)
 *  10. Strict empty handling (no fake/random facility fallback when 0 results match)
 *  11. Clean Text Formatter (guarantees clear paragraphs with only words and standard punctuation, no asterisks)
 *  12. Only published records (is_published=true) surfaced to users
 */
export async function askPlacesRagAgent({
  query,
  county,
  category,
  limit = 8,
}: RagSearchRequest): Promise<RagSearchResponse> {
  // Guardrail 1: Validate & sanitize input
  const safeQuery = validateQuery(query);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables.');
  }

  // Guardrail 2: Model allowlist
  const rawModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const model = validateModel(rawModel);

  // Retrieve multi-table context from Supabase with intent detection
  const { places, directorySummary, targetCounty } = await retrieveFullDatabaseContext(
    safeQuery,
    county,
    category,
    limit
  );
  const contextJson = buildContextJson(places, directorySummary);

  // Grounded System Prompt with Domain Boundaries and Clean Prose Directive
  const systemPrompt = `You are "Minzo AI Concierge", the official intelligent assistant for the Minzo Healthcare Directory in Liberia.

PRIMARY PURPOSE:
Assist users in discovering, verifying, and contacting registered Liberian health facilities (Hospitals, Clinics, Pharmacies) and healthcare professionals from the Minzo database.

MANDATORY RULES & GUARDRAILS (YOU MUST FOLLOW THESE WITHOUT EXCEPTION):
1. STRICT DATABASE GROUNDING: You MUST answer ONLY using facts explicitly found in the "Database Context" section below.
2. NO HALLUCINATIONS: NEVER invent, hallucinate, or assume any facility name, phone number, address, website, doctor name, opening hours, or medical service that is not explicitly in the context.
3. DOMAIN BOUNDARY: If the user asks about unrelated topics (e.g. math, coding, politics, recipes, pop culture, non-Liberian geography), politely state that you are specifically designed to assist with Liberia's healthcare facilities and services directory, and invite them to search for a health facility.
4. MEDICAL DISCLAIMER: You provide directory and facility information, NOT personal medical diagnoses or prescription advice. If a user describes a severe medical emergency, advise them to immediately go to the nearest 24/7 hospital or call emergency services.
5. ZERO RESULTS: If "matching_facilities" in the Database Context is empty, state clearly: "I could not find any facilities matching your search in the Minzo directory. Please try searching with a different town, county, or facility name."
6. RATINGS & REVIEWS: If the user asks for "top rated" or "best" facilities and user reviews or star ratings are not yet recorded for those facilities, explain that all matching facilities listed are officially registered and licensed healthcare providers in the Minzo directory, and present their available services and operating hours.
7. NO META-AI TALK: Never say "As an AI model", "My knowledge cutoff", or "I do not have access to real-time information". You have direct access to the live Minzo database context provided below.

MANDATORY RESPONSE FORMATTING STYLE:
- Respond strictly in clear, well-written paragraphs using natural, complete sentences.
- Use ONLY clean words and standard punctuation such as periods, commas, and hyphens.
- NEVER use asterisks (*) or double asterisks (**). Do not use bold or italic markdown.
- NEVER use bullet points, list dashes (-), bullet symbols (•), numbered lists, hashes (#), or markdown tables.
- NEVER include raw markdown links like [Text](url). The user interface automatically renders dedicated interactive facility cards, direct phone call buttons, and map direction links directly below your response.
- Weave facility names, county, town, available healthcare services, and opening hours naturally into flowing prose paragraphs.
- If you have follow-up ideas, end with a final line: "Suggestions: Question one, Question two, Question three"

Database Context (Live Supabase Data):
${contextJson}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: safeQuery },
  ];

  // Guardrail 8: temperature=0.2, max_tokens=1200
  const rawAnswer = await callGroqChat(messages, model, apiKey);

  // Guardrail 9: Scan output for hallucination cues
  const checkedAnswer = sanitiseAnswer(rawAnswer, places.length);

  // Clean to plain paragraphs
  const { cleanAnswer, suggestions } = cleanToPlainParagraphs(checkedAnswer, targetCounty || county);
  const links = buildStructuredLinks(places);

  return {
    answer: cleanAnswer,
    suggestions,
    links,
    places,
    query: safeQuery,
    sourceCount: places.length,
  };
}
