// Mock chat types — will be replaced with real API types in logic phase
export type Intent =
  | 'code_highlight_qa'
  | 'free_question'
  | 'file_analysis'
  | 'folder_analysis'
  | 'project_analysis'

export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error'

export interface CodeSelection {
  file: string
  startLine: number
  endLine: number
  text: string
}

export interface Citation {
  file: string
  startLine: number
  endLine: number
  label?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  intent?: Intent
  selection?: CodeSelection
  citations?: Citation[]
  model?: string
  tokens?: { input: number; output: number }
  durationMs?: number
  timestamp: Date
}

export interface ProjectStats {
  totalFiles: number
  sourceLines: string
  languages: { name: string; pct: number; color: string }[]
  techStack: string[]
  indexingStatus: 'idle' | 'indexing' | 'complete' | 'error'
  indexingProgress?: number // 0–100
  lastIndexed?: string
}

export interface ProviderStatus {
  llm: { name: string; model: string; status: 'ok' | 'error' | 'checking' }
  embedding: { name: string; status: 'ok' | 'error' }
  vectorStore: { name: string; status: 'ok' | 'error' }
  stt: { name: string; status: 'ok' | 'disabled' }
  tts: { name: string; status: 'ok' | 'disabled' }
}
