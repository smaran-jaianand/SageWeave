import {
  useState, useRef, useEffect, useCallback, useMemo,
  type KeyboardEvent as ReactKBEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FileTree, type FileTreeNode } from '@/components/ui/FileTree'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { XTermPanel } from '@/components/ui/XTermPanel'
import { SelectionHint } from '@/components/ui/SelectionHint'
import { AIExplainPanel } from '@/components/ui/AIExplainPanel'
import { useResize } from '@/hooks/useResize'
import { useCodeExplain } from '@/hooks/useCodeExplain'
import type { ExplainMessage } from '@/hooks/useCodeExplain'
import {
  RefreshCw, X, GitBranch, Terminal, AlertCircle,
  Search, ChevronRight, ArrowRight, Lock, Box, Braces,
  Hash, AlignLeft, CheckCircle, Info, PanelRight, PanelBottom,
  Save, Trash2, FilePlus, FolderPlus, Edit3, SplitSquareHorizontal,
  Sparkles,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'const' | 'export'
interface CodeSymbol { name: string; kind: SymbolKind; line: number; exported: boolean }
interface ImportEntry { name: string; from: string }
interface InspectorData {
  gitStatus: 'modified' | 'untracked' | 'clean'
  complexity: number
  coverage: number
  imports: ImportEntry[]
  symbols: CodeSymbol[]
  problems: { msg: string; line: number; severity: 'error' | 'warn' }[]
}

// ─── Syntax highlighter ───────────────────────────────────────────────────────
const KEYWORDS = new Set([
  'const','let','var','function','class','import','export','from','return',
  'if','else','for','while','try','catch','throw','new','this','type',
  'interface','async','await','void','null','undefined','true','false','in',
  'of','default','extends','implements','readonly','private','public',
  'protected','static','abstract','declare','namespace','enum','as',
  'typeof','instanceof','break','continue','switch','case','do','delete',
])

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function highlightCode(code: string, lang: string): string {
  if (lang === 'JSON') {
    return escHtml(code)
      .replace(/"(?:[^"\\]|\\.)*"/g, m => `<span class="code-str">${m}</span>`)
      .replace(/\b(true|false|null)\b/g, m => `<span class="code-kw">${m}</span>`)
      .replace(/\b\d+\.?\d*\b/g, m => `<span class="code-num">${m}</span>`)
  }
  if (lang === 'Markdown') return escHtml(code)

  // TypeScript / JS — character-level tokenizer
  const out: string[] = []
  let i = 0
  while (i < code.length) {
    // Line comment
    if (code[i] === '/' && code[i+1] === '/') {
      const end = code.indexOf('\n', i)
      const chunk = end === -1 ? code.slice(i) : code.slice(i, end)
      out.push(`<span class="code-cmt">${escHtml(chunk)}</span>`)
      i = end === -1 ? code.length : end
      continue
    }
    // Block comment
    if (code[i] === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i + 2)
      const chunk = end === -1 ? code.slice(i) : code.slice(i, end + 2)
      out.push(`<span class="code-cmt">${escHtml(chunk)}</span>`)
      i = end === -1 ? code.length : end + 2
      continue
    }
    // String literals
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i]; let j = i + 1
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue }
        if (code[j] === q) { j++; break }
        j++
      }
      out.push(`<span class="code-str">${escHtml(code.slice(i, j))}</span>`)
      i = j; continue
    }
    // Hex number
    if (code[i] === '0' && code[i+1] === 'x') {
      let j = i + 2
      while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++
      out.push(`<span class="code-num">${escHtml(code.slice(i, j))}</span>`)
      i = j; continue
    }
    // Decimal number (only if preceded by non-identifier char)
    if (/\d/.test(code[i]) && (i === 0 || !/[a-zA-Z_$]/.test(code[i-1]))) {
      let j = i
      while (j < code.length && /[\d.]/.test(code[j])) j++
      out.push(`<span class="code-num">${escHtml(code.slice(i, j))}</span>`)
      i = j; continue
    }
    // Identifier
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++
      const word = code.slice(i, j)
      if (KEYWORDS.has(word)) {
        out.push(`<span class="code-kw">${escHtml(word)}</span>`)
      } else if (/^[A-Z]/.test(word)) {
        out.push(`<span class="code-type">${escHtml(word)}</span>`)
      } else {
        // Function if followed by (
        let k = j
        while (k < code.length && code[k] === ' ') k++
        if (code[k] === '(') out.push(`<span class="code-fn">${escHtml(word)}</span>`)
        else out.push(escHtml(word))
      }
      i = j; continue
    }
    out.push(escHtml(code[i]))
    i++
  }
  return out.join('')
}

// ─── Initial file tree ────────────────────────────────────────────────────────
const INITIAL_TREE: FileTreeNode[] = [
  {
    id: 'src', name: 'src', type: 'folder', children: [
      { id: 'src/config.ts',  name: 'config.ts',  type: 'file' },
      { id: 'src/main.ts',    name: 'main.ts',    type: 'file' },
      {
        id: 'src/utils', name: 'utils', type: 'folder', children: [
          { id: 'src/utils/hash.ts',   name: 'hash.ts',   type: 'file' },
          { id: 'src/utils/format.ts', name: 'format.ts', type: 'file' },
          { id: 'src/utils/logger.ts', name: 'logger.ts', type: 'file' },
        ],
      },
      {
        id: 'src/core', name: 'core', type: 'folder', children: [
          { id: 'src/core/system.ts',    name: 'system.ts',    type: 'file' },
          { id: 'src/core/scheduler.ts', name: 'scheduler.ts', type: 'file' },
          { id: 'src/core/event-bus.ts', name: 'event-bus.ts', type: 'file' },
        ],
      },
      {
        id: 'src/engine', name: 'engine', type: 'folder', children: [
          { id: 'src/engine/graphics.ts', name: 'graphics.ts', type: 'file' },
          { id: 'src/engine/physics.ts',  name: 'physics.ts',  type: 'file' },
        ],
      },
      {
        id: 'src/components', name: 'components', type: 'folder', children: [
          { id: 'src/components/App.tsx',   name: 'App.tsx',   type: 'file' },
          { id: 'src/components/Shell.tsx', name: 'Shell.tsx', type: 'file' },
        ],
      },
      { id: 'src/types.ts', name: 'types.ts', type: 'file' },
    ],
  },
  {
    id: 'tests', name: 'tests', type: 'folder', children: [
      { id: 'tests/scanner.test.ts', name: 'scanner.test.ts', type: 'file' },
      { id: 'tests/system.test.ts',  name: 'system.test.ts',  type: 'file' },
    ],
  },
  { id: 'package.json',  name: 'package.json',  type: 'file' },
  { id: 'tsconfig.json', name: 'tsconfig.json', type: 'file' },
  { id: 'README.md',     name: 'README.md',     type: 'file' },
]

