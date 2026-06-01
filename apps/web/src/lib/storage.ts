import type { RecordEntry, StoryProject } from "./types"

export const RECORDS_KEY = "youstory.records"
export const PROJECTS_KEY = "youstory.projects"

export function readCollection<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function writeRecords(records: RecordEntry[]) {
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export function writeProjects(projects: StoryProject[]) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}
