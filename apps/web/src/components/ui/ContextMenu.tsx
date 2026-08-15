import { useEffect, useRef, useCallback } from 'react'
import type React from 'react'

interface ContextMenuProps {
  x: number
  y: number
  items: Array<
    | { label: string; icon?: React.ReactNode; shortcut?: string; danger?: boolean; onClick: () => void }
    | { separator: true }
  >
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  // Clamp to viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 180),
    zIndex: 9999,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="bg-paper-bright border-2 border-ink shadow-hard min-w-[160px] py-1 animate-fadein"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <div key={i} className="my-1 border-t border-paper-muted" />
        }
        return (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose() }}
            className={`
              w-full flex items-center justify-between gap-3 px-3 py-1.5
              font-mono text-[11px] text-left transition-colors
              ${item.danger
                ? 'text-accent-red hover:bg-accent-red hover:text-white'
                : 'text-ink hover:bg-ink hover:text-paper-bright'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {item.icon && <span className="w-4 flex-shrink-0">{item.icon}</span>}
              {item.label}
            </span>
            {item.shortcut && (
              <span className="text-[10px] opacity-50">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
