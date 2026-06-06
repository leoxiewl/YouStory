"use client"

import { useCallback, useEffect, useState } from "react"
import { recordsApi, type ApiRecord } from "@/lib/api"
import type { RecordCategory, RecordEntry } from "@/lib/types"

// ─── 类型转换：ApiRecord ↔ RecordEntry ───────────────────────────────────────

const CATEGORY_FROM_API: Record<string, RecordCategory> = {
  diary: "日记",
  reflection: "随感",
  memory: "回忆",
  travel: "旅行",
  family: "家人",
  growth: "成长",
  // 直接存储中文的兼容
  日记: "日记",
  随感: "随感",
  回忆: "回忆",
  旅行: "旅行",
  家人: "家人",
  成长: "成长",
}

const CATEGORY_TO_API: Record<RecordCategory, string> = {
  日记: "diary",
  随感: "reflection",
  回忆: "memory",
  旅行: "travel",
  家人: "family",
  成长: "growth",
}

function toRecordEntry(r: ApiRecord): RecordEntry {
  return {
    id: String(r.id),
    title: r.title,
    body: r.body,
    category: CATEGORY_FROM_API[r.category] ?? "日记",
    createdAt: r.createdAt,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRecords() {
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const apiRecords = await recordsApi.list()
      setRecords(apiRecords.map(toRecordEntry).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createRecord = useCallback(async (data: { title: string; body: string; category: RecordCategory }) => {
    const apiRecord = await recordsApi.create({
      title: data.title,
      body: data.body,
      category: CATEGORY_TO_API[data.category],
    })
    const entry = toRecordEntry(apiRecord)
    setRecords((prev) => [entry, ...prev])
    return entry
  }, [])

  const updateRecord = useCallback(async (id: string, data: Partial<{ title: string; body: string; category: RecordCategory }>) => {
    const apiId = Number(id)
    const apiRecord = await recordsApi.update(apiId, {
      title: data.title,
      body: data.body,
      category: data.category ? CATEGORY_TO_API[data.category] : undefined,
    })
    const entry = toRecordEntry(apiRecord)
    setRecords((prev) => prev.map((r) => (r.id === id ? entry : r)))
    return entry
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    await recordsApi.delete(Number(id))
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { records, loading, error, refresh, createRecord, updateRecord, deleteRecord }
}
