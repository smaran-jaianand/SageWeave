import {
  FileSearch, FolderSearch, Network, Layers, BookOpen,
  ArrowRight, Clock, Star,
} from 'lucide-react'

interface QuickAction {
  id: string
  icon: typeof FileSearch
  label: string
  description: string
  intent: string
  command?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'analyze-file',
    icon: FileSearch,
    label: 'Analyze File',
    description: 'Deep analysis of any file — symbols, callers, patterns',
    intent: 'file_analysis',
    command: '/analyze <file>',
  },
  {
    id: 'analyze-folder',
    icon: FolderSearch,
    label: 'Analyze Folder',
    description: 'Roll-up summary of a directory and its entry points',
    intent: 'folder_analysis',
    command: '/analyze <folder>',
  },
  {
    id: 'project-report',
    icon: Layers,
    label: 'Project Report',
    description: 'Full architecture analysis written to .md',
    intent: 'project_analysis',
    command: '/report',
  },
  {
    id: 'context-graph',
    icon: Network,
    label: 'Open Graph',
    description: 'Visualize file + symbol dependency graph',
    intent: 'graph',
  },
  {
    id: 'docs',
    icon: BookOpen,
    label: 'Documentation',
    description: 'Import and search library documentation',
    intent: 'docs',
  },
]

const RECENT_QUERIES = [
  { id: '1', text: 'Explain the authentication flow with OAuth 2.0', time: '14:32' },
  { id: '2', text: 'Generate dependency diagram for microservices', time: '11:15' },
  { id: '3', text: 'How is error handling structured in the API?', time: 'Yesterday' },
]

interface QuickActionsPanelProps {
  onAction?: (action: QuickAction) => void
  onRecentQuery?: (query: string) => void
}

export function QuickActionsPanel({ onAction, onRecentQuery }: QuickActionsPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Quick Actions */}
      <div className="border-b border-ink/20">
        <div className="px-4 py-2.5 border-b border-ink/10">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Quick Actions
          </span>
        </div>
        {QUICK_ACTIONS.map(({ id, icon: Icon, label, description, command, ...rest }) => (
          <button
            key={id}
            id={`quick-action-${id}`}
            onClick={() => onAction?.({ id, icon: Icon, label, description, ...rest } as QuickAction)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-paper-dim
              border-b border-ink/10 last:border-0 transition-colors text-left group"
          >
            <div className="w-7 h-7 border border-ink/30 flex items-center justify-center
              group-hover:bg-accent-yellow group-hover:border-ink transition-colors flex-shrink-0 mt-0.5">
              <Icon size={13} strokeWidth={1.8} className="text-ink-dim group-hover:text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-ink uppercase tracking-wide">
                  {label}
                </span>
                {command && (
                  <span className="font-mono text-[9px] text-ink-muted border border-ink/20 px-1.5 py-0.5 bg-paper-dim flex-shrink-0">
                    {command}
                  </span>
                )}
              </div>
              <p className="font-body text-[11px] text-ink-dim mt-0.5 leading-snug">
                {description}
              </p>
            </div>
            <ArrowRight size={11} strokeWidth={2} className="text-ink-muted flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Recent queries */}
      <div>
        <div className="px-4 py-2.5 border-b border-ink/10 flex items-center gap-2">
          <Clock size={11} strokeWidth={2} className="text-ink-muted" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Recent
          </span>
        </div>
        {RECENT_QUERIES.map((q) => (
          <button
            key={q.id}
            onClick={() => onRecentQuery?.(q.text)}
            className="w-full flex items-start gap-2 px-4 py-2.5 hover:bg-paper-dim
              border-b border-ink/10 last:border-0 transition-colors text-left group"
          >
            <span className="font-mono text-[9px] text-ink-muted flex-shrink-0 mt-0.5 w-12">
              {q.time}
            </span>
            <span className="font-body text-[12px] text-ink-dim group-hover:text-ink
              transition-colors leading-snug line-clamp-2">
              {q.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