// ─── Initial file contents ────────────────────────────────────────────────────
const INITIAL_CONTENTS: Record<string, string> = {
  'src/main.ts': `
import { initSystem } from './core/system';
import { GraphicEngine } from './engine/graphics';
import type { SystemConfig } from './types';

/**
 * Main application entry point
 * Initializes core services and mounts primary UI
 */
const config: SystemConfig = {
  mode: 'strict',
  theme: 'neo-brutal',
  debug: true,
};


export async function bootstrap() {
  try {
    // Initialize the graphic engine first
    const engine = new GraphicEngine(config);
    await engine.init();

    // Boot core systems
    initSystem({
      engine,
      ready: () => console.log('System Armed.'),
    });
  } catch (err) {
    console.error('BOOTSTRAP FAILED:', err);
  }
}

// Auto-boot on load
bootstrap().catch(console.error);
`.trimStart(),

  'src/config.ts': `import type { DeepPartial } from './types';

/** Global config defaults */
export const DEFAULT_CONFIG = {
  env: process.env.NODE_ENV ?? 'development',
  port: 8765,
  logLevel: 'info',
  maxRetries: 3,
} as const;

export function mergeConfig<T>(base: T, override: DeepPartial<T>): T {
  return { ...base, ...override };
}
`,

  'src/types.ts': `/** System configuration shape */
export interface SystemConfig {
  mode: 'strict' | 'permissive';
  theme: string;
  debug: boolean;
}

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type EventMap = Record<string, unknown[]>;
`,

  'src/core/system.ts': `import { EventBus } from './event-bus';
import { Scheduler } from './scheduler';
import type { SystemConfig } from '../types';

interface SystemOptions {
  engine: unknown;
  ready?: () => void;
}

export function initSystem(opts: SystemOptions): void {
  const bus = new EventBus();
  const scheduler = new Scheduler(bus);

  scheduler.start();
  opts.ready?.();
}
`,

  'src/engine/graphics.ts': `import type { SystemConfig } from '../types';

/**
 * WebGL-backed graphic engine.
 * Manages render loop, shader programs, and scene graph.
 */
export class GraphicEngine {
  private config: SystemConfig;
  private gl: WebGLRenderingContext | null = null;
  private running = false;

  constructor(config: SystemConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const canvas = document.createElement('canvas');
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) throw new Error('WebGL2 not available');
    this.running = true;
  }

  render(scene: unknown): void {
    if (!this.running) return;
    // TODO: implement scene graph traversal
  }

  destroy(): void {
    this.running = false;
    this.gl = null;
  }
}
`,

  'src/utils/hash.ts': `/** Fast non-cryptographic hash (FNV-1a) */
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (const char of str) {
    hash ^= char.charCodeAt(0);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export function hashFile(content: string): string {
  return fnv1a(content).toString(16).padStart(8, '0');
}
`,

  'src/utils/format.ts': `export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return \`\${bytes.toFixed(1)} \${units[i]}\`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
`,

  'src/utils/logger.ts': `type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix: string, level: LogLevel = 'info') {
    this.prefix = prefix;
    this.level = level;
  }

  info(msg: string, ...args: unknown[]): void {
    console.log(\`[\${this.prefix}] \${msg}\`, ...args);
  }

  warn(msg: string, ...args: unknown[]): void {
    console.warn(\`[\${this.prefix}] \${msg}\`, ...args);
  }

  error(msg: string, ...args: unknown[]): void {
    console.error(\`[\${this.prefix}] \${msg}\`, ...args);
  }
}
`,

  'package.json': `{
  "name": "project-alpha",
  "version": "2.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "typescript": "^5.5.0"
  }
}
`,

  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
`,

  'README.md': `# Project Alpha

A high-performance application built with TypeScript.

## Getting Started

\`\`\`bash
pnpm install
pnpm run dev
\`\`\`

## Architecture

The project uses a layered architecture:
- \`core/\` — Event bus, scheduler, system bootstrap
- \`engine/\` — WebGL graphics engine
- \`utils/\` — Shared utilities (hashing, formatting, logging)
`,

  'tests/scanner.test.ts': `import { describe, it, expect } from 'vitest';
import { fnv1a } from '../src/utils/hash';

describe('fnv1a', () => {
  it('returns consistent hash for same input', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
  });

  it('returns different hash for different inputs', () => {
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
  });
});
`,

  'src/core/scheduler.ts': `import type { EventBus } from './event-bus';

export class Scheduler {
  private bus: EventBus;
  private running = false;
  private frame: number | null = null;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  start(): void {
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }
  }

  private tick(): void {
    if (!this.running) return;
    this.frame = requestAnimationFrame(() => this.tick());
  }
}
`,

  'src/core/event-bus.ts': `type Handler<T = unknown[]> = (...args: T extends unknown[] ? T : never) => void;

export class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(h => h(...args));
  }
}
`,
}

