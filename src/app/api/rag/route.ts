import { NextRequest, NextResponse } from 'next/server';
import { askPlacesRagAgent } from '@/lib/groqRagAgent';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || body.search || '';
    const county = body.county;
    const category = body.category;
    const limit = body.limit ? parseInt(body.limit, 10) : 8;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'A query string is required in the request body (e.g. { "query": "hospital in Buchanan" })' },
        { status: 400 }
      );
    }

    const result = await askPlacesRagAgent({
      query: query.trim(),
      county,
      category,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in RAG API handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while querying the RAG agent.',
      },
      { status: 500 }
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
    const limit = limitParam ? parseInt(limitParam, 10) : 8;

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'A query parameter is required (e.g. /api/rag?query=clinic+in+Tubmanburg)' },
        { status: 400 }
      );
    }

    const result = await askPlacesRagAgent({
      query: query.trim(),
      county,
      category,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in RAG API handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while querying the RAG agent.',
      },
      { status: 500 }
    );
  }
}

