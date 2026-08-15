/**
 * AI Code Learner — Terminal Server
 * ══════════════════════════════════════════════════════════════════════════════
 * WebSocket server on ws://localhost:8766
 * Each connection spawns your default local shell (PowerShell on Windows,
 * bash/zsh on Unix). Input/output is piped through the socket so the
 * browser's xterm.js gets a real interactive terminal.
 *
 * Usage:
 *   cd apps/terminal-server && npm install && node index.mjs
 *
 * Protocol (JSON over WebSocket):
 *   Client → Server:  { type: 'input',  data: string }
 *                     { type: 'resize', cols: number, rows: number }
 *   Server → Client:  { type: 'output', data: string }
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { WebSocketServer } from 'ws'
import { spawn }           from 'child_process'
import os                  from 'os'
import path                from 'path'

const PORT    = 8766
const HOST    = '127.0.0.1'   // localhost-only for security
const ORIGIN  = 'http://localhost:5173'  // allow Vite dev server

// ─── Shell selection ──────────────────────────────────────────────────────────
function getShell() {
  const platform = os.platform()
  if (platform === 'win32') {
    // Prefer PowerShell 7 (pwsh) if available, fall back to Windows PowerShell
    return {
      cmd:  process.env.COMSPEC?.includes('powershell') ? process.env.COMSPEC
              : (process.env.ProgramFiles ? `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe` : null)
              ?? 'powershell.exe',
      args: ['-NoLogo', '-NoExit'],
      cwd:  process.env.USERPROFILE ?? process.cwd(),
    }
  }
  return {
    cmd:  process.env.SHELL ?? '/bin/bash',
    args: ['--login'],
    cwd:  process.env.HOME ?? process.cwd(),
  }
}

// ─── Start server ─────────────────────────────────────────────────────────────
const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
  verifyClient: ({ origin }) => {
    // Allow same-origin and localhost origins
    if (!origin) return true
    try {
      const url = new URL(origin)
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    } catch {
      return false
    }
  },
})

console.log(`\x1b[32m✓ Terminal server running on ws://${HOST}:${PORT}\x1b[0m`)
console.log(`  Waiting for browser connections…`)

let connectionCount = 0

wss.on('connection', (ws) => {
  connectionCount++
  const id = connectionCount
  console.log(`\x1b[36m→ Client #${id} connected\x1b[0m`)

  const { cmd, args, cwd } = getShell()
  console.log(`  Shell: ${cmd} ${args.join(' ')}  (cwd: ${cwd})`)

  // Spawn shell
  let shell
  try {
    shell = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
      },
      windowsHide: false,
    })
  } catch (err) {
    const msg = `\r\n\x1b[31mFailed to spawn shell: ${err.message}\x1b[0m\r\n`
    ws.send(JSON.stringify({ type: 'output', data: msg }))
    ws.close()
    return
  }

  const send = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }))
    }
  }

  shell.stdout.on('data', (chunk) => send(chunk.toString('utf8')))
  shell.stderr.on('data', (chunk) => send(chunk.toString('utf8')))

  shell.on('exit', (code, signal) => {
    send(`\r\n\x1b[33m[Process exited: code=${code ?? '—'} signal=${signal ?? '—'}]\x1b[0m\r\n`)
    if (ws.readyState === ws.OPEN) ws.close()
    console.log(`  Shell #${id} exited (code=${code})`)
  })

  shell.on('error', (err) => {
    send(`\r\n\x1b[31m[Shell error: ${err.message}]\x1b[0m\r\n`)
  })

  // Messages from browser
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    if (msg.type === 'input') {
      try { shell.stdin.write(msg.data) } catch { /* shell may have closed */ }
    }

    if (msg.type === 'resize') {
      // child_process doesn't natively support PTY resize, but we store
      // the dimensions so future implementations with node-pty can use them.
      // (node-pty: shell.resize(msg.cols, msg.rows))
    }

    if (msg.type === 'write_file') {
      // Optional: write file content to disk from the editor
      if (msg.path && typeof msg.content === 'string') {
        import('fs').then(({ writeFile }) => {
          const abs = path.isAbsolute(msg.path) ? msg.path : path.join(cwd, msg.path)
          writeFile(abs, msg.content, 'utf8', (err) => {
            if (err) send(`\r\n\x1b[31m[Write error: ${err.message}]\x1b[0m\r\n`)
            else     send(`\r\n\x1b[32m[Saved: ${abs}]\x1b[0m\r\n`)
          })
        })
      }
    }
  })

  ws.on('close', () => {
    console.log(`\x1b[33m← Client #${id} disconnected\x1b[0m`)
    try { shell.kill() } catch { /* already dead */ }
  })

  ws.on('error', (err) => {
    console.error(`  WS error (client #${id}): ${err.message}`)
  })
})

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m✗ Port ${PORT} already in use. Stop the other process first.\x1b[0m`)
  } else {
    console.error(`\x1b[31m✗ Server error: ${err.message}\x1b[0m`)
  }
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT',  () => { wss.close(); process.exit(0) })
process.on('SIGTERM', () => { wss.close(); process.exit(0) })