// ─── Inspector data per file ──────────────────────────────────────────────────
const INSPECTOR_MAP: Record<string, InspectorData> = {
  'src/main.ts': {
    gitStatus: 'modified', complexity: 78, coverage: 85,
    imports: [
      { name: 'initSystem', from: './core/system' },
      { name: 'GraphicEngine', from: './engine/graphics' },
      { name: 'SystemConfig', from: './types' },
    ],
    symbols: [
      { name: 'config', kind: 'const', line: 9, exported: false },
      { name: 'bootstrap', kind: 'function', line: 16, exported: true },
    ],
    problems: [],
  },
  'src/engine/graphics.ts': {
    gitStatus: 'modified', complexity: 61, coverage: 52,
    imports: [{ name: 'SystemConfig', from: '../types' }],
    symbols: [{ name: 'GraphicEngine', kind: 'class', line: 7, exported: true }],
    problems: [
      { msg: "render(): 'scene' typed 'unknown'. Prefer a concrete Scene type.", line: 24, severity: 'warn' },
      { msg: 'TODO comment left in production code.', line: 26, severity: 'warn' },
    ],
  },
  'src/core/system.ts': {
    gitStatus: 'clean', complexity: 34, coverage: 77,
    imports: [
      { name: 'EventBus', from: './event-bus' },
      { name: 'Scheduler', from: './scheduler' },
    ],
    symbols: [
      { name: 'SystemOptions', kind: 'interface', line: 5, exported: false },
      { name: 'initSystem', kind: 'function', line: 10, exported: true },
    ],
    problems: [],
  },
  default: {
    gitStatus: 'clean', complexity: 18, coverage: 90,
    imports: [], symbols: [], problems: [],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fileLabel(id: string) { return id.split('/').pop() ?? id }

function getLang(id: string) {
  if (id.endsWith('.ts') || id.endsWith('.tsx')) return 'TypeScript'
  if (id.endsWith('.json')) return 'JSON'
  if (id.endsWith('.md'))   return 'Markdown'
  return 'TypeScript'
}

function fileSize(content: string) {
  const bytes = new TextEncoder().encode(content).length
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

function kindIcon(kind: SymbolKind) {
  switch (kind) {
    case 'function':  return <span className="text-[#DCDCAA] font-bold font-mono text-[11px]">ƒ</span>
    case 'class':     return <Box size={11} className="text-[#4EC9B0]" />
    case 'interface': return <Braces size={11} className="text-[#569CD6]" />
    case 'type':      return <Hash size={11} className="text-[#9CDCFE]" />
    case 'const':     return <Lock size={11} className="text-[#CE9178]" />
    case 'export':    return <span className="text-[#4EC9B0] font-mono text-[10px]">E</span>
  }
}

// Insert/delete node in tree (immutable helpers)
function insertNode(tree: FileTreeNode[], parentId: string | null, node: FileTreeNode): FileTreeNode[] {
  if (!parentId) return [...tree, node]
  return tree.map(n => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), node] }
    if (n.children) return { ...n, children: insertNode(n.children, parentId, node) }
    return n
  })
}

function deleteNode(tree: FileTreeNode[], id: string): FileTreeNode[] {
  return tree
    .filter(n => n.id !== id)
    .map(n => n.children ? { ...n, children: deleteNode(n.children, id) } : n)
}

function renameNode(tree: FileTreeNode[], id: string, newName: string, newId: string): FileTreeNode[] {
  return tree.map(n => {
    if (n.id === id) return { ...n, name: newName, id: newId }
    if (n.children) return { ...n, children: renameNode(n.children, id, newName, newId) }
    return n
  })
}

function findParentId(tree: FileTreeNode[], childId: string): string | null {
  for (const n of tree) {
    if (n.children?.some(c => c.id === childId)) return n.id
    if (n.children) {
      const found = findParentId(n.children, childId)
      if (found) return found
    }
  }
  return null
}

// ─── Selection position helper ───────────────────────────────────────────────
interface SelectionState {
  text: string
  startLine: number
  endLine: number
  hintX: number   // viewport X for hint button
  hintY: number   // viewport Y for hint button
}

// ─── CodeEditor component ─────────────────────────────────────────────────────
interface CodeEditorProps {
  content: string
  lang: string
  onChange: (v: string) => void
  onSave: () => void
  onSelection?: (sel: SelectionState | null) => void
}

