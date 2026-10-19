'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RagTestPage() {
  const [query, setQuery] = useState('Are there any clinics in Monrovia?');
  const [county, setCounty] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'Are there any clinics in Monrovia?',
    'Find hospitals with emergency services',
    'What facilities are in Bomi County?',
    'Where is Savanna Field Clinic located and what are their hours?',
  ];

  async function handleSearch(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const searchQuery = customQuery || query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          county: county || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch RAG response');
      }

      setResponse(data.data);
    } catch (err: any) {
      setError(err.message || 'Error executing request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e293b' }}>
          🤖 Groq + Supabase RAG Agent Tester
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Interactive playground to test the live RAG agent connected to Supabase and Groq.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(q);
              handleSearch(undefined, q);
            }}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => handleSearch(e)} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px', color: '#334155' }}>
            User Search Query:
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about places, clinics, hospitals, locations..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="Optional County Filter (e.g. Montserrado, Bomi)"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              padding: '10px 24px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Thinking...' : 'Ask Agent'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>
              💬 AI Agent Response
            </h2>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
              {response.answer}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0', color: '#334155' }}>
              📑 Database Grounding Sources ({response.sourceCount} places retrieved)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {response.places.map((place: any, index: number) => (
                <div key={place.id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a' }}>{place.name}</strong>
                  <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', margin: '4px 0' }}>
                    {place.category || 'Facility'}
                  </span>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    📍 {place.town ? `${place.town}, ` : ''}{place.county || 'Liberia'}
                  </div>
                  {place.phones && place.phones.length > 0 && (
                    <div style={{ fontSize: '13px', color: '#059669', marginTop: '4px' }}>
                      📞 {place.phones.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

