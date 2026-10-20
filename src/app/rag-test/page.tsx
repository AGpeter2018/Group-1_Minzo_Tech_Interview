'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RagTestPage() {
  const [query, setQuery] = useState('Where can I find an emergency hospital in Bomi?');
  const [county, setCounty] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'Where can I find an emergency hospital in Bomi?',
    'Are there any clinics in Monrovia?',
    'Where can I find child health or immunization services?',
    'Tell me about Savanna Field Clinic and how to contact them',
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
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#163B65' }}>
          🤖 Places Directory AI Concierge
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
          Conversational RAG assistant grounded in Supabase, powered by Groq, providing direct links and contextual follow-up suggestions.
        </p>
      </div>

      {/* Preset Queries */}
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
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              color: '#1e293b',
              transition: 'all 0.2s',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Query Form */}
      <form onSubmit={(e) => handleSearch(e)} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px', color: '#163B65' }}>
            Ask anything about places, clinics, hospitals, or services:
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Find clinics with maternal care or 24/7 hospitals in Bomi..."
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
            placeholder="Optional County Filter (e.g. Bomi, Montserrado)"
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
              backgroundColor: loading ? '#94a3b8' : '#163B65',
              color: '#ffffff',
              padding: '10px 24px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Searching & Thinking...' : 'Ask Assistant'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Conversational Text Response */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>💬</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#163B65' }}>
                Assistant Response
              </h2>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#334155', fontSize: '15px' }}>
              {response.answer}
            </div>

            {/* Clickable Suggestions Chips */}
            {response.suggestions && response.suggestions.length > 0 && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
                  💡 Suggested Follow-ups (click to ask):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {response.suggestions.map((sug: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setQuery(sug);
                        handleSearch(undefined, sug);
                      }}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {sug} ↗
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Direct Action Links Bar */}
          {response.links && response.links.length > 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#163B65' }}>
                🔗 Direct Links & Actions
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {response.links.slice(0, 10).map((link: any, idx: number) => (
                  <a
                    key={idx}
                    href={link.url}
                    target={link.type === 'profile' ? '_self' : '_blank'}
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      background: link.type === 'profile' ? '#163B65' : link.type === 'map' ? '#047857' : link.type === 'phone' ? '#0284c7' : '#475569',
                      color: '#ffffff',
                    }}
                  >
                    <span>{link.type === 'profile' ? '📋' : link.type === 'map' ? '🗺️' : link.type === 'phone' ? '📞' : '🌐'}</span>
                    <span>{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
