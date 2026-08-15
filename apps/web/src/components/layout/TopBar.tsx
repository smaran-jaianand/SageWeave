import { Search, Mic, Settings, User } from 'lucide-react'

interface TopBarProps {
  title?: string
  breadcrumb?: string[]
}

export function TopBar({ title = 'DEVLEARNER', breadcrumb }: TopBarProps) {
  return (
    <header className="topbar flex-shrink-0">
      {/* Logo / Breadcrumb */}
      <div className="flex items-center gap-2 mr-4">
        <span className="font-heading font-bold text-[15px] tracking-tight text-ink uppercase">
          {title}
        </span>
        {breadcrumb && breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-ink-muted text-sm">›</span>
            <span className={`font-mono text-[12px] ${i === breadcrumb.length - 1 ? 'font-semibold text-ink' : 'text-ink-dim'}`}>
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1 flex items-center max-w-xs">
        <div className="relative w-full">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder="Search Repository…"
            className="search-input pl-8"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-3">
        <button
          className="w-9 h-9 flex items-center justify-center border border-ink hover:bg-paper-dim transition-colors"
          title="Voice Input"
          aria-label="Voice Input"
        >
          <Mic size={16} strokeWidth={1.8} className="text-ink" />
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center border border-ink hover:bg-paper-dim transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} strokeWidth={1.8} className="text-ink" />
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center border-2 border-ink bg-ink text-paper-bright hover:bg-ink-dim transition-colors"
          title="Profile"
          aria-label="Profile"
        >
          <User size={16} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
