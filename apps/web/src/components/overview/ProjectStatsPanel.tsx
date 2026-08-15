import { Folder, FileCode, Layers, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { ProjectStats } from '@/types/chat'

// Mock data — will come from /api/project in logic phase
const MOCK_STATS: ProjectStats = {
  totalFiles: 1204,
  sourceLines: '45.2k',
  languages: [
    { name: 'TypeScript', pct: 68, color: '#3178c6' },
    { name: 'JavaScript', pct: 14, color: '#f7df1e' },
    { name: 'CSS',        pct: 9,  color: '#264de4' },
    { name: 'JSON',       pct: 6,  color: '#9CA3AF' },
    { name: 'Other',      pct: 3,  color: '#6B7280' },
  ],
  techStack: ['React', 'Node.js', 'Fastify', 'TypeScript', 'SQLite', 'Tailwind'],
  indexingStatus: 'complete',
  lastIndexed: '2 min ago',
}

function IndexingStatus({ status, progress, lastIndexed }: {
  status: ProjectStats['indexingStatus']
  progress?: number
  lastIndexed?: string
}) {
  const icons = {
    idle:     <RefreshCw size={12} strokeWidth={2} className="text-ink-muted" />,
    indexing: <Loader2 size={12} strokeWidth={2} className="text-accent-yellow animate-spin" />,
    complete: <CheckCircle2 size={12} strokeWidth={2} className="text-green-600" />,
    error:    <AlertCircle size={12} strokeWidth={2} className="text-accent-red" />,
  }
  const labels = {
    idle:     'Not indexed',
    indexing: `Indexing… ${progress ?? 0}%`,
    complete: `Indexed · ${lastIndexed ?? 'just now'}`,
    error:    'Index error',
  }

  return (
    <div className="flex items-center gap-1.5">
      {icons[status]}
      <span className="font-mono text-[10px] text-ink-muted">{labels[status]}</span>
    </div>
  )
}

interface ProjectStatsPanelProps {
  stats?: ProjectStats
}

export function ProjectStatsPanel({ stats = MOCK_STATS }: ProjectStatsPanelProps) {
  return (
    <div className="flex flex-col gap-0 border-b-2 border-ink bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/20">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink">
          Project Alpha
        </span>
        <IndexingStatus
          status={stats.indexingStatus}
          progress={stats.indexingProgress}
          lastIndexed={stats.lastIndexed}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-ink/20 border-b border-ink/20">
        <div className="px-3 py-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Files</span>
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-bold text-[20px] text-ink leading-none">
              {stats.totalFiles.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="px-3 py-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Lines</span>
          <span className="font-heading font-bold text-[20px] text-ink leading-none">{stats.sourceLines}</span>
        </div>
        <div className="px-3 py-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Languages</span>
          <span className="font-heading font-bold text-[20px] text-ink leading-none">{stats.languages.length}</span>
        </div>
      </div>

      {/* Language bar */}
      <div className="px-4 py-2.5 border-b border-ink/20">
        <div className="flex h-1.5 overflow-hidden gap-px">
          {stats.languages.map((lang) => (
            <div
              key={lang.name}
              title={`${lang.name} ${lang.pct}%`}
              style={{ width: `${lang.pct}%`, backgroundColor: lang.color }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {stats.languages.map((lang) => (
            <div key={lang.name} className="flex items-center gap-1">
              <span
                className="w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: lang.color }}
              />
              <span className="font-mono text-[9px] text-ink-muted">{lang.name} {lang.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack chips */}
      <div className="px-4 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Tech Stack</p>
        <div className="flex flex-wrap gap-1">
          {stats.techStack.map((tech) => (
            <span
              key={tech}
              className="font-mono text-[9px] font-semibold border border-ink/30 px-2 py-0.5 text-ink-dim bg-paper-bright"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
