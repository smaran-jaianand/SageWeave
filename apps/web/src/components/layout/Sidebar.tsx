import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  FolderOpen,
  GitFork,
  BarChart2,
  History,
  FileText,
  HelpCircle,
  Settings,
  Plus,
} from 'lucide-react'

const navItems = [
  { to: '/',          icon: LayoutGrid, label: 'Overview' },
  { to: '/explorer',  icon: FolderOpen,  label: 'Explorer' },
  { to: '/graph',     icon: GitFork,     label: 'Graph' },
  { to: '/analyses',  icon: BarChart2,   label: 'Analyses' },
  { to: '/history',   icon: History,     label: 'History' },
]

const bottomItems = [
  { to: '/settings', icon: Settings,   label: 'Settings' },
  { to: '/docs',     icon: FileText,   label: 'Docs'     },
  { to: '/help',     icon: HelpCircle, label: 'Help'     },
]

export function Sidebar() {
  return (
    <aside className="sidebar flex-shrink-0">
      {/* Project Info */}
      <div className="px-4 pt-6 pb-4 border-b-2 border-ink">
        <p className="font-mono text-[11px] font-semibold tracking-widest uppercase text-ink-muted mb-1">
          Project Alpha
        </p>
        <p className="font-mono text-[10px] tracking-widest uppercase text-ink-muted">
          V 2.1.0
        </p>
      </div>

      {/* New Analysis CTA */}
      <div className="px-4 pt-5 pb-4">
        <button className="btn btn-primary w-full justify-center">
          <Plus size={14} strokeWidth={2.5} />
          New Analysis
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom links */}
      <div className="border-t-2 border-ink mt-4">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
