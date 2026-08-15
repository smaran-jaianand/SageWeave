import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { OllamaPanel } from '@/components/overview/OllamaPanel'
import {
  Settings, Cpu, Code2, Keyboard, Sliders,
  Save, RotateCcw, Check, AlertCircle, Eye, EyeOff,
  ChevronRight, Zap, Globe, Lock, Sun, Moon,
  Minus, Plus, AlignLeft, WrapText, Palette,
} from 'lucide-react'

// ─── Settings schema & localStorage ──────────────────────────────────────────
export interface AppSettings {
  // General
  projectName:    string
  audienceLevel:  'junior' | 'mid' | 'senior' | 'expert'
  explainDepth:   'brief' | 'detailed' | 'exhaustive'
  theme:          'light' | 'dark' | 'system'

  // AI / Models
  primaryProvider:  'anthropic' | 'openai' | 'ollama' | 'custom'
  anthropicKey:     string
  openaiKey:        string
  customEndpoint:   string
  activeLocalModel: string | null
  streamResponses:  boolean
  maxTokens:        number

  // Editor
  fontSize:       number
  tabWidth:       2 | 4
  wordWrap:       boolean
  syntaxTheme:    'vscode-dark' | 'monokai' | 'github-light' | 'dracula'
  showLineNums:   boolean
  showMinimap:    boolean

  // Privacy
  telemetry:    boolean
  saveHistory:  boolean
}

const DEFAULTS: AppSettings = {
  projectName:    'Project Alpha',
  audienceLevel:  'mid',
  explainDepth:   'detailed',
  theme:          'light',
  primaryProvider: 'anthropic',
  anthropicKey:   '',
  openaiKey:      '',
  customEndpoint: '',
  activeLocalModel: null,
  streamResponses: true,
  maxTokens:      4096,
  fontSize:       13,
  tabWidth:       2,
  wordWrap:       false,
  syntaxTheme:    'vscode-dark',
  showLineNums:   true,
  showMinimap:    false,
  telemetry:      true,
  saveHistory:    true,
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('app-settings')
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return DEFAULTS }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem('app-settings', JSON.stringify(s))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pt-6 pb-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted border-b border-ink/10 pb-2">
        {children}
      </p>
    </div>
  )
}

