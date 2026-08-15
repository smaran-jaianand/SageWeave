import { CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import type { ProviderStatus } from '@/types/chat'

// Mock provider status — will come from /api/providers/status in logic phase
const MOCK_PROVIDERS: ProviderStatus = {
  llm:         { name: 'Anthropic',    model: 'claude-sonnet-4-5', status: 'ok' },
  embedding:   { name: 'Local (MiniLM)',               status: 'ok' },
  vectorStore: { name: 'SQLite + sqlite-vec',           status: 'ok' },
  stt:         { name: 'Browser Web Speech',            status: 'ok' },
  tts:         { name: 'Browser SpeechSynthesis',       status: 'disabled' },
}

function StatusDot({ status }: { status: 'ok' | 'error' | 'checking' | 'disabled' }) {
  if (status === 'ok')       return <CheckCircle2 size={11} strokeWidth={2} className="text-green-600" />
  if (status === 'error')    return <AlertCircle  size={11} strokeWidth={2} className="text-accent-red" />
  if (status === 'checking') return <Loader2      size={11} strokeWidth={2} className="text-accent-yellow animate-spin" />
  return <span className="w-2.5 h-2.5 rounded-full bg-ink-muted/40 flex-shrink-0" />
}

interface ProviderStatusBarProps {
  providers?: ProviderStatus
  sessionTokens?: { input: number; output: number; cost?: number }
}

export function ProviderStatusBar({
  providers = MOCK_PROVIDERS,
  sessionTokens,
}: ProviderStatusBarProps) {
  return (
    <div className="flex items-center gap-0 px-4 py-2 border-t-2 border-ink bg-paper-bright divide-x divide-ink/20 overflow-x-auto">
      {/* LLM */}
      <div className="flex items-center gap-1.5 pr-3">
        <StatusDot status={providers.llm.status} />
        <span className="font-mono text-[10px] text-ink whitespace-nowrap">
          {providers.llm.name} · <span className="text-ink-muted">{providers.llm.model}</span>
        </span>
      </div>

      {/* Embeddings */}
      <div className="flex items-center gap-1.5 px-3">
        <StatusDot status={providers.embedding.status} />
        <span className="font-mono text-[10px] text-ink-dim whitespace-nowrap">
          Embed: {providers.embedding.name}
        </span>
      </div>

      {/* Vector */}
      <div className="flex items-center gap-1.5 px-3">
        <StatusDot status={providers.vectorStore.status} />
        <span className="font-mono text-[10px] text-ink-dim whitespace-nowrap">
          {providers.vectorStore.name}
        </span>
      </div>

      {/* STT */}
      <div className="flex items-center gap-1.5 px-3">
        <StatusDot status={providers.stt.status} />
        <span className="font-mono text-[10px] text-ink-dim whitespace-nowrap">
          STT: {providers.stt.name}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session tokens */}
      {sessionTokens && (
        <div className="pl-3 font-mono text-[10px] text-ink-muted whitespace-nowrap">
          Session: {sessionTokens.input.toLocaleString()} in · {sessionTokens.output.toLocaleString()} out
          {sessionTokens.cost && ` · $${sessionTokens.cost.toFixed(4)}`}
        </div>
      )}
    </div>
  )
}
