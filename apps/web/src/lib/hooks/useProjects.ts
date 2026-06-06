"use client"

import { useCallback, useEffect, useState } from "react"
import { projectsApi, episodesApi, type ApiProject, type ApiEpisode } from "@/lib/api"
import type { StoryEpisode, StoryProject } from "@/lib/types"
import { createDefaultWorkflow, createProductionState, createScriptState, normalizeStoryProject } from "@/lib/workflow"

// ─── 类型转换：ApiProject + ApiEpisode[] → StoryProject ─────────────────────

/**
 * 将 API 返回的 episode 转为前端 StoryEpisode。
 * 保留 API 整数 id（转为字符串），避免 createStoryEpisode 覆盖 id。
 */
function toStoryEpisode(e: ApiEpisode): StoryEpisode {
  const episodeId = String(e.id)
  const projectId = String(e.projectId)
  const scriptDraft = e.scriptContent ?? e.rawContent ?? ""

  return {
    id: episodeId,
    projectId,
    episodeNumber: e.episodeNumber,
    title: e.title,
    summary: e.summary ?? "",
    keywords: [],
    emotionalTone: undefined,
    script: createScriptState(scriptDraft),
    novelToScript: undefined,
    production: createProductionState(),
    workflow: createDefaultWorkflow(episodeId, {
      raw_content: {
        status: e.rawContent ? "approved" : "not_started",
        outputs: e.rawContent ? ["原始内容"] : [],
      },
      ai_rewrite: {
        status: e.scriptContent ? "approved" : "not_started",
        outputs: e.scriptContent ? ["AI 改写剧本"] : [],
      },
    }),
  }
}

function toStoryProject(p: ApiProject, episodes: ApiEpisode[]): StoryProject {
  return normalizeStoryProject({
    id: String(p.id),
    title: p.title,
    sourceRecordId: "",
    summary: p.summary ?? "",
    seriesTheme: p.seriesTheme ?? "",
    status: p.status as StoryProject["status"],
    createdAt: p.createdAt,
    episodes: episodes.map(toStoryEpisode),
  })
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProjects() {
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const apiProjects = await projectsApi.list()
      // 并发拉取每个项目的集数
      const projectsWithEpisodes = await Promise.all(
        apiProjects.map(async (p) => {
          const episodes = await projectsApi.listEpisodes(p.id)
          return toStoryProject(p, episodes)
        }),
      )
      setProjects(projectsWithEpisodes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createProject = useCallback(
    async (data: { title: string; summary?: string; seriesTheme?: string }) => {
      const apiProject = await projectsApi.create(data)
      const project = toStoryProject(apiProject, [])
      setProjects((prev) => [project, ...prev])
      return project
    },
    [],
  )

  const addEpisode = useCallback(
    async (projectId: string, data: { title: string; rawContent?: string }) => {
      // 找到 project 获取当前集数
      const project = projects.find((p) => p.id === projectId)
      const episodeNumber = (project?.episodes.length ?? 0) + 1
      const apiEpisode = await episodesApi.create({
        projectId: Number(projectId),
        episodeNumber,
        title: data.title,
        rawContent: data.rawContent,
        summary: `围绕「${project?.title ?? ""}」继续展开的新一集。`,
      })
      const episode = toStoryEpisode(apiEpisode)
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, episodes: [...p.episodes, episode] }
            : p,
        ),
      )
      return episode
    },
    [projects],
  )

  const updateEpisode = useCallback(
    async (updatedEpisode: StoryEpisode) => {
      // 同步更新本地 state（UI 反应快），后台也可 patch API
      setProjects((prev) =>
        prev.map((p) =>
          p.id === updatedEpisode.projectId
            ? {
                ...p,
                episodes: p.episodes.map((e) =>
                  e.id === updatedEpisode.id ? updatedEpisode : e,
                ),
              }
            : p,
        ),
      )

      // 将关键字段同步到 API（非关键路径，失败不阻塞 UI）
      try {
        await episodesApi.update(Number(updatedEpisode.id), {
          title: updatedEpisode.title,
          summary: updatedEpisode.summary,
          rawContent: updatedEpisode.script?.draft ?? undefined,
        })
      } catch (e) {
        console.warn("Failed to sync episode to API:", e)
      }
    },
    [],
  )

  return {
    projects,
    loading,
    error,
    refresh,
    createProject,
    addEpisode,
    updateEpisode,
  }
}
