import { useState, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ChatInput } from '@/components/chat/ChatInput'
import { ProjectStatsPanel } from '@/components/overview/ProjectStatsPanel'
import { ProviderStatusBar } from '@/components/overview/ProviderStatusBar'
import { QuickActionsPanel } from '@/components/overview/QuickActionsPanel'
import { OllamaPanel } from '@/components/overview/OllamaPanel'
import { useChat } from '@/hooks/useChat'
import type { CodeSelection } from '@/types/chat'
import { PanelRight, PanelLeft, X, SlidersHorizontal, Cpu } from 'lucide-react'

export function OverviewPage() {
  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } = useChat()
  const [activeSelection, setActiveSelection] = useState<CodeSelection | null>(null)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [activeRightTab, setActiveRightTab] = useState<'actions' | 'settings' | 'ollama'>('actions')
  const [activeModel, setActiveModel] = useState<string | null>(null)

  const handleSend = useCallback(
    (text: string, sel?: CodeSelection) => {
      sendMessage(text, sel ?? activeSelection ?? undefined)
    },
    [sendMessage, activeSelection]
  )

  const handleQuickAction = useCallback(
    (action: { label: string; command?: string }) => {
      const text = action.command
        ? action.command.replace(/<\w+>/, '').trim() || action.label
        : action.label
      sendMessage(text)
    },
    [sendMessage]
  )

  const handleRecentQuery = useCallback(
    (q: string) => sendMessage(q),
    [sendMessage]
  )

  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">

        {/* ── Left sidebar: Project Stats ───────────────────────────── */}
        <div className="w-[240px] flex-shrink-0 border-r-2 border-ink flex flex-col overflow-hidden">
          <ProjectStatsPanel />

          {/* Session controls */}
          {messages.length > 0 && (
            <div className="px-4 py-3 border-t border-ink/20">
              <button
                onClick={clearMessages}
                className="btn btn-outline w-full justify-center text-[10px] py-2"
              >
                <X size={11} strokeWidth={2} />
                Clear Session
              </button>
            </div>
          )}
        </div>

        {/* ── Center: Chat area ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b-2 border-ink bg-paper flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-heading font-bold text-[16px] uppercase tracking-tight text-ink">
                Chat
              </span>
              {isStreaming && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent-yellow rounded-full animate-ping" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Streaming…
                  </span>
                </div>
              )}
              {messages.length > 0 && !isStreaming && (
                <span className="font-mono text-[10px] text-ink-muted">
                  {messages.filter(m => m.role === 'user').length} question{messages.filter(m => m.role === 'user').length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                id="toggle-right-panel"
                onClick={() => setRightPanelOpen((v) => !v)}
                className="w-8 h-8 border border-ink/30 flex items-center justify-center hover:bg-paper-dim transition-colors"
                title={rightPanelOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {rightPanelOpen
                  ? <PanelRight size={14} strokeWidth={1.8} className="text-ink-dim" />
                  : <PanelLeft  size={14} strokeWidth={1.8} className="text-ink-dim" />
                }
              </button>
            </div>
          </div>

          {/* Messages */}
          <ChatPanel messages={messages} isStreaming={isStreaming} />

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            activeSelection={activeSelection}
            onClearSelection={() => setActiveSelection(null)}
          />

          {/* Provider status bar */}
          <ProviderStatusBar />
        </div>

        {/* ── Right panel: Quick actions + settings ─────────────────── */}
        {rightPanelOpen && (
          <div className="w-[260px] flex-shrink-0 border-l-2 border-ink flex flex-col overflow-hidden animate-fadein">
            {/* Tab bar */}
            <div className="flex border-b-2 border-ink flex-shrink-0">
              {([
                { id: 'actions',    icon: <PanelRight size={11} strokeWidth={2} />,        label: 'Actions'    },
                { id: 'settings',   icon: <SlidersHorizontal size={11} strokeWidth={2} />, label: 'Settings'   },
                { id: 'ollama',     icon: <Cpu size={11} strokeWidth={2} />,               label: 'Local LLMs' },
              ] as const).map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveRightTab(id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1 py-2.5
                    font-mono text-[10px] font-semibold uppercase tracking-widest
                    border-r last:border-r-0 border-ink/30 transition-colors
                    ${activeRightTab === id
                      ? 'bg-accent-yellow text-ink'
                      : 'bg-paper text-ink-muted hover:bg-paper-dim'
                    }
                  `}
                >
                  {icon} {label}
                  {id === 'ollama' && activeModel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4EC9B0] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {activeRightTab === 'actions' && (
              <QuickActionsPanel
                onAction={handleQuickAction}
                onRecentQuery={handleRecentQuery}
              />
            )}

            {activeRightTab === 'settings' && (
              <SettingsStub activeModel={activeModel} />
            )}

            {activeRightTab === 'ollama' && (
              <div className="flex-1 overflow-y-auto">
                <OllamaPanel
                  activeModel={activeModel}
                  onSelectModel={(name) => {
                    setActiveModel(name)
                    setActiveRightTab('settings')
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// Settings stub — will be expanded in later phase
function SettingsStub({ activeModel }: { activeModel: string | null }) {
  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {/* Audience preset */}
      <div className="px-4 py-4 border-b border-ink/20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          Audience
        </p>
        <div className="flex flex-col gap-1">
          {(['Junior', 'Mid-level', 'Senior', 'Expert'] as const).map((level) => (
            <button
              key={level}
              className={`
                flex items-center gap-2 px-3 py-2 text-left border transition-colors
                font-mono text-[11px]
                ${level === 'Mid-level'
                  ? 'border-ink bg-ink text-paper-bright'
                  : 'border-ink/30 text-ink-dim hover:bg-paper-dim hover:border-ink'
                }
              `}
            >
              {level === 'Mid-level' && (
                <span className="w-1.5 h-1.5 bg-accent-yellow flex-shrink-0" />
              )}
              {level !== 'Mid-level' && (
                <span className="w-1.5 h-1.5 border border-ink/40 flex-shrink-0" />
              )}
              {level}
            </button>
          ))}
        </div>
        <p className="font-body text-[11px] text-ink-muted mt-2 leading-snug">
          Adjusts explanation depth and assumed knowledge level.
        </p>
      </div>

      {/* LLM Model */}
      <div className="px-4 py-4 border-b border-ink/20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          AI Model
        </p>
        <div className="border border-ink/30 bg-paper-bright">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div>
              <p className="font-mono text-[11px] font-semibold text-ink">claude-sonnet-4-5</p>
              <p className="font-mono text-[9px] text-ink-muted mt-0.5">Anthropic · Primary</p>
            </div>
            <span className="font-mono text-[9px] border border-ink/30 px-1.5 py-0.5 text-ink-dim">
              Active
            </span>
          </div>
        </div>
        {activeModel ? (
          <div className="border border-[#4EC9B0]/50 bg-[#4EC9B0]/5 mt-2">
            <div className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="font-mono text-[11px] font-semibold text-ink truncate max-w-[140px]">{activeModel}</p>
                <p className="font-mono text-[9px] text-[#4EC9B0] mt-0.5">Ollama · Fallback</p>
              </div>
              <span className="font-mono text-[9px] border border-[#4EC9B0]/50 text-[#4EC9B0] px-1.5 py-0.5 flex-shrink-0">
                Set
              </span>
            </div>
          </div>
        ) : (
          <p className="font-body text-[11px] text-ink-muted mt-2 leading-snug">
            Fallback: Ollama (localhost:11434) — <span className="text-accent-yellow">not configured</span>
          </p>
        )}
      </div>


      {/* Voice */}
      <div className="px-4 py-4 border-b border-ink/20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          Voice
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-ink">STT</span>
            <span className="font-mono text-[10px] border border-ink/30 px-1.5 py-0.5 text-ink-dim">Browser</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-ink">TTS</span>
            <span className="font-mono text-[10px] border border-ink/30 px-1.5 py-0.5 text-ink-dim opacity-40">Disabled</span>
          </div>
        </div>
        <button className="btn btn-outline w-full justify-center text-[10px] py-2 mt-3">
          Open Voice Settings
        </button>
      </div>

      {/* Privacy */}
      <div className="px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
          Privacy
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Source code',    value: 'Local ✓' },
            { label: 'Embeddings',     value: 'Local ✓' },
            { label: 'Vector store',   value: 'Local ✓' },
            { label: 'LLM',            value: 'Anthropic ⚠' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-dim">{label}</span>
              <span className={`font-mono text-[10px] font-semibold ${value.includes('⚠') ? 'text-accent-red' : 'text-green-700'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
