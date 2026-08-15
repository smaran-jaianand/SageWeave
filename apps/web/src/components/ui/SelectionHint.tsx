import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'

interface SelectionHintProps {
  x: number
  y: number
  lineCount: number
  onExplain: () => void
  onDismiss: () => void
}

/**
 * Floating "Explain" button that appears near the user's text selection.
 * Fixed-position so it works regardless of scroll.
 */
export function SelectionHint({ x, y, lineCount, onExplain, onDismiss }: SelectionHintProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Dismiss when clicking elsewhere
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    // Delay so the mouseup that triggered this doesn't immediately close it
    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 80)
    return () => { clearTimeout(t); window.removeEventListener('mousedown', onDown) }
  }, [onDismiss])

  // Clamp to viewport
  const MARGIN = 8
  const W = 140
  const H = 36
  const clampedX = Math.min(Math.max(x - W / 2, MARGIN), window.innerWidth - W - MARGIN)
  const clampedY = Math.max(y - H - 10, MARGIN)

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: clampedX, top: clampedY, zIndex: 9999 }}
      className="animate-fadein"
    >
      <button
        id="selection-hint-explain-btn"
        onClick={(e) => { e.stopPropagation(); onExplain() }}
        className="
          flex items-center gap-1.5 px-3 py-1.5
          bg-ink text-paper-bright border-2 border-ink
          font-mono text-[11px] font-semibold
          shadow-hard hover:bg-accent-blue hover:border-accent-blue
          transition-all duration-100 select-none whitespace-nowrap
        "
      >
        <Sparkles size={11} className="text-accent-yellow flex-shrink-0" />
        Explain
        {lineCount > 1 && (
          <span className="text-[9px] opacity-60 font-normal ml-0.5">
            {lineCount}L
          </span>
        )}
      </button>
    </div>
  )
}
