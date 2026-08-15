import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Mic, MicOff, Send, Square, Paperclip, Code2, Zap } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import type { CodeSelection } from '@/types/chat'

interface ChatInputProps {
  onSend: (text: string, selection?: CodeSelection) => void
  onStop: () => void
  isStreaming: boolean
  interimVoiceText?: string
  activeSelection?: CodeSelection | null
  onClearSelection?: () => void
  disabled?: boolean
  placeholder?: string
}

const QUICK_PROMPTS = [
  { icon: Zap,   label: 'Explain the main entry point' },
  { icon: Code2, label: 'How is authentication handled?' },
  { icon: Zap,   label: 'What are the core data models?' },
  { icon: Code2, label: 'Trace the API request lifecycle' },
]

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  activeSelection,
  onClearSelection,
  disabled = false,
  placeholder = 'Ask a question about the codebase… (Enter to send, Shift+Enter for newline)',
}: ChatInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showQuick, setShowQuick] = useState(true)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [text])

  const { state: voiceState, interimText, isSupported, startListening } = useVoice({
    onTranscript: (t) => {
      setText((prev) => prev ? `${prev} ${t}` : t)
      textareaRef.current?.focus()
    },
  })

  const handleSend = () => {
    const trimmed = text.trim() || interimText.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed, activeSelection ?? undefined)
    setText('')
    setShowQuick(false)
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && isStreaming) {
      onStop()
    }
  }

  const displayValue = voiceState === 'listening' ? interimText : text

  return (
    <div className="border-t-2 border-ink bg-paper">
      {/* Active selection indicator */}
      {activeSelection && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-ink/30 bg-paper-dim">
          <Code2 size={12} strokeWidth={2} className="text-accent-blue flex-shrink-0" />
          <span className="font-mono text-[11px] text-accent-blue font-semibold">
            {activeSelection.file}:{activeSelection.startLine}–{activeSelection.endLine}
          </span>
          <span className="font-mono text-[10px] text-ink-muted flex-1 truncate">
            — asking in context of selection
          </span>
          <button
            onClick={onClearSelection}
            className="font-mono text-[10px] text-ink-muted hover:text-ink uppercase tracking-widest"
          >
            ✕ clear
          </button>
        </div>
      )}

      {/* Quick prompts (shown before first message) */}
      {showQuick && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink/20 overflow-x-auto">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted flex-shrink-0 mr-1">
            Try:
          </span>
          {QUICK_PROMPTS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => {
                setText(label)
                setShowQuick(false)
                textareaRef.current?.focus()
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-ink/30 hover:border-ink
                font-mono text-[10px] text-ink-dim hover:text-ink hover:bg-paper-dim
                transition-colors flex-shrink-0 whitespace-nowrap"
            >
              <Icon size={10} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-0">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={displayValue}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              voiceState === 'listening'
                ? 'Listening…'
                : voiceState === 'processing'
                ? 'Processing voice…'
                : placeholder
            }
            disabled={disabled || voiceState === 'processing'}
            rows={1}
            className={`
              w-full px-4 py-3.5 resize-none outline-none
              font-body text-[14px] text-ink placeholder:text-ink-muted
              bg-paper border-0
              transition-colors
              ${voiceState === 'listening' ? 'bg-accent-yellow/10 placeholder:text-ink' : ''}
            `}
            style={{ minHeight: '52px', maxHeight: '200px' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-end border-l-2 border-ink">
          {/* Voice button */}
          <button
            id="voice-btn"
            onClick={startListening}
            disabled={!isSupported || disabled}
            title={
              !isSupported
                ? 'Voice not supported in this browser'
                : voiceState === 'listening'
                ? 'Stop listening (click or speak again)'
                : 'Push-to-talk (Web Speech API)'
            }
            className={`
              w-[52px] h-[52px] flex items-center justify-center
              border-r border-ink/20 transition-colors
              ${voiceState === 'listening'
                ? 'bg-accent-yellow text-ink animate-pulse'
                : !isSupported
                ? 'opacity-40 cursor-not-allowed bg-paper'
                : 'bg-paper text-ink-dim hover:bg-paper-dim hover:text-ink'
              }
            `}
          >
            {voiceState === 'listening'
              ? <MicOff size={18} strokeWidth={2} />
              : <Mic size={18} strokeWidth={1.8} />
            }
          </button>

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              id="stop-btn"
              onClick={onStop}
              title="Stop streaming (Esc)"
              className="w-[52px] h-[52px] flex items-center justify-center bg-accent-red text-white hover:bg-red-700 transition-colors"
            >
              <Square size={16} strokeWidth={2} fill="currentColor" />
            </button>
          ) : (
            <button
              id="send-btn"
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              title="Send message (Enter)"
              className={`
                w-[52px] h-[52px] flex items-center justify-center transition-colors
                ${text.trim()
                  ? 'bg-ink text-paper-bright hover:bg-ink-dim cursor-pointer'
                  : 'bg-paper text-ink-muted cursor-not-allowed'
                }
              `}
            >
              <Send size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-1.5 border-t border-ink/10 flex items-center gap-4">
        <span className="font-mono text-[9px] text-ink-muted tracking-wider">
          Enter to send · Shift+Enter for newline · Esc to stop
        </span>
        <span className="font-mono text-[9px] text-ink-muted ml-auto">
          claude-sonnet-4-5 · Anthropic
        </span>
      </div>
    </div>
  )
}
