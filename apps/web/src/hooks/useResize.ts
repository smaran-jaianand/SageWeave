import { useState, useRef, useEffect } from 'react'

export type ResizeDirection = 'right' | 'left' | 'up' | 'down'

/**
 * useResize — drag-to-resize hook for panels.
 * Attach the returned handleRef to a divider element.
 *
 * direction:
 *   'right' → dragging right increases size  (left panel — handle on right edge)
 *   'left'  → dragging left increases size   (right panel — handle on left edge)
 *   'up'    → dragging up increases size     (bottom panel — handle on top edge)
 *   'down'  → dragging down increases size   (top panel — handle on bottom edge)
 */
export function useResize(
  initialSize: number,
  min: number,
  max: number,
  direction: ResizeDirection = 'right',
): [number, React.RefObject<HTMLDivElement>] {
  const [size, setSize] = useState(initialSize)
  const sizeRef = useRef(initialSize)
  sizeRef.current = size

  const handleRef = useRef<HTMLDivElement>(null!)
  const dragging   = useRef(false)
  const startCoord = useRef(0)
  const startSz    = useRef(initialSize)

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    const isH = direction === 'right' || direction === 'left'

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      dragging.current = true
      startCoord.current = isH ? e.clientX : e.clientY
      startSz.current = sizeRef.current
      e.preventDefault()
      document.body.style.cursor = isH ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    }

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const coord = isH ? e.clientX : e.clientY
      const delta = coord - startCoord.current
      const grown =
        direction === 'right' || direction === 'down'
          ? startSz.current + delta
          : startSz.current - delta
      setSize(Math.max(min, Math.min(max, grown)))
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    handle.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      handle.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [min, max, direction])

  return [size, handleRef]
}