function CodeEditor({ content, lang, onChange, onSave, onSelection }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef      = useRef<HTMLPreElement>(null)
  const lineNumRef  = useRef<HTMLDivElement>(null)

  const lines     = content.split('\n')
  const lineCount = lines.length

  const highlighted = useMemo(() => highlightCode(content, lang), [content, lang])

  const syncScroll = useCallback(() => {
    const ta  = textareaRef.current
    const pre = preRef.current
    const ln  = lineNumRef.current
    if (!ta) return
    if (pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft }
    if (ln)  ln.scrollTop = ta.scrollTop
  }, [])

  const handleKeyDown = useCallback((e: ReactKBEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); onSave(); return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta    = textareaRef.current!
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      const next  = content.slice(0, start) + '  ' + content.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
    // Clear selection hint on Escape
    if (e.key === 'Escape') onSelection?.(null)
  }, [content, onChange, onSave, onSelection])

  // ── Selection tracking ────────────────────────────────────────────────────
  const computeSelection = useCallback(() => {
    const ta = textareaRef.current
    if (!ta || !onSelection) return
    const { selectionStart, selectionEnd, value } = ta
    if (selectionStart === selectionEnd) {
      onSelection(null)
      return
    }
    const selectedText = value.slice(selectionStart, selectionEnd).trim()
    if (!selectedText || selectedText.length < 2) { onSelection(null); return }

    // Compute line numbers
    const beforeSel  = value.slice(0, selectionStart)
    const startLine  = (beforeSel.match(/\n/g) ?? []).length + 1
    const selContent = value.slice(selectionStart, selectionEnd)
    const endLine    = startLine + (selContent.match(/\n/g) ?? []).length

    // Hint position: use textarea's getBoundingClientRect + selection coords
    // We approximate Y using line height * startLine
    const rect = ta.getBoundingClientRect()
    const lineH = 13 * 1.6 // font-size * line-height
    const hintX = rect.left + rect.width * 0.5
    const hintY = rect.top + (startLine - 1) * lineH + 16 - ta.scrollTop

    onSelection({ text: selectedText, startLine, endLine, hintX, hintY })
  }, [onSelection])

  // Re-sync on content change (pre doesn't scroll itself)
  useEffect(() => { syncScroll() }, [content, syncScroll])

  return (
    <div className="flex h-full bg-[#1E1E1E] overflow-hidden">
      {/* Line numbers */}
      <div
        ref={lineNumRef}
        aria-hidden
        className="flex-shrink-0 w-10 bg-[#1E1E1E] overflow-hidden select-none"
        style={{ paddingTop: '16px' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className="text-right pr-3 font-mono text-[13px] text-[#5A5A5A]"
            style={{ lineHeight: '1.6', height: 'calc(13px * 1.6)' }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Syntax-highlighted backdrop */}
        <pre
          ref={preRef}
          aria-hidden
          className="absolute inset-0 m-0 font-mono text-[13px] text-[#D4D4D4] pointer-events-none overflow-hidden whitespace-pre"
          style={{ lineHeight: '1.6', padding: '16px 16px 16px 0' }}
          dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
        />
        {/* Editable textarea (transparent text, visible caret) */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseUp={computeSelection}
          onKeyUp={computeSelection}
          onScroll={syncScroll}
          className="absolute inset-0 bg-transparent resize-none outline-none font-mono text-[13px] whitespace-pre overflow-auto"
          style={{
            lineHeight: '1.6',
            padding: '16px 16px 16px 0',
            color: 'transparent',
            caretColor: '#AEAFAD',
          }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  )
}

// ─── Main ExplorerPage ────────────────────────────────────────────────────────
type BottomTab    = 'terminal' | 'problems' | 'output'
type CtxMenuState = { x: number; y: number; node: FileTreeNode } | null

export function ExplorerPage() {
  const navigate = useNavigate()
  // ── File system state ──────────────────────────────────────────────────────
  const [fileTree, setFileTree]       = useState<FileTreeNode[]>(INITIAL_TREE)
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('explorer-contents')
    return stored ? { ...INITIAL_CONTENTS, ...JSON.parse(stored) } : INITIAL_CONTENTS
  })
  const [unsaved, setUnsaved]         = useState<Set<string>>(new Set())

  // ── Editor state ───────────────────────────────────────────────────────────
  const [openTabs, setOpenTabs]     = useState(['src/main.ts'])
  const [activeTab, setActiveTab]   = useState('src/main.ts')

  // ── Panel layout (resizable) ───────────────────────────────────────────────
  const [treeWidth, treeHandle]   = useResize(220, 120, 440, 'right')
  const [inspWidth, inspHandle]   = useResize(260, 160, 500, 'left')
  const [btmHeight, btmHandle]    = useResize(190, 80, 420, 'up')

  // ── UI state ───────────────────────────────────────────────────────────────
  const [bottomTab, setBottomTab]       = useState<BottomTab>('terminal')
  const [inspOpen, setInspOpen]         = useState(true)
  const [bottomOpen, setBottomOpen]     = useState(true)
  const [searchOpen, setSearchOpen]     = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')

  // ── Context menu ───────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null)

  // ── Rename state ───────────────────────────────────────────────────────────
  const [renamingId, setRenamingId]     = useState<string | null>(null)
  const [renameValue, setRenameValue]   = useState('')

  // ── New item creation state ────────────────────────────────────────────────
  const [creatingIn, setCreatingIn]     = useState<string | null>(null)
  const [creatingType, setCreatingType] = useState<'file' | 'folder'>('file')
  const [newName, setNewName]           = useState('')

  // ── Code selection + AI explain state ────────────────────────────────────
  const [codeSelection, setCodeSelection]     = useState<SelectionState | null>(null)
  const { current: explainMsg, history: explainHistory, isStreaming: explainStreaming,
          explain, dismissCurrent, clearHistory } = useCodeExplain()
  const [showExplain, setShowExplain]           = useState(false)
  const inspectorScrollRef                      = useRef<HTMLDivElement>(null)

  // ── Search ref ─────────────────────────────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const content   = fileContents[activeTab] ?? ''
  const lang      = getLang(activeTab)
  const inspector = INSPECTOR_MAP[activeTab] ?? INSPECTOR_MAP['default']
  const totalProblems = Object.values(INSPECTOR_MAP).reduce((s, d) => s + d.problems.length, 0)

  // ─── Save to localStorage ──────────────────────────────────────────────────
  const save = useCallback((id = activeTab, data = fileContents) => {
    localStorage.setItem('explorer-contents', JSON.stringify(data))
    setUnsaved(prev => { const s = new Set(prev); s.delete(id); return s })
  }, [activeTab, fileContents])

  // ─── Open file ─────────────────────────────────────────────────────────────
  const openFile = useCallback((id: string) => {
    setActiveTab(id)
    if (!openTabs.includes(id)) setOpenTabs(p => [...p, id])
  }, [openTabs])

  // ─── Close tab ─────────────────────────────────────────────────────────────
  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = openTabs.filter(t => t !== id)
    setOpenTabs(next)
    if (activeTab === id) setActiveTab(next[next.length - 1] ?? '')
  }, [openTabs, activeTab])

  // ─── Edit file content ─────────────────────────────────────────────────────
  const handleEdit = useCallback((id: string, val: string) => {
    setFileContents(prev => ({ ...prev, [id]: val }))
    setUnsaved(prev => new Set(prev).add(id))
  }, [])

  // ─── CRUD: Create file ─────────────────────────────────────────────────────
  const commitNewItem = useCallback(() => {
    if (!newName.trim()) { setCreatingIn(null); setNewName(''); return }
    const parentId = creatingIn || null
    const id = parentId ? `${parentId}/${newName.trim()}` : newName.trim()
    const node: FileTreeNode = { id, name: newName.trim(), type: creatingType }
    if (creatingType === 'folder') node.children = []
    setFileTree(t => insertNode(t, parentId, node))
    if (creatingType === 'file') {
      setFileContents(prev => ({ ...prev, [id]: '' }))
      openFile(id)
    }
    setCreatingIn(null); setNewName('')
  }, [newName, creatingIn, creatingType, openFile])

  // ─── CRUD: Rename ──────────────────────────────────────────────────────────
  const commitRename = useCallback(() => {
    if (!renameValue.trim() || !renamingId) { setRenamingId(null); return }
    const oldId  = renamingId
    const parent = findParentId(fileTree, oldId)
    const newId  = parent ? `${parent}/${renameValue.trim()}` : renameValue.trim()
    setFileTree(t => renameNode(t, oldId, renameValue.trim(), newId))
    // Migrate content
    setFileContents(prev => {
      const next = { ...prev }
      if (oldId in next) { next[newId] = next[oldId]; delete next[oldId] }
      return next
    })
    // Migrate tabs
    setOpenTabs(prev => prev.map(t => t === oldId ? newId : t))
    if (activeTab === oldId) setActiveTab(newId)
    setRenamingId(null); setRenameValue('')
  }, [renameValue, renamingId, fileTree, activeTab])

  // ─── CRUD: Delete ──────────────────────────────────────────────────────────
  const deleteItem = useCallback((id: string) => {
    setFileTree(t => deleteNode(t, id))
    setFileContents(prev => { const n = {...prev}; delete n[id]; return n })
    setOpenTabs(prev => prev.filter(t => t !== id))
    if (activeTab === id) setActiveTab(openTabs.filter(t => t !== id)[0] ?? '')
  }, [activeTab, openTabs])

  // ─── Context menu actions ──────────────────────────────────────────────────
  const buildCtxItems = (node: FileTreeNode) => {
    const isFolder = node.type === 'folder'
    const items: Parameters<typeof ContextMenu>[0]['items'] = []
    if (isFolder) {
      items.push({
        label: 'New File', icon: <FilePlus size={11} />,
        onClick: () => { setCreatingIn(node.id); setCreatingType('file'); setNewName('') },
      })
      items.push({
        label: 'New Folder', icon: <FolderPlus size={11} />,
        onClick: () => { setCreatingIn(node.id); setCreatingType('folder'); setNewName('') },
      })
      items.push({ separator: true as const })
    }
    if (!isFolder) {
      items.push({
        label: 'Open', icon: <Edit3 size={11} />,
        onClick: () => openFile(node.id),
      })
    }
    items.push({
      label: 'Rename', icon: <Edit3 size={11} />, shortcut: 'F2',
      onClick: () => { setRenamingId(node.id); setRenameValue(node.name) },
    })
    items.push({ separator: true as const })
    items.push({
      label: 'Delete', icon: <Trash2 size={11} />, danger: true,
      onClick: () => deleteItem(node.id),
    })
    return items
  }

  // ─── Handle explain button click ───────────────────────────────────────────
  const handleExplain = useCallback(() => {
    if (!codeSelection) return
    setInspOpen(true)     // ensure inspector is visible
    setShowExplain(true)  // show AI panel in inspector
    setCodeSelection(null) // dismiss hint
    explain({
      code:      codeSelection.text,
      lang,
      file:      activeTab,
      startLine: codeSelection.startLine,
      endLine:   codeSelection.endLine,
    })
    // Scroll inspector to top so user sees the AI panel
    setTimeout(() => inspectorScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100)
  }, [codeSelection, explain, lang, activeTab])

  // ─── Open explanation in Overview chat ─────────────────────────────────────
  const handleOpenInChat = useCallback((msg: ExplainMessage) => {
    const payload = {
      userPrompt: `Explain this ${msg.request.lang} code from \`${msg.request.file}\` (lines ${msg.request.startLine}–${msg.request.endLine}):\n\n\`\`\`${msg.request.lang.toLowerCase()}\n${msg.request.code.trim()}\n\`\`\``,
      aiResponse: msg.explanation,
      file:       msg.request.file,
      startLine:  msg.request.startLine,
      endLine:    msg.request.endLine,
      timestamp:  msg.timestamp.toISOString(),
    }
    localStorage.setItem('explain-prefill', JSON.stringify(payload))
    navigate('/')
  }, [navigate])

  // ─── Keyboard shortcut: search ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(s => !s)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── Search highlight (simple — marks the pre output) ─────────────────────
  // (For simplicity, search just opens the find bar. Full match jumping would
  //  require CodeMirror/Monaco. This is the text-layer approach.)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell topbarBreadcrumb={['Project Alpha', ...activeTab.split('/')]}>
      <div className="flex h-full overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── File Tree Panel ────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 border-r-2 border-ink flex flex-col bg-paper overflow-hidden"
          style={{ width: treeWidth, minHeight: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b-2 border-ink flex-shrink-0">
            <span className="font-mono text-[11px] font-semibold tracking-widest uppercase text-ink">
              Explorer
            </span>
            <div className="flex items-center gap-0.5">
              <button
                title="New File"
                onClick={() => { setCreatingIn(''); setCreatingType('file'); setNewName('') }}
                className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim"
              >
                <FilePlus size={12} className="text-ink-dim" />
              </button>
              <button
                title="New Folder"
                onClick={() => { setCreatingIn(''); setCreatingType('folder'); setNewName('') }}
                className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim"
              >
                <FolderPlus size={12} className="text-ink-dim" />
              </button>
              <button title="Refresh" className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim">
                <RefreshCw size={11} className="text-ink-dim" />
              </button>
            </div>
          </div>
          <div className="px-3 py-1.5 border-b border-paper-muted flex-shrink-0">
            <span className="font-mono text-[10px] tracking-widest uppercase text-ink-muted">Project Alpha</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <FileTree
              nodes={fileTree}
              selectedId={activeTab}
              onSelect={node => openFile(node.id)}
              onContextMenu={(node, e) => setCtxMenu({ x: e.clientX, y: e.clientY, node })}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameCommit={commitRename}
              onRenameCancel={() => { setRenamingId(null); setRenameValue('') }}
              creatingIn={creatingIn}
              creatingType={creatingType}
              newName={newName}
              onNewNameChange={setNewName}
              onNewNameCommit={commitNewItem}
              onNewNameCancel={() => { setCreatingIn(null); setNewName('') }}
            />
          </div>
        </div>

        {/* ── Drag handle: tree ──────────────────────────────────────────────── */}
        <div
          ref={treeHandle}
          className="w-1 flex-shrink-0 bg-transparent hover:bg-accent-blue cursor-col-resize transition-colors group z-10"
          style={{ borderRight: '1px solid transparent' }}
        >
          <div className="w-full h-full group-hover:bg-accent-blue transition-colors" />
        </div>

        {/* ── Editor column ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r-2 border-ink">

          {/* Tab bar */}
          <div
            className="flex items-center border-b-2 border-ink bg-paper flex-shrink-0 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {openTabs.map(tabId => {
              const isActive = activeTab === tabId
              const label    = fileLabel(tabId)
              const ext      = label.split('.').pop() ?? ''
              const extColor = ext === 'ts' || ext === 'tsx' ? 'text-[#569CD6]'
                : ext === 'json' ? 'text-[#CE9178]'
                : ext === 'md'   ? 'text-[#6A9955]'
                : 'text-[#777]'
              const isDirty  = unsaved.has(tabId)
              return (
                <button
                  key={tabId}
                  id={`editor-tab-${tabId.replace(/[^a-z0-9]/gi, '-')}`}
                  onClick={() => { setActiveTab(tabId) }}
                  className={`
                    group flex items-center gap-1.5 px-4 py-2.5 border-r border-ink flex-shrink-0
                    font-mono text-[11px] font-medium transition-colors
                    ${isActive
                      ? 'bg-[#1E1E1E] text-[#D4D4D4] border-b-2 border-b-[#007ACC] -mb-[2px]'
                      : 'bg-paper text-ink-dim hover:bg-paper-dim'
                    }
                  `}
                >
                  <span className={`text-[10px] font-bold ${extColor}`}>&lt;/&gt;</span>
                  {label}
                  {isDirty && <span className="w-2 h-2 rounded-full bg-[#CE9178] flex-shrink-0" title="Unsaved" />}
                  <span
                    role="button"
                    onClick={e => closeTab(tabId, e)}
                    className="w-4 h-4 flex items-center justify-center hover:bg-white/20 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </span>
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-1 px-2 flex-shrink-0">
              {unsaved.has(activeTab) && (
                <button
                  title="Save (Ctrl+S)"
                  onClick={() => save()}
                  className="w-7 h-7 flex items-center justify-center hover:bg-paper-dim text-accent-yellow"
                >
                  <Save size={13} />
                </button>
              )}
              <button
                title="Find in file (Ctrl+F)"
                onClick={() => { setSearchOpen(s => !s); setTimeout(() => searchRef.current?.focus(), 50) }}
                className={`w-7 h-7 flex items-center justify-center hover:bg-paper-dim ${searchOpen ? 'bg-paper-dim' : ''}`}
              >
                <Search size={13} className="text-ink-dim" />
              </button>
              <button title="Split editor" className="w-7 h-7 flex items-center justify-center hover:bg-paper-dim">
                <SplitSquareHorizontal size={13} className="text-ink-dim" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#333] bg-[#1E1E1E] flex-shrink-0 animate-fadein">
              <Search size={12} className="text-[#6A9955] flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Find in file…"
                className="flex-1 bg-transparent font-mono text-[12px] text-[#D4D4D4] outline-none placeholder:text-[#6A9955]"
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                <X size={12} className="text-[#6A9955] hover:text-[#D4D4D4]" />
              </button>
            </div>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-3 py-1 border-b border-[#333] bg-[#1E1E1E] flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {activeTab.split('/').map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <ChevronRight size={10} className="text-[#555]" />}
                <span className={`font-mono text-[11px] ${i === arr.length - 1 ? 'text-[#D4D4D4]' : 'text-[#666]'}`}>
                  {seg}
                </span>
              </span>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab ? (
              <CodeEditor
                key={activeTab}
                content={content}
                lang={lang}
                onChange={val => handleEdit(activeTab, val)}
                onSave={() => save()}
                onSelection={setCodeSelection}
              />
            ) : (
              <div className="h-full bg-[#1E1E1E] flex items-center justify-center">
                <span className="font-mono text-[13px] text-[#555]">Select a file to edit</span>
              </div>
            )}
          </div>

          {/* Bottom drag handle */}
          {bottomOpen && (
            <div
              ref={btmHandle}
              className="h-1 flex-shrink-0 bg-transparent hover:bg-accent-blue cursor-row-resize transition-colors"
            />
          )}

          {/* Bottom panel */}
          {bottomOpen && (
            <div className="border-t-2 border-ink flex-shrink-0 flex flex-col" style={{ height: btmHeight }}>
              {/* Bottom tab bar */}
              <div className="flex items-center border-b border-[#333] bg-[#252526] flex-shrink-0">
                {(['terminal', 'problems', 'output'] as BottomTab[]).map(tab => (
                  <button
                    key={tab}
                    id={`bottom-tab-${tab}`}
                    onClick={() => setBottomTab(tab)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] font-semibold
                      tracking-wider uppercase transition-colors
                      ${bottomTab === tab ? 'text-[#D4D4D4] border-b-2 border-[#007ACC]' : 'text-[#888] hover:text-[#CCC]'}
                    `}
                  >
                    {tab === 'terminal' && <Terminal size={11} />}
                    {tab === 'problems' && <AlertCircle size={11} />}
                    {tab === 'output'   && <AlignLeft  size={11} />}
                    {tab}
                    {tab === 'problems' && totalProblems > 0 && (
                      <span className="w-4 h-4 bg-[#CE9178] text-[#1E1E1E] text-[9px] flex items-center justify-center font-bold">
                        {totalProblems}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  className="ml-auto px-2 py-1 text-[#555] hover:text-[#CCC]"
                  onClick={() => setBottomOpen(false)}
                  title="Close panel"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Terminal */}
              {bottomTab === 'terminal' && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <XTermPanel />
                </div>
              )}

              {/* Problems */}
              {bottomTab === 'problems' && (
                <div className="flex-1 overflow-y-auto bg-[#1E1E1E] font-mono text-[12px]">
                  {inspector.problems.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-[#4EC9B0]">
                      <CheckCircle size={13} /> No problems in this file.
                    </div>
                  ) : inspector.problems.map((p, i) => (
                    <div key={i} className={`flex items-start gap-2 px-4 py-2 border-b border-[#333] hover:bg-[#2A2A2A] cursor-pointer ${p.severity === 'error' ? 'text-[#F44747]' : 'text-[#CE9178]'}`}>
                      {p.severity === 'error'
                        ? <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                        : <Info size={12} className="flex-shrink-0 mt-0.5" />
                      }
                      <span className="flex-1">{p.msg}</span>
                      <span className="text-[#555]">Ln {p.line}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Output */}
              {bottomTab === 'output' && (
                <div className="flex-1 overflow-y-auto bg-[#1E1E1E] px-4 py-3 font-mono text-[12px] text-[#6A9955]">
                  No output to display.
                </div>
              )}
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#007ACC] text-white font-mono text-[10px] flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><GitBranch size={10} /> main</span>
              <span className="flex items-center gap-1">
                {inspector.problems.length > 0
                  ? <><AlertCircle size={10} className="text-[#F44747]" /> {inspector.problems.length} problems</>
                  : <><CheckCircle size={10} className="text-[#4EC9B0]" /> No problems</>
                }
              </span>
              {unsaved.has(activeTab) && <span className="text-[#CE9178]">● Unsaved</span>}
            </div>
            <div className="flex items-center gap-3">
              {!bottomOpen && (
                <button onClick={() => setBottomOpen(true)} className="flex items-center gap-1 hover:bg-white/20 px-1">
                  <PanelBottom size={10} /> Terminal
                </button>
              )}
              <span>{lang}</span>
              <span>UTF-8</span>
              <span>{content.split('\n').length} lines</span>
              <span>{fileSize(content)}</span>
            </div>
          </div>
        </div>

        {/* ── Drag handle: inspector ─────────────────────────────────────────── */}
        {inspOpen && (
          <div
            ref={inspHandle}
            className="w-1 flex-shrink-0 bg-transparent hover:bg-accent-blue cursor-col-resize transition-colors"
          />
        )}

        {/* ── Inspector Panel ────────────────────────────────────────────────── */}
        {inspOpen ? (
          <div
            className="flex-shrink-0 flex flex-col bg-paper overflow-hidden"
            style={{ width: inspWidth, minHeight: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-ink flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-widest uppercase text-ink">Inspector</span>
                {(explainMsg || explainHistory.length > 0) && (
                  <button
                    onClick={() => setShowExplain(s => !s)}
                    title="Toggle AI Explain panel"
                    className={`flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] border transition-colors ${
                      showExplain ? 'bg-accent-yellow border-ink text-ink' : 'border-ink/30 text-ink-muted hover:bg-paper-dim'
                    }`}
                  >
                    <Sparkles size={9} /> AI
                    {explainHistory.length > 0 && (
                      <span className="w-3.5 h-3.5 bg-accent-yellow text-ink text-[8px] flex items-center justify-center font-bold">
                        {explainHistory.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <button onClick={() => setInspOpen(false)} className="w-6 h-6 flex items-center justify-center hover:bg-paper-dim">
                <PanelRight size={12} className="text-ink-dim" />
              </button>
            </div>

            {/* AI Explain panel — shown above regular inspector when active */}
            {showExplain && (
              <AIExplainPanel
                current={explainMsg}
                history={explainHistory}
                isStreaming={explainStreaming}
                onDismiss={() => { setShowExplain(false); dismissCurrent() }}
                onReExplain={req => explain(req)}
                onOpenInChat={handleOpenInChat}
              />
            )}

            <div ref={inspectorScrollRef} className="flex-1 overflow-y-auto min-h-0">
              {/* File info */}
              <div className="px-4 py-4 border-b border-paper-muted">
                <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-2">Current File</p>
                <p className="font-heading font-bold text-[16px] text-ink leading-tight">{fileLabel(activeTab)}</p>
                <p className="font-mono text-[10px] text-ink-muted mt-0.5">{activeTab}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Size',  val: fileSize(content) },
                    { label: 'Lines', val: content.split('\n').length },
                    { label: 'Lang',  val: lang },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="font-mono text-[8px] tracking-widest uppercase text-ink-muted">{label}</p>
                      <p className="font-mono text-[11px] font-semibold text-ink truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source control */}
              <div className="mx-3 my-3 border-2 border-ink bg-paper-bright px-3 py-3">
                <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-2">Source Control</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <GitBranch size={12} className={
                    inspector.gitStatus === 'modified'  ? 'text-accent-yellow' :
                    inspector.gitStatus === 'untracked' ? 'text-accent-red'    : 'text-[#4EC9B0]'
                  } />
                  <span className="font-mono text-[11px] font-semibold text-ink">
                    {inspector.gitStatus === 'clean' ? '✓ Clean'
                     : inspector.gitStatus === 'modified' ? 'Modified (M)' : 'Untracked (U)'}
                  </span>
                </div>
                <button className="btn btn-outline w-full justify-center text-[10px] py-1.5">
                  {inspector.gitStatus === 'clean' ? 'View Log' : 'Stage Changes'}
                </button>
              </div>

              {/* Metrics */}
              <div className="px-4 py-3 border-b border-paper-muted">
                <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-3">Metrics</p>
                {[
                  {
                    label: 'Complexity',
                    val: inspector.complexity,
                    color: inspector.complexity > 70 ? 'bg-accent-red' : inspector.complexity > 40 ? 'bg-accent-yellow' : 'bg-[#4EC9B0]',
                    text:  inspector.complexity > 70 ? 'text-accent-red' : inspector.complexity > 40 ? 'text-accent-yellow' : 'text-[#4EC9B0]',
                    disp:  inspector.complexity > 70 ? 'High' : inspector.complexity > 40 ? 'Med' : 'Low',
                  },
                  { label: 'Coverage', val: inspector.coverage, color: 'bg-accent-blue', text: 'text-accent-blue', disp: `${inspector.coverage}%` },
                ].map(m => (
                  <div key={m.label} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[11px] text-ink">{m.label}</span>
                      <span className={`font-mono text-[11px] font-semibold ${m.text}`}>{m.disp}</span>
                    </div>
                    <div className="metric-bar">
                      <div className={`metric-bar-fill ${m.color} transition-all duration-500`} style={{ width: `${m.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Imports */}
              {inspector.imports.length > 0 && (
                <div className="px-4 py-3 border-b border-paper-muted">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-2">
                    Imports ({inspector.imports.length})
                  </p>
                  {inspector.imports.map((imp, i) => (
                    <div key={i} className="flex items-start gap-1.5 py-1 hover:bg-paper-dim px-1 -mx-1 cursor-pointer group">
                      <ArrowRight size={11} className="text-ink-muted mt-0.5 flex-shrink-0 group-hover:text-ink" />
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] text-ink block truncate">{imp.name}</span>
                        <span className="font-mono text-[10px] text-ink-muted truncate block">{imp.from}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Symbols */}
              {inspector.symbols.length > 0 && (
                <div className="px-4 py-3 border-b border-paper-muted">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-2">
                    Symbols ({inspector.symbols.length})
                  </p>
                  {inspector.symbols.map((sym, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 hover:bg-paper-dim px-1 -mx-1 cursor-pointer group" title={`Ln ${sym.line}`}>
                      <span className="flex-shrink-0 w-4 flex items-center justify-center">{kindIcon(sym.kind)}</span>
                      <span className="font-mono text-[11px] text-ink flex-1 truncate">{sym.name}</span>
                      {sym.exported && (
                        <span className="font-mono text-[9px] text-[#4EC9B0] border border-[#4EC9B0] px-1 flex-shrink-0">exp</span>
                      )}
                      <span className="font-mono text-[10px] text-ink-muted flex-shrink-0 opacity-0 group-hover:opacity-100">:{sym.line}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Problems */}
              {inspector.problems.length > 0 && (
                <div className="px-4 py-3">
                  <p className="font-mono text-[9px] tracking-widest uppercase text-ink-muted mb-2">
                    Problems ({inspector.problems.length})
                  </p>
                  {inspector.problems.map((p, i) => (
                    <div key={i} className={`flex items-start gap-1.5 py-1.5 px-2 -mx-2 mb-1 border-l-2 ${p.severity === 'error' ? 'border-accent-red bg-[#FFCFCC]/20' : 'border-accent-yellow bg-[#FFCC00]/10'}`}>
                      {p.severity === 'error'
                        ? <AlertCircle size={11} className="text-accent-red flex-shrink-0 mt-0.5" />
                        : <Info size={11} className="text-accent-yellow flex-shrink-0 mt-0.5" />
                      }
                      <span className="font-body text-[11px] text-ink leading-snug">{p.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed inspector */
          <button
            className="w-8 flex-shrink-0 border-l-2 border-ink bg-paper flex items-center justify-center hover:bg-paper-dim transition-colors"
            onClick={() => setInspOpen(true)}
            title="Open Inspector"
          >
            <span className="font-mono text-[9px] tracking-widest uppercase text-ink-muted" style={{ writingMode: 'vertical-rl' }}>
              Inspector
            </span>
          </button>
        )}
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────────── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.node)}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {/* ── Selection Hint (floating "Explain" button) ────────────────────────── */}
      {codeSelection && (
        <SelectionHint
          x={codeSelection.hintX}
          y={codeSelection.hintY}
          lineCount={codeSelection.endLine - codeSelection.startLine + 1}
          onExplain={handleExplain}
          onDismiss={() => setCodeSelection(null)}
        />
      )}
    </AppShell>
  )
}
