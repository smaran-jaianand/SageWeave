import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '@/types/chat'
import { Bot, Sparkles } from 'lucide-react'

interface ChatPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 py-16 text-center">
      <div className="w-16 h-16 bg-accent-yellow border-2 border-ink flex items-center justify-center shadow-hard">
        <Bot size={28} strokeWidth={1.5} className="text-ink" />
      </div>
      <div>
        <h2 className="font-heading font-bold text-[22px] text-ink mb-2">
          Ask About Your Codebase
        </h2>
        <p className="font-body text-[14px] text-ink-dim max-w-sm leading-relaxed">
          Select code in the editor and ask a question, or type freely about any
          aspect of the project. The AI learns from your actual code.
        </p>
      </div>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {[
          'Explain selected code',
          'Trace function calls',
          'Understand architecture',
          'Analyze file structure',
          'Find dependencies',
          'Explain patterns',
        ].map((cap) => (
          <span
            key={cap}
            className="font-mono text-[10px] font-semibold uppercase tracking-widest
              border border-ink/30 bg-paper-bright px-2.5 py-1 text-ink-dim"
          >
            {cap}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ChatPanel({ messages, isStreaming }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content?.length])

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6 px-6 py-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.status === 'streaming'}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
