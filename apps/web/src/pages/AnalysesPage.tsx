import { AppShell } from '@/components/layout/AppShell'
import { ArrowLeft, Share2, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ANALYSIS_CONTENT = {
  tag: 'Architecture Breakdown',
  date: 'May 24, 2024',
  title: 'OAuth2 Flow & Database State Synchronization',
  subtitle: 'Generated Analysis',
  sources: 'Based on src/auth/flow.ts and db/sync.ts',
  body: [
    {
      type: 'p',
      text: 'The synchronization of state between the external OAuth provider and the internal user database presents a critical bottleneck in the authentication pipeline. This analysis breaks down the observed latency and proposes a robust transactional approach to state management.',
    },
    { type: 'h2', text: 'The Asynchronous Challenge' },
    {
      type: 'p',
      text: 'Currently, the authentication service relies on a fire-and-forget mechanism to update the user profile upon a successful token grant. While this ensures a fast initial response to the client, it introduces significant consistency risks if the database update fails silently.',
    },
    {
      type: 'p-with-note',
      text: 'When the ',
      code: '/oauth/callback',
      text2: ' endpoint receives the authorization code, it immediately exchanges it for an access token. The subsequent user data fetch and database upsert are performed asynchronously. If the database connection drops during this exact window, the user is authenticated in session but their profile remains stale in the primary data store.',
      note: 'Reference: src/auth/handlers.ts:42. The callback handler currently lacks a DLQ (Dead Letter Queue) implementation for failed syncs.',
    },
    { type: 'h3', text: 'Proposed Implementation' },
    {
      type: 'p',
      text: 'To mitigate this, we must wrap the token exchange and profile update within a localized transaction or implement an event-driven eventual consistency model with guaranteed delivery. Below is a conceptual refactor utilizing a transactional outbox pattern.',
    },
    {
      type: 'code',
      text: `async function handleCallback(code: string) {
  return await db.transaction(async (tx) => {
    // 1. Exchange code for token
    const token = await oauthClient.exchangeCode(code);

    // 2. Fetch latest profile
    const profile = await oauthClient.getProfile(token);

    // 3. Upsert user synchronously within transaction
    const user = await tx.users.upsert({
      where: { externalId: profile.id },
      update: { lastLogin: new Date(), ...profile },
      create: { externalId: profile.id, ...profile }
    });

    return createSession(user);
  });
}`,
    },
    { type: 'h2', text: 'Performance Implications' },
    {
      type: 'p',
      text: 'Moving to a synchronous, transaction-bound flow will inevitably increase the P99 latency of the callback route. However, the trade-off is absolute data integrity. In a system handling access control and permissions, consistency must precede sheer speed.',
    },
    {
      type: 'warning',
      title: 'Architectural Note',
      text: 'If latency exceeds 500ms, we may need to reconsider the underlying database indexing on the externalId column, or introduce a fast-path caching layer for hot profiles.',
    },
  ],
}

export function AnalysesPage() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-paper-bright">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 border-2 border-ink flex items-center justify-center hover:bg-paper-dim transition-colors mb-8"
            aria-label="Back"
          >
            <ArrowLeft size={16} strokeWidth={2} className="text-ink" />
          </button>

          {/* Tag + date */}
          <div className="flex items-center gap-3 mb-4">
            <span className="badge badge-yellow text-[10px] tracking-widest">{ANALYSIS_CONTENT.tag}</span>
            <span className="font-mono text-[12px] text-ink-muted">{ANALYSIS_CONTENT.date}</span>
          </div>

          {/* Title */}
          <h1 className="font-heading font-bold text-[42px] leading-[1.1] tracking-tight text-ink mb-6">
            {ANALYSIS_CONTENT.title}
          </h1>

          {/* Author stub */}
          <div className="flex items-center gap-3 mb-10 pb-8 border-b-2 border-ink">
            <div className="w-10 h-10 bg-ink-dim border-2 border-ink flex items-center justify-center">
              <span className="font-mono text-[11px] text-white font-bold">AI</span>
            </div>
            <div>
              <p className="font-mono text-[12px] font-semibold text-ink">{ANALYSIS_CONTENT.subtitle}</p>
              <p className="font-mono text-[11px] text-ink-muted">{ANALYSIS_CONTENT.sources}</p>
            </div>
          </div>

          {/* Body */}
          <div className="analysis-body relative">
            {ANALYSIS_CONTENT.body.map((block, i) => {
              if (block.type === 'p') return <p key={i}>{block.text}</p>
              if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>
              if (block.type === 'h3') return <h3 key={i}>{block.text}</h3>
              if (block.type === 'p-with-note') {
                return (
                  <div key={i} className="relative">
                    <p>
                      {block.text}
                      {block.code && <code>{block.code}</code>}
                      {block.text2}
                    </p>
                    {block.note && (
                      <aside className="absolute -right-48 top-0 w-40 font-mono text-[10px] text-ink-muted leading-relaxed hidden xl:block">
                        <strong className="font-semibold text-ink-dim">Reference:</strong><br />
                        {block.note}
                      </aside>
                    )}
                  </div>
                )
              }
              if (block.type === 'code') {
                return (
                  <pre key={i} className="overflow-x-auto">
                    <code className="font-mono text-[12px] leading-relaxed text-[#D4D4D4]">
                      {block.text}
                    </code>
                  </pre>
                )
              }
              if (block.type === 'warning') {
                return (
                  <div key={i} className="border-2 border-accent-red bg-[#fff5f5] p-4 my-6">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={15} strokeWidth={2} className="text-accent-red flex-shrink-0" />
                      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent-red">
                        {block.title}
                      </span>
                    </div>
                    <p className="font-body text-[14px] text-ink-dim leading-relaxed">
                      {block.text}
                    </p>
                  </div>
                )
              }
              return null
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-16 pt-8 border-t-2 border-ink">
            <button className="btn btn-outline flex items-center gap-2">
              <Share2 size={14} strokeWidth={1.8} />
              Share Analysis
            </button>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 border-2 border-ink flex items-center justify-center hover:bg-paper-dim transition-colors" title="Helpful">
                <ThumbsUp size={16} strokeWidth={1.8} className="text-ink" />
              </button>
              <button className="w-10 h-10 border-2 border-ink flex items-center justify-center hover:bg-paper-dim transition-colors" title="Not Helpful">
                <ThumbsDown size={16} strokeWidth={1.8} className="text-ink" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
