'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Send,
  X,
  MapPin,
  User as UserIcon,
  ExternalLink,
  Phone,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RawFacility {
  id?: string;
  name: string;
  county?: string;
  town?: string;
  phone?: string;
  phones?: string[];
  website?: string;
  website_url?: string;
}

interface FacilitySuggestion {
  id?: string;
  name: string;
  county?: string;
  town?: string;
  phone?: string;
  website_url?: string;
}

let messageSeq = 1000;
function createUniqueId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  facilities?: FacilitySuggestion[];
  timestamp: string;
  followUp?: string;
  suggestions?: string[];
}

// Maximum characters a user may send per message (matches server-side guardrail)
const MAX_QUERY_LENGTH = 500;

function formatCurrentTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${minutesStr}${ampm}`;
}

const WELCOME_MESSAGE: Message = {
  id: 'msg-welcome',
  sender: 'bot',
  text: "Hello! Welcome to Minzo Africa. 👋\n\nI'm your AI healthcare assistant. Here is what I can help you do:\n• Find hospitals, clinics, and pharmacies near you\n• Check 24/7 emergency services and operating hours\n• Get facility contact numbers, addresses, and directions across Liberia\n\nHow can I help you today?",
  suggestions: [
    'Find hospitals near me',
    '24/7 Emergency clinics',
    'Pharmacies in Monrovia',
    'Clinics in Montserrado',
  ],
  timestamp: 'Just now',
};

export function AiChatbot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check current auth user
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    }
    checkUser();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    // Guardrail: enforce max input length
    if (text.length > MAX_QUERY_LENGTH) {
      const errorMsg: Message = {
        id: createUniqueId('bot'),
        sender: 'bot',
        text: `Message too long. Please keep your question under ${MAX_QUERY_LENGTH} characters.`,
        timestamp: formatCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    const userMsg: Message = {
      id: createUniqueId('user'),
      sender: 'user',
      text,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      // 1. Try querying the RAG API endpoint
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, limit: 4 }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const { answer, places, suggestions } = result.data;

          const matchedFacilities: FacilitySuggestion[] = (places || [])
            .slice(0, 6)
            .map((p: RawFacility) => ({
              id: p.id,
              name: p.name,
              town: p.town,
              county: p.county,
              phone: (p.phones && p.phones[0]) || p.phone,
              website_url: p.website || p.website_url,
            }));

          const botMsg: Message = {
            id: createUniqueId('bot'),
            sender: 'bot',
            text: answer || 'Here are the matching healthcare facilities from the database:',
            facilities: matchedFacilities.length > 0 ? matchedFacilities : undefined,
            followUp:
              matchedFacilities.length > 0
                ? 'Would you like directions or contact details for any of these facilities?'
                : undefined,
            suggestions: suggestions && suggestions.length > 0 ? suggestions : undefined,
            timestamp: formatCurrentTime(),
          };

          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }

      // RAG API returned a non-OK status — show a service error, no hardcoded fallback
      const statusMsg: Message = {
        id: createUniqueId('bot'),
        sender: 'bot',
        text: `I'm having trouble reaching the directory right now (status ${response.status}). Please try again in a moment.`,
        timestamp: formatCurrentTime(),
      };
      setMessages((prev) => [...prev, statusMsg]);
    } catch (err) {
      console.error('[Chatbot] Request error:', err);
      const errorMsg: Message = {
        id: createUniqueId('bot'),
        sender: 'bot',
        text: "I'm having trouble connecting to the directory right now. Please try your search again in a moment.",
        timestamp: formatCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* =========================================================================
          1. CHAT DIALOG WINDOW (Figma Node 355:2035 "Ai Chatbox")
      ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Minzo AI Assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-115 md:w-125 h-160 max-h-[84vh] bg-white rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        >
          {/* Top Bar Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            {/* Assistant Details */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#60A5FA] flex items-center justify-center text-white shadow-xs">
                <BotSparkleIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#163B65] leading-tight">
                    Minzo AI Concierge
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Liberian Healthcare Directory & Services
                </p>
              </div>
            </div>

            {/* Right Header Icons (User Avatar + Close) */}
            <div className="flex items-center gap-2">
              {/* User Avatar Circle (Figma Node 355:2036) */}
              <div
                className="w-9 h-9 rounded-full bg-[#D9D9D9]/25 flex items-center justify-center text-[#163B65] shrink-0"
                title={userEmail ? `Signed in as ${userEmail}` : 'User'}
              >
                <UserIcon className="w-4.5 h-4.5" />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-white">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              if (isUser) {
                return (
                  <div key={msg.id} className="flex items-start justify-end gap-2.5">
                    {/* User Message Bubble */}
                    <div className="bg-white border border-[#212934] rounded-xl p-4 max-w-[82%] shadow-2xs">
                      <p className="text-sm text-[#212934] leading-relaxed whitespace-pre-wrap font-normal">
                        {msg.text}
                      </p>
                      <div className="text-[11px] text-gray-500 font-medium pt-2 text-right">
                        {msg.timestamp}
                      </div>
                    </div>

                    {/* User Avatar on the Right (Figma Node 355:2036) */}
                    <div className="w-9 h-9 rounded-full bg-[#D9D9D9]/25 flex items-center justify-center text-[#163B65] shrink-0 mt-1">
                      <UserIcon className="w-4.5 h-4.5" />
                    </div>
                  </div>
                );
              }

              // Bot Message
              return (
                <div key={msg.id} className="flex items-start gap-2.5">
                  {/* Bot Avatar on the Left (Figma Node 355:2038) */}
                  <div className="w-9 h-9 rounded-full bg-[#D9D9D9]/25 flex items-center justify-center text-[#163B65] shrink-0 mt-1">
                    <BotSparkleIcon size={20} />
                  </div>

                  {/* Bot Message Bubble */}
                  <div className="bg-white border border-[#212934] rounded-xl p-4 max-w-[85%] space-y-3.5 shadow-2xs">
                    {/* Main text */}
                    <p className="text-sm text-[#212934] leading-relaxed font-normal whitespace-pre-line">
                      {msg.text}
                    </p>

                    {/* Facilities List (Figma Node 355:2035) */}
                    {msg.facilities && msg.facilities.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {msg.facilities.map((fac, idx) => {
                          const facilityHref = fac.id ? `/facility/${fac.id}` : null;
                          const CardBody = (
                            <div className="flex flex-col gap-1.5 w-full">
                              {/* Top row: Name + Clickable View Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-[#163B65] group-hover:text-blue-700 transition-colors leading-snug">
                                  {fac.name}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#163B65] bg-blue-50 group-hover:bg-blue-100 group-hover:text-blue-800 px-2.5 py-0.5 rounded-full shrink-0 transition-colors">
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              </div>

                              {/* Location Pin & County */}
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span>
                                  {fac.town ? `${fac.town}, ` : ''}
                                  {fac.county || 'Liberia'}
                                </span>
                              </div>

                              {/* Optional Phone / Actions */}
                              {fac.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 pt-0.5">
                                  <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.location.href = `tel:${fac.phone}`;
                                    }}
                                    className="text-gray-700 hover:text-[#163B65] hover:underline cursor-pointer"
                                    title={`Call ${fac.phone}`}
                                  >
                                    {fac.phone}
                                  </button>
                                </div>
                              )}
                            </div>
                          );

                          if (facilityHref) {
                            return (
                              <Link
                                key={idx}
                                href={facilityHref}
                                onClick={() => setIsOpen(false)}
                                className="block bg-gray-50/80 hover:bg-blue-50/50 active:bg-blue-100/60 p-3 rounded-xl border border-gray-200/90 hover:border-[#163B65] transition-all cursor-pointer group shadow-2xs"
                                title={`View ${fac.name} details page`}
                              >
                                {CardBody}
                              </Link>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className="bg-gray-50/70 p-3 rounded-xl border border-gray-100"
                            >
                              {CardBody}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Follow-up question */}
                    {msg.followUp && (
                      <p className="text-sm text-[#212934] font-normal leading-relaxed pt-1">
                        {msg.followUp}
                      </p>
                    )}

                    {/* Quick suggestion prompt buttons */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestions.map((sug, sIdx) => {
                          const matchedFac = (msg.facilities || []).find(
                            (f) =>
                              f.id &&
                              (sug.toLowerCase().includes(f.name.toLowerCase()) ||
                                f.name.toLowerCase().includes(sug.toLowerCase()))
                          );

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                if (matchedFac?.id) {
                                  setIsOpen(false);
                                  router.push(`/facility/${matchedFac.id}`);
                                } else {
                                  handleSendMessage(sug);
                                }
                              }}
                              className="text-[11px] font-medium text-[#163B65] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-left"
                            >
                              {sug}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp in bottom right */}
                    <div className="text-[11px] text-gray-500 font-medium text-right pt-1">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#D9D9D9]/25 flex items-center justify-center text-[#163B65] shrink-0">
                  <BotSparkleIcon size={20} />
                </div>
                <div className="bg-white border border-[#212934] rounded-xl px-4 py-3 shadow-2xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#163B65] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#163B65] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#163B65] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-gray-500 font-medium ml-1">
                    Searching Liberia healthcare directory...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* =========================================================================
              Bottom Input Bar (Figma Node 355:2041 Frame 131)
          ========================================================================= */}
          <div className="p-3 sm:p-4 bg-white border-t border-gray-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="border border-[#212934] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-[#163B65] focus-within:border-[#163B65] transition-all"
            >
              {/* Left Chat Icon */}
              <MessageSquare className="w-5 h-5 text-[#212934] shrink-0" />

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message"
                className="w-full text-sm text-[#212934] placeholder-gray-500 focus:outline-none bg-transparent"
              />

              {/* Send Button with Paper Airplane */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-9 h-9 rounded-full bg-[#D9E8F9] hover:bg-[#c2dcfa] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[#163B65] transition-colors shrink-0 cursor-pointer"
                aria-label="Send message"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#163B65]" />
                ) : (
                  <Send className="w-4 h-4 text-[#163B65] translate-x-px" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. FLOATING CHAT BUBBLE BUTTON (Figma Node 356:2472 "fluent-color:bot-sparkle-16")
      ========================================================================= */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI Chatbot' : 'Open AI Chatbot'}
        title="Minzo AI Healthcare Assistant"
        className="fixed bottom-6 right-6 z-50 w-15 h-15 rounded-full bg-[#60A5FA] hover:bg-[#4895f8] active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-[0_2px_20px_1px_rgba(0,0,0,0.18),2px_0_20px_1px_rgba(0,0,0,0.18)] group focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white stroke-[2.5] transition-transform group-hover:rotate-90" />
        ) : (
          <div className="transition-transform group-hover:scale-110">
            <BotSparkleIcon size={34} />
          </div>
        )}
      </button>
    </>
  );
}

/**
 * High-fidelity SVG icon for Microsoft Fluent Bot Sparkle (Figma Node 356:2472)
 */
function BotSparkleIcon({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Bot Head */}
      <rect x="7" y="9.5" width="14" height="10" rx="3.5" fill="#1E293B" />
      <circle cx="10.8" cy="14.5" r="1.4" fill="#FFFFFF" />
      <circle cx="17.2" cy="14.5" r="1.4" fill="#FFFFFF" />
      {/* Antenna */}
      <rect x="13.2" y="7" width="1.6" height="3" rx="0.8" fill="#1E293B" />
      <circle cx="14" cy="6.5" r="1.1" fill="#1E293B" />
      {/* Bot Body Pill */}
      <rect x="6" y="21" width="16" height="7.5" rx="3.75" fill="#1E293B" />

      {/* Primary Vibrant Sparkle Star (Yellow to Green/Orange) */}
      <path
        d="M24.5 8 C24.5 11.2 27.8 13.2 30.5 13.8 C27.8 14.4 24.5 16.4 24.5 19.5 C24.5 16.4 21.2 14.4 18.5 13.8 C21.2 13.2 24.5 11.2 24.5 8 Z"
        fill="url(#sparkleGradient1)"
      />

      {/* Secondary Sparkle Star (Green) */}
      <path
        d="M28 20.5 C28 22.3 29.8 23.4 31.2 23.8 C29.8 24.2 28 25.3 28 27 C28 25.3 26.2 24.2 24.8 23.8 C26.2 23.4 28 22.3 28 20.5 Z"
        fill="url(#sparkleGradient2)"
      />

      <defs>
        <linearGradient
          id="sparkleGradient1"
          x1="18.5"
          y1="8"
          x2="30.5"
          y2="19.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FDE047" />
          <stop offset="0.45" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient
          id="sparkleGradient2"
          x1="24.8"
          y1="20.5"
          x2="31.2"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4ADE80" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  );
}
