import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

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
      temperature: 0.3,
      max_tokens: 1200,
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
        temperature: 0.3,
        max_tokens: 1200,
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
async function retrievePlacesFromDatabase(query: string, county?: string, limit: number = 8): Promise<any[]> {
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
            `name.ilike.%${term}%,category.ilike.%${term}%,town.ilike.%${term}%,county.ilike.%${term}%,street.ilike.%${term}%,description.ilike.%${term}%`
        )
        .join(',');
      dbQuery = dbQuery.or(orClauses);
    }

    const { data, error } = await dbQuery.limit(limit);

    if (!error && data && data.length > 0) {
      return data;
    }

    // Fallback: If no direct keyword match, retrieve available places to provide rich context
    const fallback = await supabase.from('businesses').select('*').limit(limit);
    return fallback.data || [];
  } catch (err) {
    console.warn('Error retrieving places from Supabase:', err);
    return [];
  }
}

/**
 * Extracts bulleted suggestions from LLM answer text into a clean string array
 */
function extractSuggestions(answer: string, defaultCounty?: string): string[] {
  const suggestions: string[] = [];
  const lines = answer.split('\n');
  let inSuggestionSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect dedicated suggestions header (handles icons, bolding, markdown headers)
    if (/suggestions/i.test(trimmed) && (trimmed.includes('💡') || trimmed.startsWith('#') || trimmed.startsWith('**') || trimmed.endsWith(':'))) {
      inSuggestionSection = true;
      continue;
    }

    if (inSuggestionSection) {
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const cleaned = trimmed.replace(/^[-*•\d.]+\s*/, '').replace(/[*_]/g, '').trim();
        // Ignore lines that look like facility data or links
        if (cleaned.length > 5 && !cleaned.includes('/facility/') && !cleaned.includes('http')) {
          suggestions.push(cleaned);
        }
      }
    }
  }

  // Fallback default contextual suggestions if LLM didn't format distinct bullet points
  if (suggestions.length === 0) {
    suggestions.push(`Explore 24/7 emergency facilities in ${defaultCounty || 'Liberia'}`);
    suggestions.push(`Find pharmacies and dispensaries nearby`);
    suggestions.push(`Browse maternal and child healthcare clinics`);
  }

  return suggestions.slice(0, 4);
}

/**
 * Builds structured links for UI consumers
 */
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

    if (place.website) {
      links.push({
        title: `${place.name} Website`,
        url: place.website.startsWith('http') ? place.website : `https://${place.website}`,
        type: 'website',
      });
    }

    const queryLocation = encodeURIComponent(
      `${place.name}, ${place.town || ''}, ${place.county || ''}, Liberia`.trim()
    );
    links.push({
      title: `Directions to ${place.name}`,
      url: `https://www.google.com/maps/search/?api=1&query=${queryLocation}`,
      type: 'map',
    });

    const phone = (place.phones && place.phones[0]) || place.phone;
    if (phone) {
      links.push({
        title: `Call ${place.name}`,
        url: `tel:${phone}`,
        type: 'phone',
      });
    }
  }

  return links;
}

/**
 * RAG AI Agent that answers questions from the database using Groq
 * Formats response conversationally with direct links and intelligent suggestions.
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

  // 2. Format places context for the LLM with direct links
  const simplifiedPlaces = places.map((p: any) => {
    const phone = (p.phones && p.phones[0]) || p.phone || '';
    const mapQuery = encodeURIComponent(`${p.name}, ${p.town || ''}, ${p.county || ''}, Liberia`.trim());

    return {
      id: p.id,
      name: p.name,
      category: p.category || 'Healthcare Facility',
      county: p.county,
      town: p.town,
      street: p.street,
      address: p.address,
      description: p.description,
      phone: phone || null,
      website: p.website || null,
      links: {
        profile_url: `/facility/${p.id}`,
        website_url: p.website ? (p.website.startsWith('http') ? p.website : `https://${p.website}`) : null,
        map_url: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
        call_url: phone ? `tel:${phone}` : null,
      },
      verification: p.verification_status,
      rating: p.avg_rating,
    };
  });

  const contextJson = JSON.stringify(simplifiedPlaces, null, 2);

  // 3. Construct system prompt for conversational text, direct links, and suggestions
  const systemPrompt = `You are a friendly, warm, and helpful AI concierge and assistant for a healthcare and places directory web application in Liberia.

YOUR GOALS:
1. Respond in natural, easy-to-read conversational paragraphs. Avoid rigid, robotic markdown tables or cold, repetitive checklists. Talk naturally like an attentive local advisor.
2. For each place you mention or recommend, always weave in direct clickable Markdown links:
   - [View Profile](/facility/{id})
   - [Visit Website]({website_url}) (if a website is available)
   - [Get Directions]({map_url})
   - [Call {phone}]({call_url}) (if a phone is available)
3. Describe the facility's location, category, key services, and opening hours naturally.
4. Conclude your response with a friendly section titled "💡 Suggestions:" followed by 2 to 4 proactive, tailored follow-up queries or questions formatted as bullet points starting with "- " to help the user navigate their search (e.g. suggesting nearby counties, 24/7 emergency care, pharmacies, or pediatric services).
5. Grounding: Only recommend places from the Database Context below. Do not invent or hallucinate facilities, phone numbers, or links.

Database Context of Places:
${contextJson}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ];

  // 4. Query Groq LLM
  const answer = await callGroqChat(messages, model, apiKey);

  // 5. Build suggestions and structured links
  const suggestions = extractSuggestions(answer, county);
  const links = buildStructuredLinks(places);

  return {
    answer,
    suggestions,
    links,
    places,
    query,
    sourceCount: places.length,
  };
}
