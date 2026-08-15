import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, Download, CheckCircle, AlertCircle, Cpu,
  Zap, Star, BarChart3, ChevronDown, ChevronRight, Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OllamaModel {
  name: string
  size: number
  modified_at: string
  details?: {
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
    format?: string
  }
}

interface OllamaTagsResponse {
  models: OllamaModel[]
}

// ─── Recommendation engine ────────────────────────────────────────────────────
const MODEL_SCORES: Array<{ pattern: RegExp; score: number; label: string }> = [
  { pattern: /deepseek.coder/i,  score: 95, label: 'Best for code' },
  { pattern: /qwen2?\.5.coder/i, score: 93, label: 'Excellent coder' },
  { pattern: /qwen2?\.coder/i,   score: 90, label: 'Great coder' },
  { pattern: /codellama/i,       score: 88, label: 'Code-focused' },
  { pattern: /starcoder/i,       score: 86, label: 'Code-focused' },
  { pattern: /codegemma/i,       score: 84, label: 'Code-capable' },
  { pattern: /llama3\.[12]/i,    score: 80, label: 'Strong general' },
  { pattern: /llama3/i,          score: 78, label: 'Good general' },
  { pattern: /phi[34]/i,         score: 76, label: 'Efficient' },
  { pattern: /phi/i,             score: 70, label: 'Small & fast' },
  { pattern: /mistral/i,         score: 74, label: 'Solid general' },
  { pattern: /mixtral/i,         score: 78, label: 'Strong MoE' },
  { pattern: /gemma2/i,          score: 74, label: 'Good general' },
  { pattern: /gemma/i,           score: 68, label: 'Basic general' },
  { pattern: /qwen/i,            score: 72, label: 'Multilingual' },
  { pattern: /llama2/i,          score: 60, label: 'Older model' },
  { pattern: /tinyllama/i,       score: 42, label: 'Very small' },
  { pattern: /orca/i,            score: 62, label: 'Instruction-tuned' },
  { pattern: /vicuna/i,          score: 58, label: 'Chat-tuned' },
  { pattern: /wizard/i,          score: 63, label: 'Instruction-tuned' },
]

function getRecommendation(name: string): { score: number; label: string } {
  for (const { pattern, score, label } of MODEL_SCORES) {
    if (pattern.test(name)) return { score, label }
  }
  return { score: 58, label: 'General purpose' }
}

function scoreColor(score: number): string {
  if (score >= 88) return 'text-[#4EC9B0]'
  if (score >= 75) return 'text-accent-yellow'
  if (score >= 60) return 'text-[#CE9178]'
  return 'text-ink-muted'
}

