import { useState, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ExplainRequest {
  code:      string
  lang:      string
  file:      string
  startLine: number
  endLine:   number
}

export interface ExplainMessage {
  id:          string
  request:     ExplainRequest
  explanation: string
  status:      'streaming' | 'complete' | 'error'
  timestamp:   Date
  durationMs?: number
  tokensOut?:  number
}

let msgIdx = 0
const mkId = () => `explain-${++msgIdx}-${Date.now()}`

// ─── Smart explanation generator ─────────────────────────────────────────────
// Inspects the code to produce a contextually relevant explanation.
// Replace the body of this function with a real API call (POST /api/explain → SSE).
function generateExplanation(req: ExplainRequest): string {
  const code = req.code.trim()
  const file  = req.file.split('/').pop() ?? req.file
  const lineInfo = req.startLine === req.endLine
    ? `line ${req.startLine}`
    : `lines ${req.startLine}–${req.endLine}`

  const isFunction  = /\b(function|=>\s*[\{(]|async\s+\w+\s*\()/.test(code)
  const isClass     = /\bclass\s+\w+/.test(code)
  const isImport    = /^\s*import\s+/.test(code)
  const isInterface = /\b(interface|type)\s+\w+/.test(code)
  const isLoop      = /\b(for|while|forEach|\.map\b|\.filter\b|\.reduce\b)/.test(code)
  const isError     = /\b(try|catch|throw|Error)\b/.test(code)
  const isAsync     = /\b(async|await|Promise)\b/.test(code)

  if (isImport) {
    const names  = code.match(/import\s+\{([^}]+)\}/)?.[1]?.trim() ?? 'named exports'
    const source = code.match(/from\s+['"]([^'"]+)['"]/)?.[1] ?? 'a module'
    return `**Import statement** from \`${source}\`.

This brings in \`${names}\` using ES Module **named import** syntax. Curly braces \`{ }\` mean the export name must match exactly — unlike default imports.

**Why named imports?**
- Tree-shakeable: bundlers (Vite, Webpack) drop unused symbols automatically
- Explicit: immediately visible what each dependency provides
- Combine with defaults: \`import Default, { named } from 'module'\`

**Tip:** If the import path starts with \`@/\`, it's an alias configured in \`tsconfig.json\` or \`vite.config.ts\`.`
  }

  if (isClass) {
    const className = code.match(/class\s+(\w+)/)?.[1] ?? 'this class'
    const extendee  = code.match(/extends\s+(\w+)/)?.[1]
    return `**Class definition** — \`${className}\`${extendee ? ` extends \`${extendee}\`` : ''}.

\`\`\`typescript
class ${className}${extendee ? ` extends ${extendee}` : ''} {
  // instance fields live here — unique per object
  // methods share one prototype — one copy in memory
}
\`\`\`

${extendee
  ? `Since \`${className}\` **extends** \`${extendee}\`, it inherits all public/protected members. Always call \`super()\` in the constructor to initialize the parent first.`
  : `This is a **standalone class** — no inheritance. All state is encapsulated in its own fields.`}

**TypeScript specifics:**
- \`private\` / \`protected\` are compile-time only (erased at runtime)
- \`readonly\` prevents reassignment after construction
- Methods are non-enumerable (invisible to \`Object.keys()\`)`
  }

  if (isInterface) {
    const typeName = code.match(/(?:interface|type)\s+(\w+)/)?.[1] ?? 'this type'
    return `**Type definition** — \`${typeName}\`.

This is a **compile-time contract** — TypeScript erases it completely at runtime. Any object whose shape matches \`${typeName}\` can be used wherever this type is expected (structural typing).

\`\`\`typescript
// Usage:
const obj: ${typeName} = { /* must satisfy all required fields */ }
function process(input: ${typeName}): void { ... }
\`\`\`

**Interface vs Type alias:**
| | \`interface\` | \`type\` |
|---|---|---|
| Extend | ✅ \`extends\` | ✅ \`&\` intersection |
| Union | ❌ | ✅ \`A | B\` |
| Merging | ✅ declaration merging | ❌ |

**Rule of thumb:** Use \`interface\` for object shapes you want others to extend; use \`type\` for unions and computed types.`
  }

  if (isAsync && isError) {
    return `**Async error handling** in \`${file}\` (${lineInfo}).

\`\`\`typescript
try {
  const result = await asyncOperation()
  // happy path
} catch (err) {
  // runs if the Promise rejects
  if (err instanceof Error) {
    console.error(err.message)
  }
}
\`\`\`

The \`await\` keyword **suspends** the function at that point — the event loop is free to handle other work while the Promise resolves. If it rejects, execution jumps straight to \`catch\`.

**Common pitfalls:**
- In strict TypeScript, \`err\` is typed \`unknown\` — narrow it with \`instanceof Error\` before accessing \`.message\`
- Forgetting \`await\` means rejections are silently ignored (unhandled Promise)
- For parallel async work: \`await Promise.all([a(), b()])\` — faster than sequential awaits`
  }

  if (isAsync) {
    return `**Async/await** in \`${file}\` (${lineInfo}).

The \`async\` keyword makes this function return a \`Promise\` implicitly. Inside, \`await\` pauses execution until the awaited Promise resolves.

\`\`\`typescript
// Without async/await:
function fetchData(): Promise<Data> {
  return fetch('/api').then(r => r.json())
}

// With async/await (same behavior, more readable):
async function fetchData(): Promise<Data> {
  const r = await fetch('/api')
  return r.json()
}
\`\`\`

**Execution model:** Each \`await\` yields one microtask queue slot — other code can run in between. Multiple sequential \`await\` calls run one at a time. Use \`Promise.all\` to run them in parallel.`
  }

  if (isFunction) {
    const fnName = code.match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=)/)?.[1]
      ?? code.match(/async\s+(\w+)\s*\(/)?.[1]
      ?? 'this function'
    const isArrow = code.includes('=>')
    return `**${isArrow ? 'Arrow function' : 'Function declaration'}** — \`${fnName}\` in \`${file}\` (${lineInfo}).

${isArrow
  ? '**Arrow functions** capture `this` lexically from their enclosing scope. They cannot be used as constructors (`new`) and have no `arguments` object.'
  : '**Function declarations** are hoisted — they can be called before the line they appear on in the source file.'}

\`\`\`typescript
// Signature breakdown:
${code.split('\n').slice(0, 4).map(l => l.slice(0, 70)).join('\n')}
\`\`\`

**Best practices:**
- Add explicit return types to improve readability and catch errors early
- Keep functions small and focused — the single-responsibility principle
- Prefer pure functions (same input → same output, no side effects) where possible`
  }

  if (isLoop) {
    return `**Iteration** in \`${file}\` (${lineInfo}).

\`\`\`typescript
// Common patterns:
arr.map(x => transform(x))       // transform → new array (same length)
arr.filter(x => predicate(x))    // keep matching → new array (shorter)
arr.reduce((acc, x) => ..., init)// fold → single value
for (const x of arr) { ... }     // side effects, early break allowed
\`\`\`

**Performance guide:**
| Method | Creates array | Early exit | Use when |
|--------|--------------|------------|----------|
| \`map\` | ✅ | ❌ | Transform every element |
| \`filter\` | ✅ | ❌ | Subset of elements |
| \`forEach\` | ❌ | ❌ | Side effects only |
| \`for...of\` | ❌ | ✅ \`break\` | Need early exit or side effects |
| \`reduce\` | configurable | ❌ | Aggregate into one value |`
  }

  if (isError) {
    return `**Error handling** in \`${file}\` (${lineInfo}).

\`try/catch\` establishes a **fault boundary**. Any synchronous \`throw\` inside \`try\` jumps directly to \`catch\`.

\`\`\`typescript
try {
  riskyOperation()
} catch (err) {
  // TypeScript: err is \`unknown\` in strict mode
  if (err instanceof Error) {
    console.error(err.message, err.stack)
  } else {
    console.error('Unexpected error:', err)
  }
} finally {
  cleanup() // always runs, throw or not
}
\`\`\`

**Best practices:**
- Catch **specific** error types, not a blanket \`catch (e) {}\`
- Log with context — error message alone is rarely enough for debugging
- Re-throw if you can't fully handle it: the caller may need to know`
  }

  // Generic fallback
  const lineCount = code.split('\n').length
  return `**Code block** in \`${file}\` (${lineInfo}).

This ${lineCount === 1 ? 'expression' : `${lineCount}-line block`} written in **${req.lang}** performs the following operations:

${code.split('\n').slice(0, 6).map((line, idx) => {
  const t = line.trim()
  if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return null
  const ln = req.startLine + idx
  if (/\bconst |let |var /.test(t)) return `- **Ln ${ln}** — declares \`${t.match(/(?:const|let|var)\s+(\w+)/)?.[1] ?? 'a variable'}\``
  if (t.startsWith('return '))  return `- **Ln ${ln}** — returns a value to the caller`
  if (/\bif\b/.test(t))         return `- **Ln ${ln}** — conditional branch`
  if (/\bawait\b/.test(t))      return `- **Ln ${ln}** — awaits an async operation`
  return null
}).filter(Boolean).join('\n') || '- Performs a specific operation in context'}

