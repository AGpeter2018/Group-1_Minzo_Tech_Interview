import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

export interface RagSearchRequest {
  query: string;
  county?: string;
  category?: string;
  limit?: number;
}

export interface RagSearchResponse {
  answer: string;
  places: any[];
  query: string;
  sourceCount: number;
}

/**
 * Fallback to direct Groq REST API call if needed
 */
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
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content || 'No response generated.';
  } catch (sdkError: any) {
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
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  }
}

/**
 * Searches places/businesses from Supabase based on user query keywords
 */
async function retrievePlacesFromDatabase(query: string, county?: string, limit: number = 10): Promise<any[]> {
  try {
    let dbQuery = supabase.from('businesses').select('*');

    if (county && county.trim().toLowerCase() !== 'all') {
      dbQuery = dbQuery.ilike('county', `%${county.trim()}%`);
    }

    // Split query terms for keyword matching across name, category, town, county, street
    const cleanQuery = query.trim().replace(/[^\w\s]/gi, '');
    const terms = cleanQuery.split(/\s+/).filter(Boolean);

    if (terms.length > 0) {
      const orClauses = terms
        .map(
          (term) =>
            `name.ilike.%${term}%,category.ilike.%${term}%,town.ilike.%${term}%,county.ilike.%${term}%,street.ilike.%${term}%`
        )
        .join(',');
      dbQuery = dbQuery.or(orClauses);
    }

    const { data, error } = await dbQuery.limit(limit);

    if (!error && data && data.length > 0) {
      return data;
    }

    // Fallback: If no direct keyword match, retrieve available places to provide context
    const fallback = await supabase.from('businesses').select('*').limit(limit);
    return fallback.data || [];
  } catch (err) {
    console.warn('Error retrieving places from Supabase:', err);
    return [];
  }
}

/**
 * RAG AI Agent that answers questions from the database using Groq
 */
export async function askPlacesRagAgent({
  query,
  county,
  category,
  limit = 8,
}: RagSearchRequest): Promise<RagSearchResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables.');
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  // 1. Retrieve relevant places from the Supabase database
  const places = await retrievePlacesFromDatabase(query, county, limit);

  // 2. Format places context for the LLM
  const simplifiedPlaces = places.map((p: any) => ({
    name: p.name,
    category: p.category || 'Place / Facility',
    county: p.county,
    town: p.town,
    street: p.street,
    address: p.address,
    phones: p.phones || (p.phone ? [p.phone] : []),
    website: p.website || p.website_url,
    email: p.email || p.public_email,
    verification: p.verification_status,
    rating: p.avg_rating,
    review_count: p.review_count,
  }));

  const contextJson = JSON.stringify(simplifiedPlaces, null, 2);

  // 3. Construct system and user prompt for RAG
  const systemPrompt = `You are an intelligent, friendly AI assistant for this web application directory listing places and healthcare facilities.
Your job is to answer user search queries using ONLY the database places provided below.

Rules:
1. Always be helpful, concise, and accurate.
2. Recommend the best matching places from the database context.
3. For each recommended place, clearly state:
   - Name
   - Category
   - Location (Town, County, Street/Address)
   - Contact Info (Phone numbers, Website, Email) if available
4. If no places in the context match what the user is asking for, clearly explain that no matching places were found in the current listings and suggest the closest available ones from the context.
5. Do NOT invent or hallucinate places, phone numbers, or addresses that are not in the context.

Database Context of Places:
${contextJson}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ];

  // 4. Query Groq LLM
  const answer = await callGroqChat(messages, model, apiKey);

  return {
    answer,
    places,
    query,
    sourceCount: places.length,
  };
}

