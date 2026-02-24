"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, HelpCircle } from 'lucide-react'
import { findFAQ, faqs } from './faq-knowledge'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setState(JSON.parse(raw))
    } catch {}
  }, [key])
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])
  return [state, setState] as const
}

export default function FAQBot() {
  const [open, setOpen] = usePersistentState<boolean>('faqbot:open', false)
  const [messages, setMessages] = usePersistentState<ChatMsg[]>('faqbot:messages', [
    { role: 'assistant', content: 'Hi! I\'m the FAQ Bot. Ask me about donor matching, eligibility, or how to request blood.' }
  ])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const samples = useMemo(
    () => [
      'How does donor matching work?',
      'Who can register as a donor?',
      'What is the universal blood type?',
      'How can I request blood urgently?',
      'What is this platform about?'
    ],
    []
  )

  function replyFor(query: string): string {
    const hit = findFAQ(query)
    if (hit) return hit.a
    return (
      "I\'m not sure about that yet. You can: \n" +
      "• Check the Help & Docs section in Resources\n" +
      "• Contact support at support@example.com\n" +
      "• Share feedback from your Profile page"
    )
  }

  function send(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    const answer = replyFor(trimmed)
    // Append user question and single assistant reply in one update to avoid duplicates
    setMessages(prev => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: answer }
    ])
    setInput('')
  }

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        aria-label="Help & FAQ"
        title="Help & FAQ"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[3000] inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-400 text-white shadow-lg transition hover:scale-105 hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Overlay + Modal */}
      {open && (
        <div className="fixed inset-0 z-[3000] flex items-end justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative m-4 w-[min(100%,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-2"
          >
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">FAQ Bot</p>
                  <p className="text-[11px] text-slate-500">Ask a question or try a suggestion</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] min-h-[240px] space-y-2 overflow-y-auto p-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'assistant' ? 'text-slate-700' : 'text-slate-900'}>
                  <div
                    className={
                      'inline-block max-w-[90%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ' +
                      (m.role === 'assistant'
                        ? 'bg-slate-100'
                        : 'bg-primary/10 text-slate-900 border border-primary/20')
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-xs text-slate-500">
                Try asking:
                <div className="mt-2 flex flex-wrap gap-2">
                  {samples.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      onClick={() => send(s)}
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={e => {
                e.preventDefault()
                send(input)
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your question…"
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-sm font-medium text-white shadow hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
