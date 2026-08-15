import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, CodeSelection, Intent } from '@/types/chat'

let msgCounter = 0
const mkId = () => `msg-${++msgCounter}-${Date.now()}`

// Mock streaming — will be replaced with real SSE in logic phase
const MOCK_RESPONSES: Record<string, string> = {
  default: `I've analyzed your question against the project context.

The codebase is structured around a **provider-agnostic architecture** where all external services (LLM, embeddings, vector store, STT, TTS) are abstracted behind interfaces.

\`\`\`typescript
// Example: LLMProvider interface
interface LLMProvider {
  generate(prompt: string): Promise<string>
  stream(prompt: string): AsyncIterable<string>
  getModels(): Promise<string[]>
  validateConnection(): Promise<boolean>
}
\`\`\`

The entry point at \`src/main.ts\` bootstraps the core system and mounts the primary application. The \`GraphicEngine\` handles the visual layer while \`initSystem\` wires up the AI provider chain.

**Key files to explore:**
- \`src/core/system.ts\` — core bootstrapping logic
- \`src/providers/\` — LLM, embedding, vector provider implementations
- \`src/api/\` — Fastify route handlers`,

  auth: `The authentication flow follows a **transactional outbox pattern** to ensure consistency between the OAuth provider state and the internal user database.

Here's how the callback is handled:

\`\`\`typescript
async function handleCallback(code: string) {
  return await db.transaction(async (tx) => {
    const token = await oauthClient.exchangeCode(code);
    const profile = await oauthClient.getProfile(token);
    const user = await tx.users.upsert({
      where: { externalId: profile.id },
      update: { lastLogin: new Date(), ...profile },
      create: { externalId: profile.id, ...profile }
    });
    return createSession(user);
  });
}
\`\`\`

> **Citation:** \`src/auth/handlers.ts:42\` — The callback handler currently lacks a DLQ implementation.`,
}

function getResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('auth') || lower.includes('oauth') || lower.includes('login')) {
    return MOCK_RESPONSES.auth
  }
  return MOCK_RESPONSES.default
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)

  const sendMessage = useCallback(
    async (text: string, selection?: CodeSelection) => {
      if (!text.trim() || isStreaming) return

      const userMsg: ChatMessage = {
        id: mkId(),
        role: 'user',
        content: text,
        status: 'complete',
        intent: selection ? 'code_highlight_qa' : 'free_question',
        selection,
        timestamp: new Date(),
      }

      const assistantId = mkId()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        model: 'claude-sonnet-4-5',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)

      // Simulate streaming token-by-token
      const fullResponse = getResponse(text)
      const words = fullResponse.split('')
      let cancelled = false

      abortRef.current = () => { cancelled = true }

      let accumulated = ''
      for (let i = 0; i < words.length; i++) {
        if (cancelled) break
        accumulated += words[i]
        const snapshot = accumulated
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: snapshot, status: 'streaming' }
              : m
          )
        )
        // Faster for punctuation, slower for spaces to feel natural
        const delay = words[i] === ' ' ? 8 : words[i] === '\n' ? 20 : 4
        await new Promise((r) => setTimeout(r, delay))
      }

      if (!cancelled) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullResponse,
                  status: 'complete',
                  tokens: { input: 3200, output: 420 },
                  durationMs: 2400,
                  citations: [
                    { file: 'src/main.ts', startLine: 1, endLine: 31 },
                  ],
                }
              : m
          )
        )
      }

      setIsStreaming(false)
      abortRef.current = null
    },
    [isStreaming]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.()
    setIsStreaming(false)
    setMessages((prev) =>
      prev.map((m) =>
        m.status === 'streaming' ? { ...m, status: 'complete' } : m
      )
    )
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages }
}
