import { type ChatMessage, type Citation } from '@/types/chat'
import { FileCode, User, Bot, Copy, ThumbsUp, ThumbsDown, ExternalLink, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'

// ── Tiny inline markdown renderer (no dep, matches Bauhaus aesthetic) ──────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      result.push(
        <div key={i} className="my-3 overflow-hidden border border-ink/30">
          {lang && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-ink/90 border-b border-ink/20">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#FFCC00]">
                {lang}
              </span>
            </div>
          )}
          <pre className="bg-[#1E1E1E] p-4 overflow-x-auto">
            <code className="font-mono text-[12px] leading-relaxed text-[#D4D4D4]">
              {codeLines.join('\n')}
            </code>
          </pre>
        </div>
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      result.push(
        <div
          key={i}
          className="my-2 pl-3 border-l-2 border-accent-yellow bg-accent-yellow/10 py-2 pr-3"
        >
          <p className="font-body text-[13px] text-ink-dim italic">
            {renderInline(line.slice(2))}
          </p>
        </div>
      )
      i++
      continue
    }

    // Heading ##
    if (line.startsWith('## ')) {
      result.push(
        <h3 key={i} className="font-heading font-bold text-[15px] mt-4 mb-1 text-ink">
          {line.slice(3)}
        </h3>
      )
      i++
      continue
    }

    // Heading ###
    if (line.startsWith('### ')) {
      result.push(
        <h4 key={i} className="font-heading font-semibold text-[13px] mt-3 mb-1 text-ink">
          {line.slice(4)}
        </h4>
      )
      i++
      continue
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      result.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="font-mono text-[10px] mt-1 text-ink-muted flex-shrink-0">▸</span>
          <span className="font-body text-[14px] text-ink leading-relaxed">
            {renderInline(line.slice(2))}
          </span>
        </div>
      )
      i++
      continue
    }

    // Empty line
    if (line.trim() === '') {
      result.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    // Paragraph
    result.push(
      <p key={i} className="font-body text-[14px] text-ink leading-relaxed my-0.5">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return result
}

function renderInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="font-mono text-[12px] bg-paper-dim px-1.5 py-0.5 border border-paper-muted text-accent-blue">
              {part.slice(1, -1)}
            </code>
          )
        }
        return part
      })}
    </>
  )
}

// ── Citation chip ────────────────────────────────────────────────────────────
function CitationChip({ citation }: { citation: Citation }) {
  return (
    <button className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wide
      border border-accent-blue/40 bg-accent-blue/8 text-accent-blue px-2 py-0.5
      hover:bg-accent-blue/20 transition-colors">
      <FileCode size={10} strokeWidth={2} />
      {citation.file}:{citation.startLine}
      <ExternalLink size={9} strokeWidth={2} />
    </button>
  )
}

// ── Intent badge ─────────────────────────────────────────────────────────────
const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  code_highlight_qa: { label: 'Selection Q&A',    color: 'text-accent-blue border-accent-blue/40 bg-accent-blue/8' },
  free_question:     { label: 'Free Question',     color: 'text-accent-bronze border-accent-bronze/40 bg-accent-bronze/8' },
  file_analysis:     { label: 'File Analysis',     color: 'text-accent-yellow border-accent-yellow/40 bg-accent-yellow/20' },
  folder_analysis:   { label: 'Folder Analysis',   color: 'text-accent-red border-accent-red/40 bg-accent-red/8' },
  project_analysis:  { label: 'Project Analysis',  color: 'text-ink border-ink/40 bg-paper-dim' },
}

// ── Message Bubble ───────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end group animate-fadein">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {/* Intent badge if applicable */}
          {message.intent && INTENT_LABELS[message.intent] && (
            <span className={`font-mono text-[9px] font-semibold uppercase tracking-widest border px-1.5 py-0.5 ${INTENT_LABELS[message.intent].color}`}>
              {INTENT_LABELS[message.intent].label}
            </span>
          )}

          {/* Code selection context */}
          {message.selection && (
            <div className="w-full border border-ink/30 bg-[#1E1E1E] px-3 py-2 mb-1">
              <div className="flex items-center gap-2 mb-1.5">
                <FileCode size={11} strokeWidth={2} className="text-accent-blue" />
                <span className="font-mono text-[10px] text-[#569CD6]">
                  {message.selection.file}:{message.selection.startLine}–{message.selection.endLine}
                </span>
              </div>
              <pre className="font-mono text-[11px] text-[#D4D4D4] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {message.selection.text.slice(0, 200)}{message.selection.text.length > 200 ? '…' : ''}
              </pre>
            </div>
          )}

          {/* Message */}
          <div className="bg-ink text-paper-bright px-4 py-3 border-2 border-ink shadow-hard-sm">
            <p className="font-body text-[14px] leading-relaxed">{message.content}</p>
          </div>
          <span className="font-mono text-[10px] text-ink-muted">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="w-8 h-8 bg-ink border-2 border-ink flex items-center justify-center flex-shrink-0 mt-1">
          <User size={14} strokeWidth={2} className="text-paper-bright" />
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex gap-3 group animate-fadein">
      <div className="w-8 h-8 bg-accent-yellow border-2 border-ink flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={14} strokeWidth={2} className="text-ink" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Model badge */}
        {message.model && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-widest border border-ink/30 bg-paper-dim px-1.5 py-0.5 text-ink-dim">
              {message.model}
            </span>
            {message.status === 'streaming' && (
              <span className="flex gap-0.5 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-accent-yellow rounded-full"
                    style={{
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="font-body text-[14px] leading-relaxed text-ink">
          {renderMarkdown(message.content)}
          {message.status === 'streaming' && (
            <span className="inline-block w-0.5 h-4 bg-ink ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationChip key={i} citation={c} />
            ))}
          </div>
        )}

        {/* Footer: token count + actions */}
        {message.status === 'complete' && (
          <div className="mt-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.tokens && (
              <span className="font-mono text-[10px] text-ink-muted">
                {message.tokens.input.toLocaleString()} in · {message.tokens.output.toLocaleString()} out
                {message.durationMs && ` · ${(message.durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleCopy}
                className="w-6 h-6 flex items-center justify-center border border-ink/20 hover:border-ink hover:bg-paper-dim transition-colors"
                title="Copy response"
              >
                {copied
                  ? <CheckCheck size={11} strokeWidth={2} className="text-accent-blue" />
                  : <Copy size={11} strokeWidth={1.8} className="text-ink-muted" />
                }
              </button>
              <button className="w-6 h-6 flex items-center justify-center border border-ink/20 hover:border-ink hover:bg-paper-dim transition-colors" title="Helpful">
                <ThumbsUp size={11} strokeWidth={1.8} className="text-ink-muted" />
              </button>
              <button className="w-6 h-6 flex items-center justify-center border border-ink/20 hover:border-ink hover:bg-paper-dim transition-colors" title="Not helpful">
                <ThumbsDown size={11} strokeWidth={1.8} className="text-ink-muted" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
