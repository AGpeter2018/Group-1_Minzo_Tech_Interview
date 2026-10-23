import { NextRequest, NextResponse } from 'next/server';
import { askPlacesRagAgent } from '@/lib/groqRagAgent';

export const dynamic = 'force-dynamic';

// ─── Guardrail: In-memory rate limiter ───────────────────────────────────────
// Limits each IP to MAX_REQUESTS requests per WINDOW_MS milliseconds.
// Note: in a multi-instance deployment, use Redis instead of in-memory.

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20;  // per IP per minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) return true;

  return false;
}

// Clean up stale entries every 5 minutes to prevent memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, 5 * 60_000);
}

// ─── Shared handler ───────────────────────────────────────────────────────────

async function handleRagRequest(
  query: string,
  county: string | undefined,
  category: string | undefined,
  limit: number,
  ip: string
): Promise<NextResponse> {
  // Rate limit check
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  // Empty query guard (additional server-side check; groqRagAgent also validates)
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return NextResponse.json(
      { error: 'A query string is required (e.g. { "query": "hospital in Buchanan" })' },
      { status: 400 }
    );
  }

  const result = await askPlacesRagAgent({
    query: query.trim(),
    county,
    category,
    limit,
  });

  return NextResponse.json({ success: true, data: result });
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || body.search || '';
    const county = body.county;
    const category = body.category;
    const limit = body.limit ? Math.min(parseInt(body.limit, 10), 20) : 8;
    const ip = getClientIp(req);

    return await handleRagRequest(query, county, category, limit, ip);
  } catch (error: any) {
    console.error('[RAG] POST handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while querying the RAG agent.' },
      { status: error.message?.includes('too long') || error.message?.includes('blank') ? 400 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const county = searchParams.get('county') || undefined;
    const category = searchParams.get('category') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 8;
    const ip = getClientIp(req);

    return await handleRagRequest(query, county, category, limit, ip);
  } catch (error: any) {
    console.error('[RAG] GET handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while querying the RAG agent.' },
      { status: error.message?.includes('too long') || error.message?.includes('blank') ? 400 : 500 }
    );
  }
}