**To explore further:**
- Use the **Symbols** section (below) to jump to related declarations
- Select a smaller, focused piece of code for a more targeted explanation
- Ask about this in the **Chat** (Overview page) for a deeper interactive discussion`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UseCodeExplainReturn {
  history:        ExplainMessage[]
  current:        ExplainMessage | null
  isStreaming:    boolean
  explain:        (req: ExplainRequest) => Promise<void>
  clearHistory:   () => void
  dismissCurrent: () => void
}

export function useCodeExplain(): UseCodeExplainReturn {
  const [history, setHistory]    = useState<ExplainMessage[]>([])
  const [current, setCurrent]    = useState<ExplainMessage | null>(null)
  const [isStreaming, setStream] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)

  const explain = useCallback(async (req: ExplainRequest) => {
    // Cancel any in-progress explanation
    if (isStreaming) abortRef.current?.()

    const id  = mkId()
    const msg: ExplainMessage = {
      id, request: req, explanation: '', status: 'streaming', timestamp: new Date(),
    }

    setCurrent(msg)
    setHistory(prev => [msg, ...prev])
    setStream(true)

    const fullText = generateExplanation(req)
    const chars    = fullText.split('')
    let cancelled  = false
    const t0       = Date.now()

    abortRef.current = () => { cancelled = true }

    let acc = ''
    for (let i = 0; i < chars.length; i++) {
      if (cancelled) break
      acc += chars[i]
      // Batch DOM updates every 6 chars for perf
      if (i % 6 === 0 || i === chars.length - 1) {
        const snap = acc
        const upd: ExplainMessage = { ...msg, explanation: snap, status: 'streaming' }
        setCurrent(upd)
        setHistory(prev => prev.map(m => m.id === id ? upd : m))
      }
      const delay = chars[i] === '\n' ? 10 : chars[i] === ' ' ? 2 : 1
      await new Promise(r => setTimeout(r, delay))
    }

    if (!cancelled) {
      const done: ExplainMessage = {
        ...msg,
        explanation: fullText,
        status:      'complete',
        durationMs:  Date.now() - t0,
        tokensOut:   Math.ceil(fullText.length / 4),
      }
      setCurrent(done)
      setHistory(prev => prev.map(m => m.id === id ? done : m))
    }

    setStream(false)
    abortRef.current = null
  }, [isStreaming])

  const clearHistory   = useCallback(() => { setHistory([]) }, [])
  const dismissCurrent = useCallback(() => {
    abortRef.current?.()
    setCurrent(null)
    setStream(false)
  }, [])

  return { history, current, isStreaming, explain, clearHistory, dismissCurrent }
}
