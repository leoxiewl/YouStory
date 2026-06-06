"use client"

import { useCallback, useRef, useState } from "react"
import { agentApi, type ApiAgentResult } from "@/lib/api"

export type AgentType =
  | "story_adapter"
  | "world_builder"
  | "storyboard_breaker"
  | "voice_caster"
  | "visual_director"

export function useAgent() {
  const [running, setRunning] = useState(false)
  const [runningType, setRunningType] = useState<AgentType | null>(null)
  const [lastResult, setLastResult] = useState<ApiAgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(
    async (
      type: AgentType,
      message: string,
      projectId: number,
      episodeId: number,
      options?: { onDone?: (result: ApiAgentResult) => void },
    ) => {
      if (running) return null

      setRunning(true)
      setRunningType(type)
      setError(null)
      setLastResult(null)

      abortRef.current = new AbortController()

      try {
        const result = await agentApi.chat({ type, message, projectId, episodeId })
        setLastResult(result)
        options?.onDone?.(result)
        return result
      } catch (e) {
        const msg = (e as Error).message
        setError(msg)
        return null
      } finally {
        setRunning(false)
        setRunningType(null)
        abortRef.current = null
      }
    },
    [running],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setRunning(false)
    setRunningType(null)
  }, [])

  return { running, runningType, lastResult, error, run, cancel }
}
