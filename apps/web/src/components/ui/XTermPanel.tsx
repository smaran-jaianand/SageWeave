import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const WS_URL = 'ws://localhost:8766'

const XTERM_THEME = {
  background:   '#1E1E1E',
  foreground:   '#D4D4D4',
  cursor:       '#AEAFAD',
  cursorAccent: '#1E1E1E',
  selectionBackground: '#264F78',
  black:        '#1E1E1E', brightBlack:  '#808080',
  red:          '#F44747', brightRed:    '#F44747',
  green:        '#4EC9B0', brightGreen:  '#4EC9B0',
  yellow:       '#CE9178', brightYellow: '#DCDCAA',
  blue:         '#569CD6', brightBlue:   '#569CD6',
  magenta:      '#C586C0', brightMagenta:'#C586C0',
  cyan:         '#9CDCFE', brightCyan:   '#9CDCFE',
  white:        '#D4D4D4', brightWhite:  '#FFFFFF',
}

type Status = 'connecting' | 'connected' | 'disconnected'

export function XTermPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      theme: XTERM_THEME,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    // Try WebSocket connection
    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch {
      term.writeln('\x1b[33m⚠ Could not create WebSocket connection.\x1b[0m')
      setStatus('disconnected')
      setError('Cannot connect to terminal server.')
      return
    }

    ws.onopen = () => {
      setStatus('connected')
      setError(null)
      // Send initial resize
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }

    ws.onerror = () => {
      setStatus('disconnected')
      setError('Terminal server not running.')
      term.writeln('\r\n\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m')
      term.writeln('\x1b[33m  Terminal server not running.\x1b[0m')
      term.writeln('\x1b[2m  Start it with:\x1b[0m')
      term.writeln('\x1b[36m  node apps/terminal-server/index.mjs\x1b[0m')
      term.writeln('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n')
    }

    ws.onclose = () => {
      if (status === 'connected') {
        term.writeln('\r\n\x1b[31m[Disconnected]\x1b[0m')
      }
      setStatus('disconnected')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string)
        if (msg.type === 'output') term.write(msg.data)
      } catch {
        term.write(e.data as string)
      }
    }

    // User typing → send to shell
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // Resize observer → re-fit + notify shell
    const ro = new ResizeObserver(() => {
      try { fitAddon.fit() } catch { /* ignore */ }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      try { ws.close() } catch { /* */ }
      term.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E]">
      {/* Status ribbon */}
      {status !== 'connected' && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#333] bg-[#252526] flex-shrink-0">
          <span className="font-mono text-[11px] text-[#CE9178]">
            {status === 'connecting' ? '⟳ Connecting to terminal server…' : `✗ ${error ?? 'Disconnected'}`}
          </span>
          {status === 'disconnected' && (
            <span className="font-mono text-[10px] text-[#555]">
              ws://localhost:8766
            </span>
          )}
        </div>
      )}
      <div ref={containerRef} className="flex-1 min-h-0 px-1 pt-1" />
    </div>
  )
}
