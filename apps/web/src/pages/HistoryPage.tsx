import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Filter, Download } from 'lucide-react'

type AssetType = 'analysis' | 'graph' | 'slate'

interface QueryEntry {
  id: string
  timestamp: string
  query: string
  assetType: AssetType
  muted?: boolean
}

const QUERY_LOG: QueryEntry[] = [
  {
    id: '1',
    timestamp: '2023-10-24\n14:32',
    query: 'Explain the authentication flow using OAuth 2.0 with JWT implementation specifics.',
    assetType: 'analysis',
  },
  {
    id: '2',
    timestamp: '2023-10-24\n11:15',
    query: 'Generate a dependency diagram for the microservices architecture.',
    assetType: 'graph',
  },
  {
    id: '3',
    timestamp: '2023-10-23\n16:45',
    query: 'Create a foundational codebase for a React dashboard with Tailwind CSS.',
    assetType: 'slate',
  },
  {
    id: '4',
    timestamp: '2023-10-22\n09:10',
    query: 'Compare SQL vs NoSQL performance metrics for high-volume read operations.',
    assetType: 'analysis',
    muted: true,
  },
  {
    id: '5',
    timestamp: '2023-10-21\n15:20',
    query: 'Optimize Dockerfile for multi-stage Python application build.',
    assetType: 'slate',
  },
]

const assetBadge: Record<AssetType, { variant: 'blue' | 'yellow' | 'red'; label: string }> = {
  analysis: { variant: 'blue',   label: 'ANALYSIS' },
  graph:    { variant: 'yellow', label: 'GRAPH' },
  slate:    { variant: 'red',    label: 'SLATE' },
}

export function HistoryPage() {
  return (
    <AppShell topbarTitle="LEARNING LEDGER">
      <div className="h-full overflow-y-auto">
        <div className="px-8 pt-8 pb-4">
          {/* Page header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="page-title">Query Log</h1>
              <p className="font-body text-[14px] text-ink-dim mt-3 max-w-lg">
                Chronological record of exploratory sessions, asset generations, and technical inquiries.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button className="btn btn-outline gap-2">
                <Filter size={13} strokeWidth={2} />
                Filter
              </button>
              <button className="btn btn-outline gap-2">
                <Download size={13} strokeWidth={2} />
                Export
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-0 border-2 border-ink mb-8 divide-x-2 divide-ink">
            <StatCard
              label="Total Queries"
              value="1,024"
              variant="dark"
              className="border-0"
            />
            <StatCard
              label="Top Asset Generated"
              value={
                <div>
                  <span className="font-heading font-bold text-[32px] text-ink">Analysis</span>
                  <p className="font-body text-[13px] text-ink-dim font-normal mt-1">42% of all sessions</p>
                </div>
              }
              variant="yellow"
              className="border-0"
            />
            <StatCard
              label="Last Active"
              value={
                <div>
                  <span className="font-heading font-bold text-[32px] text-white">2 Hrs Ago</span>
                  <p className="font-body text-[13px] text-red-200 font-normal mt-1">Authentication Flow</p>
                </div>
              }
              variant="red"
              className="border-0"
            />
          </div>

          {/* Table */}
          <div className="border-2 border-ink">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Timestamp</th>
                  <th>Query / Subject</th>
                  <th style={{ width: '130px' }}>Asset Type</th>
                  <th style={{ width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {QUERY_LOG.map((entry) => {
                  const badge = assetBadge[entry.assetType]
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="font-mono text-[11px] text-ink-muted whitespace-pre">
                          {entry.timestamp}
                        </span>
                      </td>
                      <td>
                        <span className={`font-body text-[14px] font-medium ${entry.muted ? 'text-ink-muted' : 'text-ink'}`}>
                          {entry.query}
                        </span>
                      </td>
                      <td>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td>
                        <button
                          id={`view-entry-${entry.id}`}
                          className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent-blue hover:underline"
                        >
                          VIEW
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t-2 border-ink bg-paper">
              <span className="font-mono text-[11px] text-ink-muted uppercase tracking-widest">
                Showing 1–5 of 1,024
              </span>
              <div className="flex items-center gap-1">
                {['Prev', '1', '2', '3', 'Next'].map((label, i) => (
                  <button
                    key={i}
                    id={`pagination-${label.toLowerCase()}`}
                    className={`pagination-btn ${label === '1' ? 'active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