function scoreBarColor(score: number): string {
  if (score >= 88) return 'bg-[#4EC9B0]'
  if (score >= 75) return 'bg-accent-yellow'
  if (score >= 60) return 'bg-[#CE9178]'
  return 'bg-ink-muted'
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${(bytes / 1e3).toFixed(0)} KB`
}

// ─── OllamaPanel ─────────────────────────────────────────────────────────────
interface OllamaPanelProps {
  activeModel: string | null
  onSelectModel: (name: string) => void
}

export function OllamaPanel({ activeModel, onSelectModel }: OllamaPanelProps) {
  const [models, setModels]     = useState<OllamaModel[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pullName, setPullName] = useState('')
  const [pulling, setPulling]   = useState(false)

  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(4000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: OllamaTagsResponse = await res.json()
      // Sort by recommendation score descending
      const sorted = [...data.models].sort((a, b) => {
        return getRecommendation(b.name).score - getRecommendation(a.name).score
      })
      setModels(sorted)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not reach Ollama')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchModels() }, [fetchModels])

  const handlePull = async () => {
    if (!pullName.trim()) return
    setPulling(true)
    try {
      await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullName.trim() }),
      })
      setPullName('')
      setTimeout(fetchModels, 1000)
    } catch {
      /* ignore */
    } finally {
      setPulling(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6 animate-fadein">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-ink/20 p-3 bg-paper-dim animate-pulse">
            <div className="h-3 bg-ink/10 w-3/4 mb-2" />
            <div className="h-2 bg-ink/10 w-1/2" />
          </div>
        ))}
        <p className="font-mono text-[11px] text-ink-muted text-center mt-2">
          Connecting to Ollama…
        </p>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="border-2 border-accent-red p-4 bg-[#FFCFCC]/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-accent-red flex-shrink-0" />
            <span className="font-mono text-[11px] font-semibold text-accent-red uppercase tracking-wider">
              Ollama Unreachable
            </span>
          </div>
          <p className="font-body text-[12px] text-ink-dim leading-snug mb-3">
            Cannot connect to Ollama at <code className="font-mono bg-paper-dim px-1">localhost:11434</code>.
          </p>
          <p className="font-mono text-[11px] text-ink-muted mb-3">
            Make sure Ollama is running:
          </p>
          <div className="bg-ink text-[#D4D4D4] px-3 py-2 font-mono text-[11px]">
            ollama serve
          </div>
        </div>
        <button
          onClick={fetchModels}
          className="btn btn-outline w-full justify-center text-[11px] py-2"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (models.length === 0) {
    return (
      <div className="px-4 py-6 flex flex-col gap-4">
        <div className="border border-ink/20 p-4 bg-paper-bright text-center">
          <Cpu size={24} className="text-ink-muted mx-auto mb-3" />
          <p className="font-body text-[13px] text-ink mb-1">No models installed</p>
          <p className="font-mono text-[11px] text-ink-muted">Pull a model to get started.</p>
        </div>
        <PullModelInput value={pullName} onChange={setPullName} onPull={handlePull} pulling={pulling} />
      </div>
    )
  }

  // ── Model list ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-paper-bright sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-accent-blue" />
          <span className="font-mono text-[11px] font-semibold text-ink">
            {models.length} Model{models.length !== 1 ? 's' : ''} Available
          </span>
        </div>
        <button onClick={fetchModels} className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim" title="Refresh">
          <RefreshCw size={12} className="text-ink-dim" />
        </button>
      </div>

      {/* Active model banner */}
      {activeModel && (
        <div className="mx-3 mt-3 mb-1 border-2 border-[#4EC9B0] bg-[#4EC9B0]/10 px-3 py-2 flex items-center gap-2">
          <CheckCircle size={13} className="text-[#4EC9B0] flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[#4EC9B0]">Active Model</p>
            <p className="font-mono text-[12px] font-semibold text-ink truncate">{activeModel}</p>
          </div>
        </div>
      )}

      {/* Model cards */}
      <div className="flex flex-col px-3 py-3 gap-2">
        {models.map(model => {
          const rec     = getRecommendation(model.name)
          const isActive = model.name === activeModel
          const isExp   = expanded === model.name
          return (
            <div
              key={model.name}
              className={`border-2 transition-all ${isActive ? 'border-[#4EC9B0] bg-[#4EC9B0]/5' : 'border-ink/20 bg-paper-bright hover:border-ink/50'}`}
            >
              {/* Main row */}
              <div className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(isExp ? null : model.name)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {isExp
                      ? <ChevronDown size={12} className="text-ink-muted" />
                      : <ChevronRight size={12} className="text-ink-muted" />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[12px] font-semibold text-ink truncate">
                        {model.name}
                      </span>
                      {isActive && (
                        <span className="font-mono text-[9px] bg-[#4EC9B0] text-[#1E1E1E] px-1.5 py-0.5 font-bold flex-shrink-0">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Rec label + size */}
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`font-mono text-[10px] ${scoreColor(rec.score)}`}>
                        {rec.label}
                      </span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        {formatSize(model.size)}
                      </span>
                      {model.details?.parameter_size && (
                        <span className="font-mono text-[10px] text-ink-muted">
                          {model.details.parameter_size}
                        </span>
                      )}
                    </div>

                    {/* Score bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-paper-muted">
                        <div
                          className={`h-full ${scoreBarColor(rec.score)} transition-all`}
                          style={{ width: `${rec.score}%` }}
                        />
                      </div>
                      <span className={`font-mono text-[10px] font-bold flex-shrink-0 ${scoreColor(rec.score)}`}>
                        {rec.score}%
                      </span>
                      {rec.score >= 88 && (
                        <Star size={10} className="text-[#4EC9B0] flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                  </div>

                  {/* Use button */}
                  <button
                    onClick={() => onSelectModel(model.name)}
                    disabled={isActive}
                    className={`flex-shrink-0 font-mono text-[10px] px-2.5 py-1 border-2 transition-colors
                      ${isActive
                        ? 'border-[#4EC9B0] text-[#4EC9B0] cursor-default'
                        : 'border-ink text-ink hover:bg-ink hover:text-paper-bright'
                      }`}
                  >
                    {isActive ? '✓ In use' : 'Use'}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExp && (
                <div className="border-t border-ink/10 px-4 py-3 bg-paper-dim animate-fadein">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { k: 'Family',      v: model.details?.family },
                      { k: 'Format',      v: model.details?.format },
                      { k: 'Params',      v: model.details?.parameter_size },
                      { k: 'Quantize',    v: model.details?.quantization_level },
                      { k: 'Size',        v: formatSize(model.size) },
                      { k: 'Modified',    v: new Date(model.modified_at).toLocaleDateString() },
                    ].filter(row => row.v).map(row => (
                      <div key={row.k}>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">{row.k}</p>
                        <p className="font-mono text-[11px] text-ink">{row.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pull model */}
      <div className="px-3 pb-4 mt-2 border-t border-ink/10 pt-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Pull New Model</p>
        <PullModelInput value={pullName} onChange={setPullName} onPull={handlePull} pulling={pulling} />
      </div>

      {/* Recommendation legend */}
      <div className="px-4 py-3 border-t border-ink/10 bg-paper-dim">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2 flex items-center gap-1.5">
          <BarChart3 size={10} /> Score Methodology
        </p>
        <div className="flex flex-col gap-1">
          {[
            { color: 'bg-[#4EC9B0]',      label: '88–100%', desc: 'Code-specialized' },
            { color: 'bg-accent-yellow',   label: '75–87%',  desc: 'Strong general' },
            { color: 'bg-[#CE9178]',       label: '60–74%',  desc: 'Adequate' },
            { color: 'bg-ink-muted',       label: '<60%',    desc: 'Limited for code' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 flex-shrink-0 ${r.color}`} />
              <span className="font-mono text-[10px] text-ink-dim w-14 flex-shrink-0">{r.label}</span>
              <span className="font-mono text-[10px] text-ink-muted">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PullModelInput ───────────────────────────────────────────────────────────
function PullModelInput({
  value, onChange, onPull, pulling,
}: { value: string; onChange: (v: string) => void; onPull: () => void; pulling: boolean }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onPull()}
        placeholder="e.g. qwen2.5-coder:7b"
        className="search-input flex-1 text-[11px]"
      />
      <button
        onClick={onPull}
        disabled={pulling || !value.trim()}
        className="btn btn-primary text-[10px] py-1.5 px-3 flex-shrink-0 disabled:opacity-50"
      >
        {pulling ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
        {pulling ? 'Pulling' : 'Pull'}
      </button>
    </div>
  )
}
