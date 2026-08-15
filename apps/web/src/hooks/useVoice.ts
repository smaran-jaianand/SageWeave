import { useState, useCallback, useEffect, useRef } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'disabled'

interface UseVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void
}

export function useVoice({ onTranscript }: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )

  useEffect(() => {
    if (!isSupported) {
      setState('disabled')
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setState('listening')
    recognition.onend = () => {
      setState('idle')
      setInterimText('')
    }
    recognition.onerror = () => {
      setState('idle')
      setInterimText('')
    }
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) onTranscript?.(final.trim(), true)
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [isSupported, onTranscript])

  const startListening = useCallback(() => {
    if (state === 'listening') {
      recognitionRef.current?.stop()
      return
    }
    if (state !== 'idle') return
    try {
      recognitionRef.current?.start()
    } catch {
      setState('idle')
    }
  }, [state])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { state, interimText, isSupported, startListening, stopListening }
}
