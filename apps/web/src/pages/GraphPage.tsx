import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import {
  GraphCanvas,
  DEFAULT_GRAPH_NODES,
  DEFAULT_GRAPH_EDGES,
  GraphNodeData,
  NodeCategory,
  Language,
  Complexity,
} from '@/components/ui/GraphCanvas'
import {
  ZoomIn, ZoomOut, Maximize2, X, ChevronRight,
  Search, Filter, GitBranch, Layers,
  FileCode2, Database, Lock, Settings2, FileText, Package,
  Circle, AlertCircle, CheckCircle,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import type { Edge } from 'reactflow'

/* ── Complexity pill ───────────────────────────── */
const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string; bg: string; icon: React.FC<{size:number;strokeWidth:number;className?:string}> }> = {
  Low:    { label: 'Low',    color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle  },
  Medium: { label: 'Medium', color: '#C29F60', bg: '#FEF9C3', icon: AlertCircle  },
  High:   { label: 'High',   color: '#E63B2E', bg: '#FFE4E1', icon: Circle       },
}

const CATEGORY_LABELS: Record<NodeCategory, { icon: React.FC<{size:number;strokeWidth:number}>, label: string }> = {
  entry:    { icon: Layers,    label: 'Entry Point' },
  module:   { icon: FileCode2, label: 'Module'      },
  config:   { icon: Settings2, label: 'Config'      },
  database: { icon: Database,  label: 'Database'    },
  auth:     { icon: Lock,      label: 'Auth'        },
  util:     { icon: FileText,  label: 'Utility'     },
  test:     { icon: Package,   label: 'Test'        },
}

/* ── Edge legend ───────────────────────────────── */
const EDGE_LEGEND = [
  { color: '#1A1A1A', label: 'Import',    width: 2,   dash: false },
  { color: '#0055FF', label: 'Database',  width: 2.5, dash: false },
  { color: '#C29F60', label: 'Auth',      width: 2,   dash: false },
  { color: '#E63B2E', label: 'Test',      width: 1.5, dash: true  },
  { color: '#1A1A1A', label: 'Config',    width: 1.5, dash: true  },
]

/* ── Helpers ───────────────────────────────────── */
function blastRadius(nodeId: string, edges: Edge[]): Set<string> {
  const affected = new Set<string>([nodeId])
  // add direct deps and dependents
  edges.forEach((e) => {
    if (e.source === nodeId) affected.add(e.target)
    if (e.target === nodeId) affected.add(e.source)
  })
  return affected
}

