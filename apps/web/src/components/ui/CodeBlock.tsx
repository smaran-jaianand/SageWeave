// CodeBlock — Monaco Editor stub (static display)
// Will be replaced with @monaco-editor/react when backend is wired

interface CodeLine {
  tokens: Array<{ text: string; type?: string }>
}

interface CodeBlockProps {
  code?: CodeLine[]
  language?: string
  filename?: string
}

// Sample code representation for the UI stub
const SAMPLE_MAIN_TS: CodeLine[] = [
  { tokens: [{ text: '' }] },
  { tokens: [{ text: 'import', type: 'code-kw' }, { text: ' { initSystem } ' }, { text: 'from', type: 'code-kw' }, { text: " './core/system'", type: 'code-str' }, { text: ';' }] },
  { tokens: [{ text: 'import', type: 'code-kw' }, { text: ' { GraphicEngine } ' }, { text: 'from', type: 'code-kw' }, { text: " './engine/graphics'", type: 'code-str' }, { text: ';' }] },
  { tokens: [{ text: 'import', type: 'code-kw' }, { text: ' type { SystemConfig } ' }, { text: 'from', type: 'code-kw' }, { text: " './types'", type: 'code-str' }, { text: ';' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: '/**', type: 'code-cmt' }] },
  { tokens: [{ text: ' * Main application entry point', type: 'code-cmt' }] },
  { tokens: [{ text: ' * Initializes core services and mounts primary UI', type: 'code-cmt' }] },
  { tokens: [{ text: ' */', type: 'code-cmt' }] },
  { tokens: [{ text: 'const', type: 'code-kw' }, { text: ' config: ' }, { text: 'SystemConfig', type: 'code-type' }, { text: ' = {' }] },
  { tokens: [{ text: '  mode: ', type: '' }, { text: "'strict'", type: 'code-str' }, { text: ',' }] },
  { tokens: [{ text: '  theme: ', type: '' }, { text: "'neo-brutal'", type: 'code-str' }, { text: ',' }] },
  { tokens: [{ text: '  debug: ', type: '' }, { text: 'true', type: 'code-kw' }] },
  { tokens: [{ text: '};' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: 'export', type: 'code-kw' }, { text: ' async ' }, { text: 'function', type: 'code-kw' }, { text: ' bootstrap', type: 'code-fn' }, { text: '() {' }] },
  { tokens: [{ text: '  ' }, { text: 'try', type: 'code-kw' }, { text: ' {' }] },
  { tokens: [{ text: '    ', type: '' }, { text: '// Initialize the graphic engine first', type: 'code-cmt' }] },
  { tokens: [{ text: '    ' }, { text: 'const', type: 'code-kw' }, { text: ' engine = ' }, { text: 'new', type: 'code-kw' }, { text: ' GraphicEngine', type: 'code-fn' }, { text: '(config);' }] },
  { tokens: [{ text: '    ' }, { text: 'await', type: 'code-kw' }, { text: ' engine.' }, { text: 'init', type: 'code-fn' }, { text: '();' }] },
  { tokens: [{ text: '' }] },
  { tokens: [{ text: '    ', type: '' }, { text: '// Boot core systems', type: 'code-cmt' }] },
  { tokens: [{ text: '    ' }, { text: 'initSystem', type: 'code-fn' }, { text: '({' }] },
  { tokens: [{ text: '      engine,' }] },
  { tokens: [{ text: '      ready: () => console.' }, { text: 'log', type: 'code-fn' }, { text: '(' }, { text: "'System Armed.'", type: 'code-str' }, { text: '),' }] },
  { tokens: [{ text: '    });' }] },
  { tokens: [{ text: '  } ' }, { text: 'catch', type: 'code-kw' }, { text: ' (err) {' }] },
  { tokens: [{ text: '    console.' }, { text: 'error', type: 'code-fn' }, { text: '(' }, { text: "'BOOTSTRAP FAILED:'", type: 'code-str' }, { text: ', err);' }] },
  { tokens: [{ text: '  }' }] },
  { tokens: [{ text: '}' }] },
]

export function CodeBlock({ code = SAMPLE_MAIN_TS }: CodeBlockProps) {
  return (
    <div className="code-view h-full">
      {code.map((line, lineIdx) => (
        <div key={lineIdx} className="code-line hover:bg-white/5">
          <span className="code-line-num">{lineIdx + 1}</span>
          <span>
            {line.tokens.map((token, tokIdx) => (
              <span key={tokIdx} className={token.type ?? ''}>
                {token.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