function SettingRow({
  label, sublabel, children,
}: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-3 hover:bg-paper-dim/50 transition-colors">
      <div className="min-w-0 flex-shrink pt-0.5">
        <p className="font-body text-[13px] font-medium text-ink">{label}</p>
        {sublabel && <p className="font-body text-[11px] text-ink-muted mt-0.5 leading-snug">{sublabel}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  value, onChange,
}: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 border-2 border-ink transition-colors flex-shrink-0 ${value ? 'bg-ink' : 'bg-paper-dim'}`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 bg-accent-yellow transition-all ${value ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex border-2 border-ink">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            flex-1 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider
            border-r last:border-r-0 border-ink/40 transition-colors whitespace-nowrap
            ${value === opt.value ? 'bg-ink text-paper-bright' : 'bg-paper text-ink-muted hover:bg-paper-dim'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function NumberStepper({
  value, min, max, step = 1, onChange,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center border-2 border-ink">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 flex items-center justify-center hover:bg-paper-dim border-r border-ink"
      >
        <Minus size={11} strokeWidth={2.5} />
      </button>
      <span className="w-10 text-center font-mono text-[12px] font-semibold text-ink select-none">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 flex items-center justify-center hover:bg-paper-dim border-l border-ink"
      >
        <Plus size={11} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function KeyInput({
  value, onChange, masked = false,
}: { value: string; onChange: (v: string) => void; masked?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-1 border-2 border-ink bg-paper-bright" style={{ width: 220 }}>
      <input
        type={masked && !show ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={masked ? 'sk-••••••••••••••••' : 'https://…'}
        className="flex-1 bg-transparent font-mono text-[11px] text-ink px-3 py-1.5 outline-none placeholder:text-ink-muted min-w-0"
        autoComplete="off"
        spellCheck={false}
      />
      {masked && (
        <button
          onClick={() => setShow(s => !s)}
          className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink flex-shrink-0"
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      )}
      {value && (
        <span className="pr-2 flex-shrink-0">
          <Check size={12} className="text-[#4EC9B0]" />
        </span>
      )}
    </div>
  )
}

// ─── Tab: General ─────────────────────────────────────────────────────────────
function GeneralTab({ s, set }: { s: AppSettings; set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void }) {
  return (
    <div className="flex flex-col">
      <SectionHeader>Project</SectionHeader>
      <SettingRow label="Project Name" sublabel="Displayed in the sidebar and report headers">
        <input
          type="text"
          value={s.projectName}
          onChange={e => set('projectName', e.target.value)}
          className="border-2 border-ink bg-paper-bright font-body text-[13px] text-ink px-3 py-1.5 outline-none focus:border-accent-blue w-[200px]"
        />
      </SettingRow>

      <SectionHeader>Learning</SectionHeader>
      <SettingRow label="Audience Level" sublabel="Adjusts the depth of explanations and assumed knowledge">
        <SegmentedControl
          options={[
            { value: 'junior', label: 'Jr.' },
            { value: 'mid',    label: 'Mid' },
            { value: 'senior', label: 'Sr.' },
            { value: 'expert', label: 'Expert' },
          ]}
          value={s.audienceLevel}
          onChange={v => set('audienceLevel', v)}
        />
      </SettingRow>

      <SettingRow label="Explanation Depth" sublabel="Controls how thorough the AI explanation is">
        <SegmentedControl
          options={[
            { value: 'brief',     label: 'Brief' },
            { value: 'detailed',  label: 'Detailed' },
            { value: 'exhaustive',label: 'Deep' },
          ]}
          value={s.explainDepth}
          onChange={v => set('explainDepth', v)}
        />
      </SettingRow>

      <SectionHeader>Appearance</SectionHeader>
      <SettingRow label="Theme" sublabel="Interface color scheme">
        <SegmentedControl
          options={[
            { value: 'light',  label: '☀ Light' },
            { value: 'dark',   label: '☾ Dark' },
            { value: 'system', label: '⬡ System' },
          ]}
          value={s.theme}
          onChange={v => set('theme', v)}
        />
      </SettingRow>

      <SectionHeader>Privacy</SectionHeader>
      <SettingRow label="Anonymous Telemetry" sublabel="Help improve the product by sharing anonymous usage data">
        <Toggle value={s.telemetry} onChange={v => set('telemetry', v)} />
      </SettingRow>
      <SettingRow label="Save Chat History" sublabel="Store conversation history locally between sessions">
        <Toggle value={s.saveHistory} onChange={v => set('saveHistory', v)} />
      </SettingRow>
    </div>
  )
}

// ─── Tab: AI / Models ─────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic Claude', icon: '◆', color: 'text-[#D4613A]', model: 'claude-sonnet-4-5' },
  { id: 'openai',    name: 'OpenAI',           icon: '⬡', color: 'text-[#10A37F]', model: 'gpt-4o' },
  { id: 'ollama',    name: 'Ollama (Local)',    icon: '⬢', color: 'text-[#4EC9B0]', model: 'local' },
  { id: 'custom',    name: 'Custom Endpoint',   icon: '⟐', color: 'text-ink-muted', model: 'custom' },
] as const

function AIModelsTab({ s, set }: { s: AppSettings; set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void }) {
  return (
    <div className="flex flex-col">
      <SectionHeader>Primary Provider</SectionHeader>
      <div className="px-6 py-3 grid grid-cols-2 gap-2">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => set('primaryProvider', p.id as AppSettings['primaryProvider'])}
            className={`
              flex items-start gap-3 p-3 border-2 text-left transition-all
              ${s.primaryProvider === p.id
                ? 'border-ink bg-ink text-paper-bright'
                : 'border-ink/30 hover:border-ink bg-paper-bright'
              }
            `}
          >
            <span className={`text-[20px] leading-none flex-shrink-0 ${s.primaryProvider === p.id ? 'text-accent-yellow' : p.color}`}>
              {p.icon}
            </span>
            <div className="min-w-0">
              <p className={`font-mono text-[11px] font-bold ${s.primaryProvider === p.id ? 'text-paper-bright' : 'text-ink'}`}>
                {p.name}
              </p>
              <p className={`font-mono text-[9px] mt-0.5 ${s.primaryProvider === p.id ? 'text-accent-yellow' : 'text-ink-muted'}`}>
                {p.model}
              </p>
            </div>
          </button>
        ))}
      </div>

      <SectionHeader>API Keys</SectionHeader>
      {s.primaryProvider === 'anthropic' || s.primaryProvider !== 'ollama' ? (
        <>
          <SettingRow label="Anthropic API Key" sublabel="Required for Claude models">
            <KeyInput value={s.anthropicKey} onChange={v => set('anthropicKey', v)} masked />
          </SettingRow>
          <SettingRow label="OpenAI API Key" sublabel="Required for GPT models">
            <KeyInput value={s.openaiKey} onChange={v => set('openaiKey', v)} masked />
          </SettingRow>
          <SettingRow label="Custom Endpoint" sublabel="OpenAI-compatible API base URL">
            <KeyInput value={s.customEndpoint} onChange={v => set('customEndpoint', v)} />
          </SettingRow>
        </>
      ) : (
        <div className="px-6 py-3">
          <div className="border-2 border-[#4EC9B0] bg-[#4EC9B0]/10 px-4 py-3 flex items-center gap-3">
            <span className="text-[#4EC9B0] text-[20px]">⬢</span>
            <div>
              <p className="font-mono text-[11px] font-bold text-ink">Ollama — No API key required</p>
              <p className="font-body text-[11px] text-ink-muted mt-0.5">
                Runs entirely on your machine at <code className="font-mono bg-paper-dim px-1">localhost:11434</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <SectionHeader>Behavior</SectionHeader>
      <SettingRow label="Stream Responses" sublabel="Show tokens as they arrive (vs waiting for full response)">
        <Toggle value={s.streamResponses} onChange={v => set('streamResponses', v)} />
      </SettingRow>
      <SettingRow label="Max Output Tokens" sublabel="Maximum tokens per response (higher = more detailed)">
        <NumberStepper value={s.maxTokens} min={512} max={16384} step={512} onChange={v => set('maxTokens', v)} />
      </SettingRow>
    </div>
  )
}

// ─── Tab: Local LLMs ──────────────────────────────────────────────────────────
function LocalLLMsTab({ s, set }: { s: AppSettings; set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SectionHeader>Ollama — Local Model Manager</SectionHeader>
      <div className="px-6 pb-3">
        <p className="font-body text-[12px] text-ink-muted leading-snug">
          Models are scored by their suitability for code explanation and learning tasks.
          The active model is used as the local fallback when no cloud provider is configured.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 border-t border-ink/10">
        <OllamaPanel
          activeModel={s.activeLocalModel}
          onSelectModel={name => set('activeLocalModel', name)}
        />
      </div>
    </div>
  )
}

// ─── Tab: Editor ─────────────────────────────────────────────────────────────
const SYNTAX_THEMES = [
  { value: 'vscode-dark',   label: 'VS Code Dark',   preview: '#1E1E1E' },
  { value: 'monokai',       label: 'Monokai',         preview: '#272822' },
  { value: 'github-light',  label: 'GitHub Light',    preview: '#FFFFFF' },
  { value: 'dracula',       label: 'Dracula',         preview: '#282A36' },
] as const

function EditorTab({ s, set }: { s: AppSettings; set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void }) {
  return (
    <div className="flex flex-col">
      <SectionHeader>Text</SectionHeader>
      <SettingRow label="Font Size" sublabel="Code editor and terminal font size (px)">
        <NumberStepper value={s.fontSize} min={10} max={22} step={1} onChange={v => set('fontSize', v)} />
      </SettingRow>
      <SettingRow label="Tab Width" sublabel="Number of spaces per indentation level">
        <SegmentedControl
          options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]}
          value={String(s.tabWidth) as '2' | '4'}
          onChange={v => set('tabWidth', Number(v) as 2 | 4)}
        />
      </SettingRow>
      <SettingRow label="Word Wrap" sublabel="Wrap long lines within the editor viewport">
        <Toggle value={s.wordWrap} onChange={v => set('wordWrap', v)} />
      </SettingRow>

      <SectionHeader>Display</SectionHeader>
      <SettingRow label="Line Numbers" sublabel="Show line numbers in the code editor">
        <Toggle value={s.showLineNums} onChange={v => set('showLineNums', v)} />
      </SettingRow>
      <SettingRow label="Minimap" sublabel="Show a scrollable overview on the right edge of the editor">
        <Toggle value={s.showMinimap} onChange={v => set('showMinimap', v)} />
      </SettingRow>

      <SectionHeader>Syntax Theme</SectionHeader>
      <div className="px-6 py-3 grid grid-cols-2 gap-2">
        {SYNTAX_THEMES.map(t => (
          <button
            key={t.value}
            onClick={() => set('syntaxTheme', t.value as AppSettings['syntaxTheme'])}
            className={`
              flex items-center gap-2.5 px-3 py-2.5 border-2 text-left transition-all
              ${s.syntaxTheme === t.value ? 'border-ink' : 'border-ink/30 hover:border-ink/60'}
            `}
          >
            <span
              className="w-5 h-5 border border-ink/30 flex-shrink-0"
              style={{ background: t.preview }}
            />
            <span className={`font-mono text-[10px] leading-tight ${s.syntaxTheme === t.value ? 'font-bold text-ink' : 'text-ink-dim'}`}>
              {t.label}
            </span>
            {s.syntaxTheme === t.value && (
              <Check size={10} className="ml-auto text-ink flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Keybindings ─────────────────────────────────────────────────────────
const SHORTCUTS = [
  { section: 'Editor',   keys: [['Ctrl', 'S'], ['Save file to localStorage']] },
  { section: 'Editor',   keys: [['Ctrl', 'F'], ['Toggle find bar']] },
  { section: 'Editor',   keys: [['Tab'], ['Insert 2 spaces']] },
  { section: 'Editor',   keys: [['Escape'], ['Dismiss selection hint / search']] },
  { section: 'Explain',  keys: [['Select text', '+', 'Click Explain'], ['Trigger AI explanation']] },
  { section: 'Explain',  keys: [['Open in Chat'], ['Send explanation to Overview chat']] },
  { section: 'Nav',      keys: [['Ctrl', '1'], ['Go to Overview']] },
  { section: 'Nav',      keys: [['Ctrl', '2'], ['Go to Explorer']] },
  { section: 'Terminal', keys: [['Ctrl', 'C'], ['Interrupt running process']] },
  { section: 'Terminal', keys: [['Tab'], ['Autocomplete']] },
] as const

function KeybindingsTab() {
  const grouped = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS[number][]>>((acc, s) => {
    (acc[s.section] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col">
      {Object.entries(grouped).map(([section, items]) => (
        <div key={section}>
          <SectionHeader>{section}</SectionHeader>
          <div className="px-6 pb-3 flex flex-col gap-1">
            {items.map((item, i) => {
              const [keysArr, descArr] = item.keys
              const desc = Array.isArray(descArr) ? descArr[0] : descArr
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-ink/10 last:border-0">
                  <span className="font-body text-[12px] text-ink-dim">{desc}</span>
                  <div className="flex items-center gap-1">
                    {(Array.isArray(keysArr) ? keysArr : [keysArr]).map((k, j) => (
                      k === '+' || k === 'then'
                        ? <span key={j} className="font-mono text-[10px] text-ink-muted">{k}</span>
                        : <kbd key={j} className="font-mono text-[10px] px-1.5 py-0.5 border border-ink/40 bg-paper-dim text-ink">{k}</kbd>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────
type TabId = 'general' | 'ai' | 'local-llms' | 'editor' | 'keybindings'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general',     label: 'General',     icon: <Settings size={14} strokeWidth={1.8} /> },
  { id: 'ai',          label: 'AI & Models', icon: <Zap size={14} strokeWidth={1.8} /> },
  { id: 'local-llms',  label: 'Local LLMs',  icon: <Cpu size={14} strokeWidth={1.8} /> },
  { id: 'editor',      label: 'Editor',      icon: <Code2 size={14} strokeWidth={1.8} /> },
  { id: 'keybindings', label: 'Keybindings', icon: <Keyboard size={14} strokeWidth={1.8} /> },
]

export function SettingsPage() {
  const [settings, setSettings]  = useState<AppSettings>(loadSettings)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [saved, setSaved]         = useState(false)
  const [dirty, setDirty]         = useState(false)

  const set = useCallback(<K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }))
    setDirty(true)
    setSaved(false)
  }, [])

  const handleSave = useCallback(() => {
    saveSettings(settings)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [settings])

  const handleReset = useCallback(() => {
    setSettings(DEFAULTS)
    setDirty(true)
    setSaved(false)
  }, [])

  // Auto-save on tab change
  useEffect(() => {
    if (dirty) saveSettings(settings)
  }, [activeTab, dirty, settings])

  const tabProps = { s: settings, set }

  return (
    <AppShell topbarTitle="Settings">
      <div className="flex h-full overflow-hidden">

        {/* ── Left nav ─────────────────────────────────────────────────────── */}
        <div className="w-[200px] flex-shrink-0 border-r-2 border-ink flex flex-col bg-paper overflow-hidden">
          <div className="px-4 pt-5 pb-3 border-b border-ink/20 flex-shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">Settings</p>
            <p className="font-heading font-bold text-[22px] text-ink mt-1 leading-none">Config</p>
          </div>
          <nav className="flex flex-col flex-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-4 py-3 text-left font-mono text-[11px] font-medium
                  border-l-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-l-ink bg-ink text-paper-bright'
                    : 'border-l-transparent text-ink-dim hover:bg-paper-dim hover:text-ink'
                  }
                `}
              >
                <span className={activeTab === tab.id ? 'text-accent-yellow' : 'text-ink-muted'}>
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && <ChevronRight size={10} className="ml-auto text-accent-yellow" />}
              </button>
            ))}
          </nav>

          {/* Save / Reset buttons */}
          <div className="border-t-2 border-ink p-3 flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              className={`
                btn w-full justify-center text-[11px] py-2
                ${saved ? 'btn-primary' : dirty ? 'btn-primary' : 'btn-outline opacity-60'}
              `}
            >
              {saved ? <><Check size={12} /> Saved</> : <><Save size={12} /> Save</>}
            </button>
            <button
              onClick={handleReset}
              className="btn btn-outline w-full justify-center text-[11px] py-2 text-accent-red border-accent-red/40 hover:border-accent-red"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tab header bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-paper flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-accent-yellow">
                {TABS.find(t => t.id === activeTab)?.icon}
              </span>
              <h1 className="font-heading font-bold text-[24px] text-ink leading-none">
                {TABS.find(t => t.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {dirty && !saved && (
                <span className="font-mono text-[10px] text-accent-yellow flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow" />
                  Unsaved changes
                </span>
              )}
              {saved && (
                <span className="font-mono text-[10px] text-[#4EC9B0] flex items-center gap-1.5 animate-fadein">
                  <Check size={11} /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Tab content */}
          <div className={`flex-1 overflow-y-auto min-h-0 ${activeTab === 'local-llms' ? 'flex flex-col' : ''}`}>
            {activeTab === 'general'     && <GeneralTab     {...tabProps} />}
            {activeTab === 'ai'          && <AIModelsTab    {...tabProps} />}
            {activeTab === 'local-llms'  && <LocalLLMsTab   {...tabProps} />}
            {activeTab === 'editor'      && <EditorTab      {...tabProps} />}
            {activeTab === 'keybindings' && <KeybindingsTab />}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
