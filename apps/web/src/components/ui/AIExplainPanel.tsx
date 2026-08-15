import { useRef, useEffect, useState } from 'react'
import {
  Sparkles, X, ExternalLink, Clock, Zap,
  ChevronDown, ChevronRight, Copy, CheckCheck, RotateCcw, BookOpen,
} from 'lucide-react'
import type { ExplainMessage, ExplainRequest } from '@/hooks/useCodeExplain'

// ─── Tiny Markdown renderer ───────────────────────────────────────────────────
// Handles: **bold**, `inline code`, ```code blocks```, - bullets, | tables
function renderMd(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'code'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]); i++
      }
      out.push(
        <div key={`cb-${i}`} className="my-2 bg-[#1E1E1E] border border-[#333] overflow-auto">
          <div className="px-3 py-1 border-b border-[#333] bg-[#252526]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#569CD6]">{lang}</span>
          </div>
          <pre className="px-3 py-2 font-mono text-[10px] text-[#D4D4D4] leading-relaxed overflow-x-auto whitespace-pre">
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      i++; continue
    }

    // Table row
    if (line.includes('|') && line.trim().startsWith('|')) {
      const rows: string[] = []
      while (i < lines.length && lines[i].includes('|')) { rows.push(lines[i]); i++ }
      out.push(<MiniTable key={`t-${i}`} rows={rows} />)
      continue
    }

    // Heading
    if (line.startsWith('## ') || line.startsWith('# ')) {
      out.push(<p key={`h-${i}`} className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink mt-3 mb-1">{line.replace(/^#+\s/, '')}</p>)
      i++; continue
    }

    // Bullet
    if (line.match(/^\s*[-*]\s/)) {
      const bullets: string[] = []
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        bullets.push(lines[i].replace(/^\s*[-*]\s/, '')); i++
      }
      out.push(
        <ul key={`ul-${i}`} className="my-1.5 flex flex-col gap-0.5">
          {bullets.map((b, j) => (
            <li key={j} className="flex items-start gap-1.5 font-body text-[11px] text-ink leading-snug">
              <span className="text-accent-blue mt-0.5 flex-shrink-0 text-[8px]">▸</span>
              <span>{inlineMd(b)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Blank
    if (!line.trim()) { i++; continue }

    // Paragraph
    out.push(<p key={`p-${i}`} className="font-body text-[11px] text-ink leading-snug mb-1.5">{inlineMd(line)}</p>)
    i++
  }
  return <>{out}</>
}

function MiniTable({ rows }: { rows: string[] }) {
  const parsed = rows
    .filter(r => !r.match(/^\s*\|[-| :]+\|\s*$/))
    .map(r => r.split('|').map(c => c.trim()).filter(Boolean))
  if (!parsed.length) return null
  const [header, ...body] = parsed
  return (
    <table className="my-2 w-full border-collapse font-mono text-[10px]">
      <thead>
        <tr>{header?.map((c, j) => <th key={j} className="text-left px-2 py-1 border border-ink/30 bg-paper-dim text-ink font-semibold">{c}</th>)}</tr>
      </thead>
      <tbody>
        {body.map((row, i) => (
          <tr key={i} className="hover:bg-paper-dim">
            {row.map((c, j) => <td key={j} className="px-2 py-1 border border-ink/20 text-ink-dim">{inlineMd(c)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function inlineMd(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="font-mono text-[10px] bg-paper-dim px-1 text-accent-blue">{p.slice(1, -1)}</code>
    return p
  })
}

// ─── History item ─────────────────────────────────────────────────────────────
function HistoryItem({ msg, onReopen }: { msg: ExplainMessage; onReopen: (m: ExplainMessage) => void }) {
  const [open, setOpen] = useState(false)
  const snippet = msg.request.code.trim().split('\n')[0].slice(0, 44)
  const lc = msg.request.endLine - msg.request.startLine + 1

  return (
    <div className="border border-ink/20 mb-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-paper-dim transition-colors"
      >
        {open
          ? <ChevronDown size={10} className="text-ink-muted flex-shrink-0" />
          : <ChevronRight size={10} className="text-ink-muted flex-shrink-0" />
        }
        <span className="font-mono text-[10px] text-ink flex-1 truncate">{snippet}…</span>
        <span className="font-mono text-[9px] text-ink-muted flex-shrink-0">{lc}L</span>
        <span className="font-mono text-[9px] text-ink-muted flex-shrink-0">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-ink/10">
          <p className="font-body text-[11px] text-ink-dim mt-2 leading-snug line-clamp-3">
            {msg.explanation.slice(0, 180)}…
          </p>
          <button
            onClick={() => onReopen(msg)}
            className="mt-2 font-mono text-[10px] text-accent-blue hover:underline flex items-center gap-1"
          >
            <BookOpen size={10} /> View full
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main AIExplainPanel ──────────────────────────────────────────────────────
interface AIExplainPanelProps {
  current:     ExplainMessage | null
  history:     ExplainMessage[]
  isStreaming: boolean
  onDismiss:   () => void
  onReExplain: (req: ExplainRequest) => void
  onOpenInChat:(msg: ExplainMessage) => void
}

export function AIExplainPanel({
  current, history, isStreaming, onDismiss, onReExplain, onOpenInChat,
}: AIExplainPanelProps) {
  const bottomRef              = useRef<HTMLDivElement>(null)
  const [copied, setCopied]    = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [histMsg, setHistMsg]  = useState<ExplainMessage | null>(null)

  // Auto-scroll as explanation streams
  useEffect(() => {
    if (!showHistory) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [current?.explanation, showHistory])

  const displayMsg = histMsg ?? current
  const pastHistory = history.filter(m => m.id !== current?.id)

  const copyText = () => {
    if (!displayMsg) return
    navigator.clipboard.writeText(displayMsg.explanation).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div id="ai-explain-panel" className="flex flex-col border-t-2 border-ink bg-paper" style={{ maxHeight: '55%' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink/20 flex-shrink-0 bg-paper-bright">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-accent-yellow" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink">AI Explain</span>
          {isStreaming && (
            <span className="font-mono text-[9px] text-accent-yellow animate-pulse">● live</span>
          )}
          {!isStreaming && displayMsg?.durationMs && (
            <span className="font-mono text-[9px] text-ink-muted flex items-center gap-1">
              <Clock size={8} /> {(displayMsg.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {pastHistory.length > 0 && (
            <button
              title={`${pastHistory.length} past explanations`}
              onClick={() => { setShowHistory(h => !h); setHistMsg(null) }}
              className={`w-6 h-6 flex items-center justify-center hover:bg-paper-dim text-ink-muted ${showHistory ? 'bg-paper-dim' : ''}`}
            >
              <BookOpen size={11} />
            </button>
          )}
          {displayMsg && !isStreaming && (
            <>
              <button title="Copy" onClick={copyText} className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim text-ink-muted">
                {copied ? <CheckCheck size={11} className="text-[#4EC9B0]" /> : <Copy size={11} />}
              </button>
              <button title="Re-run" onClick={() => { setHistMsg(null); onReExplain(displayMsg.request) }} className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim text-ink-muted">
                <RotateCcw size={11} />
              </button>
            </>
          )}
          <button title="Dismiss" onClick={onDismiss} className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim text-ink-muted">
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Selected code snippet preview */}
      {displayMsg && (
        <div className="mx-3 mt-2 flex-shrink-0">
          <div className="border border-ink/20 bg-[#1E1E1E]">
            <div className="flex items-center gap-2 px-2 py-1 border-b border-[#333] bg-[#252526]">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#569CD6]">
                {displayMsg.request.file.split('/').pop()}
                {' · '}Ln {displayMsg.request.startLine}
                {displayMsg.request.endLine > displayMsg.request.startLine && `–${displayMsg.request.endLine}`}
              </span>
            </div>
            <pre className="px-3 py-1.5 font-mono text-[10px] text-[#CE9178] leading-relaxed overflow-x-auto whitespace-pre max-h-[56px] overflow-y-hidden">
              {displayMsg.request.code.trim().slice(0, 250)}{displayMsg.request.code.length > 250 ? '\n…' : ''}
            </pre>
          </div>
        </div>
      )}

      {/* History view */}
      {showHistory && !histMsg ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">
            History ({pastHistory.length})
          </p>
          {pastHistory.map(m => (
            <HistoryItem key={m.id} msg={m} onReopen={m => { setHistMsg(m); setShowHistory(false) }} />
          ))}
        </div>
      ) : (
        /* Explanation body */
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          {!displayMsg && (
            <p className="font-mono text-[11px] text-ink-muted text-center mt-4">
              Select code in the editor and click Explain.
            </p>
          )}
          {displayMsg && (
            <>
              {renderMd(displayMsg.explanation)}
              {isStreaming && (
                <span className="inline-block w-1 h-3.5 bg-accent-yellow animate-pulse ml-0.5 translate-y-1" />
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      )}

      {/* Footer: Open in Chat */}
      {displayMsg?.status === 'complete' && !showHistory && (
        <div className="border-t border-ink/10 px-3 py-2 flex items-center justify-between flex-shrink-0 bg-paper-bright">
          <span className="font-mono text-[9px] text-ink-muted flex items-center gap-1">
            <Zap size={9} className="text-accent-yellow" />
            ~{displayMsg.tokensOut ?? 0} tokens
          </span>
          <button
            id="explain-open-in-chat-btn"
            onClick={() => onOpenInChat(displayMsg)}
            className="
              flex items-center gap-1.5 px-3 py-1
              font-mono text-[10px] font-semibold
              bg-accent-yellow text-ink border-2 border-ink
              hover:bg-ink hover:text-paper-bright transition-colors
            "
          >
            <ExternalLink size={10} /> Open in Chat
          </button>
        </div>
      )}
    </div>
  )
}