/* ── GraphPage ─────────────────────────────────── */
export function GraphPage() {
  const [selectedId,    setSelectedId]    = useState<string | null>('api')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterCat,     setFilterCat]     = useState<NodeCategory | 'all'>('all')
  const [filterLang,    setFilterLang]    = useState<Language | 'all'>('all')
  const [filterComplex, setFilterComplex] = useState<Complexity | 'all'>('all')
  const [blastMode,     setBlastMode]     = useState(false)
  const [showFilters,   setShowFilters]   = useState(false)

  const selectedNode = useMemo(
    () => DEFAULT_GRAPH_NODES.find((n) => n.id === selectedId)?.data ?? null,
    [selectedId],
  )

  // Search-filtered node IDs
  const searchHighlight = useMemo<Set<string> | undefined>(() => {
    if (!searchQuery.trim()) return undefined
    const q = searchQuery.toLowerCase()
    const ids = new Set<string>()
    DEFAULT_GRAPH_NODES.forEach((n) => {
      if (
        n.data.label.toLowerCase().includes(q) ||
        n.data.category.toLowerCase().includes(q) ||
        n.data.folder?.toLowerCase().includes(q)
      ) ids.add(n.id)
    })
    return ids
  }, [searchQuery])

  // Blast radius highlight
  const blastHighlight = useMemo<Set<string> | undefined>(() => {
    if (!blastMode || !selectedId) return undefined
    return blastRadius(selectedId, DEFAULT_GRAPH_EDGES)
  }, [blastMode, selectedId])

  const highlightedIds = blastHighlight ?? searchHighlight

  // Stats
  const stats = useMemo(() => {
    const total = DEFAULT_GRAPH_NODES.length
    const byComplexity = { Low: 0, Medium: 0, High: 0 } as Record<Complexity, number>
    DEFAULT_GRAPH_NODES.forEach((n) => byComplexity[n.data.complexity]++)
    return { total, byComplexity, edges: DEFAULT_GRAPH_EDGES.length }
  }, [])

  const detail = selectedNode

  /* ── Render ─────────────────────────────────── */
  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">

        {/* ── LEFT: Graph canvas + toolbar ── */}
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

          {/* Topbar */}
          <div className="flex-shrink-0 border-b-2 border-ink bg-paper-bright z-20 relative">
            {/* Row 1: title + search + actions */}
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="flex items-center gap-2 mr-2">
                <GitBranch size={18} strokeWidth={1.8} className="text-ink" />
                <h1 className="font-heading font-bold text-[20px] uppercase tracking-tight text-ink">
                  Context Graph
                </h1>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] font-mono border-2 border-ink bg-paper text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent-blue"
                />
                {searchQuery && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
                    <X size={11} strokeWidth={2.5} className="text-ink-muted hover:text-ink" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {/* Blast radius toggle */}
                <button
                  title="Blast radius — highlight all nodes connected to selected"
                  onClick={() => setBlastMode((p) => !p)}
                  disabled={!selectedId}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 border-2 border-ink text-[11px] font-mono font-semibold uppercase tracking-wider
                    transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                    ${blastMode ? 'bg-accent-red text-white border-accent-red' : 'bg-paper-bright text-ink hover:bg-paper-dim'}
                  `}
                >
                  <Circle size={11} strokeWidth={2.5} />
                  Blast
                </button>

                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters((p) => !p)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 border-2 border-ink text-[11px] font-mono font-semibold uppercase tracking-wider
                    transition-colors
                    ${showFilters ? 'bg-ink text-paper-bright' : 'bg-paper-bright text-ink hover:bg-paper-dim'}
                  `}
                >
                  <Filter size={11} strokeWidth={2.5} />
                  Filters
                </button>
              </div>
            </div>

            {/* Row 2: filter chips (collapsible) */}
            {showFilters && (
              <div className="flex items-center gap-6 px-5 py-2.5 border-t border-paper-muted bg-paper animate-fadein">
                {/* Category filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mr-1">Category</span>
                  {(['all', 'entry', 'module', 'config', 'database', 'auth', 'util', 'test'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterCat(c)}
                      className={`
                        px-2 py-0.5 text-[10px] font-mono font-semibold border tracking-wider uppercase
                        ${filterCat === c ? 'bg-ink text-paper-bright border-ink' : 'bg-paper-bright text-ink border-paper-muted hover:border-ink'}
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-paper-muted" />

                {/* Complexity filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mr-1">Complexity</span>
                  {(['all', 'Low', 'Medium', 'High'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterComplex(c)}
                      className={`
                        px-2 py-0.5 text-[10px] font-mono font-semibold border tracking-wider uppercase
                        ${filterComplex === c ? 'bg-ink text-paper-bright border-ink' : 'bg-paper-bright text-ink border-paper-muted hover:border-ink'}
                      `}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-paper-muted" />

                {/* Language filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mr-1">Language</span>
                  {(['all', 'TypeScript', 'JavaScript', 'JSON', 'Python'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setFilterLang(l)}
                      className={`
                        px-2 py-0.5 text-[10px] font-mono font-semibold border tracking-wider uppercase
                        ${filterLang === l ? 'bg-ink text-paper-bright border-ink' : 'bg-paper-bright text-ink border-paper-muted hover:border-ink'}
                      `}
                    >
                      {l === 'TypeScript' ? 'TS' : l === 'JavaScript' ? 'JS' : l}
                    </button>
                  ))}
                </div>

                {/* Reset */}
                <button
                  onClick={() => { setFilterCat('all'); setFilterLang('all'); setFilterComplex('all') }}
                  className="ml-auto text-[10px] font-mono text-ink-muted underline hover:text-ink"
                >
                  Reset all
                </button>
              </div>
            )}
          </div>

          {/* Graph canvas */}
          <div className="flex-1 relative overflow-hidden">
            <GraphCanvas
              nodes={DEFAULT_GRAPH_NODES}
              edges={DEFAULT_GRAPH_EDGES}
              selectedId={selectedId ?? undefined}
              onNodeSelect={(node) => {
                setSelectedId((prev) => prev === node.id ? null : node.id)
                setBlastMode(false)
              }}
              filterCategory={filterCat}
              filterLang={filterLang}
              filterComplex={filterComplex}
              highlightedIds={highlightedIds}
            />

            {/* Edge legend overlay */}
            <div className="absolute bottom-4 left-4 bg-paper-bright border-2 border-ink p-3 z-10 shadow-hard-sm">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2 font-semibold">Edge Legend</p>
              <div className="flex flex-col gap-1.5">
                {EDGE_LEGEND.map((e) => (
                  <div key={e.label} className="flex items-center gap-2">
                    <svg width="28" height="10">
                      <line
                        x1="0" y1="5" x2="28" y2="5"
                        stroke={e.color}
                        strokeWidth={e.width}
                        strokeDasharray={e.dash ? '4 3' : undefined}
                      />
                    </svg>
                    <span className="font-mono text-[10px] text-ink-dim">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
              <div className="bg-paper-bright border-2 border-ink px-3 py-2 shadow-hard-sm">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1">Graph Stats</p>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="font-heading font-bold text-[18px] text-ink leading-none">{stats.total}</p>
                    <p className="font-mono text-[9px] text-ink-muted mt-0.5">nodes</p>
                  </div>
                  <div className="w-px h-8 bg-paper-muted" />
                  <div className="text-center">
                    <p className="font-heading font-bold text-[18px] text-ink leading-none">{stats.edges}</p>
                    <p className="font-mono text-[9px] text-ink-muted mt-0.5">edges</p>
                  </div>
                </div>
              </div>

              <div className="bg-paper-bright border-2 border-ink px-3 py-2 shadow-hard-sm">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Complexity</p>
                {(['Low', 'Medium', 'High'] as Complexity[]).map((c) => {
                  const cfg = COMPLEXITY_CONFIG[c]
                  const count = stats.byComplexity[c]
                  const pct = Math.round((count / stats.total) * 100)
                  return (
                    <div key={c} className="mb-1.5 last:mb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-[9px]" style={{ color: cfg.color }}>{c}</span>
                        <span className="font-mono text-[9px] text-ink-muted">{count}</span>
                      </div>
                      <div className="h-1.5 bg-paper-dim w-full">
                        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        <div
          className={`
            flex-shrink-0 border-l-2 border-ink bg-paper flex flex-col overflow-hidden
            transition-all duration-200
            ${detail ? 'w-[300px]' : 'w-0'}
          `}
          aria-hidden={!detail}
        >
          {detail && (
            <div className="flex flex-col h-full overflow-hidden animate-fadein w-[300px]">

              {/* Panel header */}
              <div className="flex-shrink-0 bg-accent-yellow border-b-2 border-ink px-4 py-3 flex items-start justify-between">
                <div className="min-w-0 mr-2">
                  <p className="font-heading font-bold text-[17px] text-ink uppercase tracking-tight break-all leading-tight">
                    {detail.label}
                  </p>
                  <p className="font-mono text-[10px] text-ink-dim mt-0.5">{detail.folder ?? 'src'}/</p>
                </div>
                <button
                  className="w-7 h-7 border-2 border-ink bg-paper-bright flex items-center justify-center hover:bg-paper-dim flex-shrink-0"
                  onClick={() => setSelectedId(null)}
                  title="Close"
                >
                  <X size={13} strokeWidth={2.5} className="text-ink" />
                </button>
              </div>

              {/* Category + language */}
              <div className="flex-shrink-0 border-b-2 border-ink px-4 py-3 flex items-center gap-3">
                {(() => {
                  const cfg = CATEGORY_LABELS[detail.category]
                  const Icon = cfg.icon
                  return (
                    <div className="flex items-center gap-1.5 border border-ink px-2 py-1 bg-paper-bright">
                      <Icon size={12} strokeWidth={2} />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">{cfg.label}</span>
                    </div>
                  )
                })()}
                <div className="border border-ink px-2 py-1 bg-paper-bright">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-blue">{detail.language}</span>
                </div>
              </div>

              {/* Size + Complexity */}
              <div className="flex-shrink-0 grid grid-cols-2 border-b-2 border-ink divide-x-2 divide-ink">
                <div className="p-4">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-1">Size</p>
                  <p className="font-heading font-bold text-[22px] text-ink">{detail.size}</p>
                  {detail.lines && (
                    <p className="font-mono text-[10px] text-ink-muted mt-0.5">{detail.lines} lines</p>
                  )}
                </div>
                <div className="p-4 bg-paper-dim">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-1">Complexity</p>
                  {(() => {
                    const cfg = COMPLEXITY_CONFIG[detail.complexity]
                    const Icon = cfg.icon
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <Icon size={18} strokeWidth={2} style={{ color: cfg.color }} />
                        <p className="font-heading font-bold text-[18px]" style={{ color: cfg.color }}>
                          {detail.complexity}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* Imports */}
                <div className="border-b-2 border-ink">
                  <div className="flex items-center gap-2 px-4 py-2 bg-paper-dim border-b border-paper-muted">
                    <ArrowUpRight size={13} strokeWidth={2} className="text-ink" />
                    <span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-ink">
                      Imports <span className="text-ink-muted">({detail.imports.length})</span>
                    </span>
                  </div>
                  {detail.imports.length === 0 ? (
                    <p className="font-mono text-[11px] text-ink-muted px-4 py-3">No imports</p>
                  ) : detail.imports.map((imp) => {
                    const targetNode = DEFAULT_GRAPH_NODES.find((n) => n.data.label === imp)
                    return (
                      <button
                        key={imp}
                        className="flex items-center justify-between w-full px-4 py-2.5 border-b border-paper-muted hover:bg-paper-dim text-left transition-colors"
                        onClick={() => targetNode && setSelectedId(targetNode.id)}
                      >
                        <span className="font-mono text-[11px] text-ink">{imp}</span>
                        <ChevronRight size={12} strokeWidth={2} className="text-ink-muted flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>

                {/* Imported by */}
                <div className="border-b-2 border-ink">
                  <div className="flex items-center gap-2 px-4 py-2 bg-paper-dim border-b border-paper-muted">
                    <ArrowDownLeft size={13} strokeWidth={2} className="text-ink" />
                    <span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-ink">
                      Imported By <span className="text-ink-muted">({detail.importedBy.length})</span>
                    </span>
                  </div>
                  {detail.importedBy.length === 0 ? (
                    <p className="font-mono text-[11px] text-ink-muted px-4 py-3">Not imported anywhere</p>
                  ) : detail.importedBy.map((file) => {
                    const targetNode = DEFAULT_GRAPH_NODES.find((n) => n.data.label === file)
                    return (
                      <button
                        key={file}
                        className="flex items-center justify-between w-full px-4 py-2.5 border-b border-paper-muted hover:bg-paper-dim text-left transition-colors"
                        onClick={() => targetNode && setSelectedId(targetNode.id)}
                      >
                        <span className="font-mono text-[11px] text-ink">{file}</span>
                        <ChevronRight size={12} strokeWidth={2} className="text-ink-muted flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>

                {/* Blast radius button */}
                <div className="p-4">
                  <button
                    onClick={() => setBlastMode((p) => !p)}
                    className={`
                      w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-ink
                      font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors
                      ${blastMode ? 'bg-accent-red text-white border-accent-red' : 'bg-paper-bright text-ink hover:bg-paper-dim'}
                    `}
                  >
                    <Circle size={13} strokeWidth={2.5} />
                    {blastMode ? 'Exit Blast View' : 'Blast Radius'}
                  </button>
                  <p className="font-mono text-[10px] text-ink-muted mt-2 text-center leading-relaxed">
                    Highlight all nodes directly connected to <em>{detail.label}</em>
                  </p>
                </div>

              </div>

              {/* Footer CTA */}
              <div className="flex-shrink-0 border-t-2 border-ink p-4 space-y-2">
                <button className="btn btn-primary w-full justify-center text-[11px] py-2.5">
                  Analyze File
                </button>
                <button className="btn btn-outline w-full justify-center text-[11px] py-2.5">
                  Open in Explorer
                </button>
              </div>
            </div>
          )}

          {/* Empty state hint when closed */}
          {!detail && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-mono text-[11px] text-ink-muted rotate-90 whitespace-nowrap select-none">
                ← Click a node
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
