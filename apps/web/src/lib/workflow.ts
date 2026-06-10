import type {
  EpisodeProductionState,
  EpisodeScriptState,
  EpisodeWorkflowStage,
  StoryEpisode,
  StoryProject,
  WorkflowStageId,
  WorkflowStageStatus,
} from "./types"

export type WorkflowStageDefinition = {
  id: WorkflowStageId
  label: string
  shortLabel: string
  description: string
}

export const workflowStageDefinitions: WorkflowStageDefinition[] = [
  {
    id: "raw_content",
    label: "原始内容",
    shortLabel: "原始",
    description: "保存本集的小说原文、人生记录或剧情素材，作为后续生产的源材料。",
  },
  {
    id: "ai_rewrite",
    label: "AI 改写",
    shortLabel: "改写",
    description: "把原始内容整理成可拍摄、可分镜的格式化剧本。",
  },
  {
    id: "extract_characters_scenes",
    label: "提取角色与场景",
    shortLabel: "提取",
    description: "从剧本中提取角色、场景、道具和特效，进入后续制作资产表。",
  },
  {
    id: "voice_casting",
    label: "分配音色",
    shortLabel: "音色",
    description: "根据角色身份和性格分配本地预设音色，并记录试听状态。",
  },
  {
    id: "storyboard_list",
    label: "分镜列表",
    shortLabel: "分镜",
    description: "逐条检查镜头、景别、对白、音效和提示词，形成可生产镜头序列。",
  },
  {
    id: "character_images",
    label: "角色形象",
    shortLabel: "角色图",
    description: "为可视化角色生成形象占位，跟踪角色一致性素材状态。",
  },
  {
    id: "scene_images",
    label: "场景图片",
    shortLabel: "场景图",
    description: "为本集场景生成背景图占位，作为镜头画面参考。",
  },
  {
    id: "dubbing_generation",
    label: "配音生成",
    shortLabel: "配音",
    description: "根据分镜对白生成本地配音占位，标记已完成和待补充镜头。",
  },
  {
    id: "shot_images",
    label: "镜头图片",
    shortLabel: "镜头图",
    description: "为每个分镜生成首帧和尾帧占位，服务后续图生视频。",
  },
  {
    id: "video_generation",
    label: "视频生成",
    shortLabel: "视频",
    description: "使用镜头提示词、首帧和尾帧占位生成单镜头视频状态。",
  },
  {
    id: "compose_export",
    label: "合成导出",
    shortLabel: "导出",
    description: "把镜头视频、配音和节奏信息合成为本地成片占位并完成单集流程。",
  },
]

export const workflowStageStatusLabels: Record<WorkflowStageStatus, string> = {
  not_started: "未开始",
  drafting: "生成或编辑中",
  reviewing: "待用户确认",
  approved: "已确认",
  needs_revision: "需要修改",
}

export function createDefaultWorkflow(
  episodeId: string,
  overrides: Partial<Record<WorkflowStageId, Partial<EpisodeWorkflowStage>>> = {},
): EpisodeWorkflowStage[] {
  return workflowStageDefinitions.map((stage) => ({
    id: `${episodeId}-${stage.id}`,
    stageId: stage.id,
    status: "not_started",
    inputs: [],
    outputs: [],
    ...overrides[stage.id],
  }))
}

export function createScriptState(
  draft: string,
  payoffMoments: string[] = [],
  plotBranches: string[] = [],
): EpisodeScriptState {
  return {
    draft,
    payoffMoments,
    plotBranches,
  }
}

export function createProductionState(
  production?: Partial<EpisodeProductionState>,
): EpisodeProductionState {
  return {
    characterAssets: production?.characterAssets ?? {},
    sceneAssets: production?.sceneAssets ?? {},
    storyboardAssets: production?.storyboardAssets ?? {},
    export: production?.export,
    updatedAt: production?.updatedAt ?? new Date().toISOString(),
  }
}

export function normalizeStoryProject(project: Partial<StoryProject>): StoryProject {
  const id = project.id ?? createStableFallbackId("project")
  const title = project.title ?? "未命名剧集"
  const summary = project.summary ?? "这个项目还没有摘要。"
  const sourceRecordId = project.sourceRecordId ?? ""
  const createdAt = project.createdAt ?? new Date().toISOString()
  const seriesTheme = project.seriesTheme ?? deriveSeriesTheme(summary)
  const episodes =
    Array.isArray(project.episodes)
      ? project.episodes.map((episode, index) => normalizeEpisode(episode, id, index + 1, summary))
      : []

  return {
    id,
    title,
    sourceRecordId,
    summary,
    seriesTheme,
    targetEpisodeCount: project.targetEpisodeCount ?? episodes.length,
    episodes,
    status: project.status ?? "draft",
    createdAt,
  }
}

export function createStoryEpisode({
  projectId,
  episodeNumber,
  title,
  summary,
  keywords,
  emotionalTone,
  scriptDraft,
  payoffMoments = [],
  plotBranches = [],
}: {
  projectId: string
  episodeNumber: number
  title: string
  summary: string
  keywords: string[]
  emotionalTone?: string
  scriptDraft: string
  payoffMoments?: string[]
  plotBranches?: string[]
}): StoryEpisode {
  const episodeId = `${projectId}-episode-${episodeNumber}`

  return {
    id: episodeId,
    projectId,
    episodeNumber,
    title,
    summary,
    keywords,
    emotionalTone,
    script: createScriptState(scriptDraft, payoffMoments, plotBranches),
    novelToScript: undefined,
    production: createProductionState(),
    workflow: createDefaultWorkflow(episodeId, {
      raw_content: {
        status: scriptDraft ? "approved" : "not_started",
        inputs: keywords,
        outputs: scriptDraft ? ["原始内容"] : [],
      },
      ai_rewrite: {
        status: scriptDraft ? "reviewing" : "not_started",
        inputs: keywords,
        outputs: scriptDraft ? ["剧本初稿", "剧情分支", "爽点清单"] : [],
        notes: "本地版使用模拟改写与结构化拆解，不接真实生成服务。",
      },
    }),
  }
}

function normalizeEpisode(
  episode: Partial<StoryEpisode>,
  projectId: string,
  fallbackNumber: number,
  projectSummary: string,
): StoryEpisode {
  const episodeNumber = episode.episodeNumber ?? fallbackNumber
  const id = episode.id ?? `${projectId}-episode-${episodeNumber}`
  const summary = episode.summary ?? projectSummary
  const keywords = Array.isArray(episode.keywords) ? episode.keywords : deriveKeywords(summary)
  const script = episode.script ?? createScriptState(summary)
  const novelToScript = episode.novelToScript
  const production = createProductionState(episode.production)

  return {
    id,
    projectId,
    episodeNumber,
    title: episode.title ?? `第 ${episodeNumber} 集`,
    summary,
    keywords,
    emotionalTone: episode.emotionalTone,
    script,
    novelToScript,
    production,
    workflow: normalizeWorkflow(id, episode.workflow, keywords, script, novelToScript, production),
  }
}

function normalizeWorkflow(
  episodeId: string,
  workflow: Partial<EpisodeWorkflowStage>[] | undefined,
  keywords: string[],
  script: EpisodeScriptState,
  novelToScript: StoryEpisode["novelToScript"],
  production: EpisodeProductionState,
) {
  const existing = Array.isArray(workflow) ? workflow : []

  return workflowStageDefinitions.map((definition) => {
    const stage = existing.find((item) => item.stageId === definition.id)
    const inferred = inferWorkflowStage(definition.id, keywords, script, novelToScript, production)

    return {
      id: stage?.id ?? `${episodeId}-${definition.id}`,
      stageId: definition.id,
      status: stage?.status ?? inferred.status,
      inputs: Array.isArray(stage?.inputs) ? stage.inputs : inferred.inputs,
      outputs: Array.isArray(stage?.outputs) ? stage.outputs : inferred.outputs,
      notes: stage?.notes ?? inferred.notes,
    }
  })
}

function inferWorkflowStage(
  stageId: WorkflowStageId,
  keywords: string[],
  script: EpisodeScriptState,
  novelToScript: StoryEpisode["novelToScript"],
  production: EpisodeProductionState,
): Pick<EpisodeWorkflowStage, "status" | "inputs" | "outputs" | "notes"> {
  const hasRaw = Boolean(novelToScript?.novelText || script.draft)
  const hasScript = Boolean(script.draft)
  const result = novelToScript?.result
  const characters = result?.characters ?? []
  const scenes = result?.scenes ?? []
  const storyboards = result?.storyboards ?? []
  const characterAssets = Object.values(production.characterAssets)
  const sceneAssets = Object.values(production.sceneAssets)
  const storyboardAssets = Object.values(production.storyboardAssets)

  if (stageId === "raw_content") {
    return {
      status: hasRaw ? "approved" : "not_started",
      inputs: keywords,
      outputs: hasRaw ? ["原始内容"] : [],
    }
  }

  if (stageId === "ai_rewrite") {
    return {
      status: hasScript ? "reviewing" : "not_started",
      inputs: hasRaw ? ["原始内容"] : keywords,
      outputs: hasScript ? ["格式化剧本"] : [],
    }
  }

  if (stageId === "extract_characters_scenes") {
    const ready = characters.length > 0 || scenes.length > 0
    return {
      status: ready ? "reviewing" : "not_started",
      inputs: hasScript ? ["格式化剧本"] : [],
      outputs: ready ? ["角色表", "场景表", "道具/特效表"] : [],
    }
  }

  if (stageId === "voice_casting") {
    const voiced = characters.length > 0 && characters.every((character) => production.characterAssets[character.id]?.voiceId)
    return {
      status: voiced ? "approved" : characters.length ? "drafting" : "not_started",
      inputs: characters.length ? ["角色表"] : [],
      outputs: voiced ? ["角色音色"] : [],
    }
  }

  if (stageId === "storyboard_list") {
    return {
      status: storyboards.length ? "reviewing" : "not_started",
      inputs: result ? ["格式化剧本", "角色表", "场景表"] : [],
      outputs: storyboards.length ? ["分镜列表", "镜头提示词"] : [],
    }
  }

  if (stageId === "character_images") {
    const ready = characters.length > 0 && characterAssets.filter((asset) => asset.imageStatus === "ready").length >= characters.length
    return {
      status: ready ? "approved" : characters.length ? "drafting" : "not_started",
      inputs: characters.length ? ["角色表"] : [],
      outputs: ready ? ["角色形象"] : [],
    }
  }

  if (stageId === "scene_images") {
    const ready = scenes.length > 0 && sceneAssets.filter((asset) => asset.imageStatus === "ready").length >= scenes.length
    return {
      status: ready ? "approved" : scenes.length ? "drafting" : "not_started",
      inputs: scenes.length ? ["场景表"] : [],
      outputs: ready ? ["场景图片"] : [],
    }
  }

  if (stageId === "dubbing_generation") {
    const eligible = storyboards.filter((storyboard) => storyboard.dialogue && !storyboard.dialogue.includes("无对白"))
    const ready = eligible.length > 0 && eligible.every((storyboard) => production.storyboardAssets[storyboard.id]?.ttsStatus === "ready")
    return {
      status: ready ? "approved" : eligible.length ? "drafting" : "not_started",
      inputs: eligible.length ? ["分镜对白", "角色音色"] : [],
      outputs: ready ? ["对白配音"] : [],
    }
  }

  if (stageId === "shot_images") {
    const ready = storyboards.length > 0 && storyboards.every((storyboard) => {
      const asset = production.storyboardAssets[storyboard.id]
      return asset?.firstFrameStatus === "ready" && asset.lastFrameStatus === "ready"
    })
    return {
      status: ready ? "approved" : storyboards.length ? "drafting" : "not_started",
      inputs: storyboards.length ? ["分镜列表", "角色形象", "场景图片"] : [],
      outputs: ready ? ["镜头首帧", "镜头尾帧"] : [],
    }
  }

  if (stageId === "video_generation") {
    const ready = storyboards.length > 0 && storyboards.every((storyboard) => production.storyboardAssets[storyboard.id]?.videoStatus === "ready")
    return {
      status: ready ? "approved" : storyboards.length ? "drafting" : "not_started",
      inputs: storyboards.length ? ["镜头图片", "视频提示词"] : [],
      outputs: ready ? ["镜头视频"] : [],
    }
  }

  return {
    status: production.export?.status === "ready" ? "approved" : "not_started",
    inputs: production.export?.status === "ready" ? ["镜头视频", "配音"] : [],
    outputs: production.export?.status === "ready" ? ["本地成片"] : [],
  }
}

function deriveSeriesTheme(summary: string) {
  return summary.length > 28 ? `${summary.slice(0, 28)}...` : summary
}

function deriveKeywords(text: string) {
  return text
    .replace(/[，。！？、,.!?]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
}

function createStableFallbackId(prefix: string) {
  return `${prefix}-${Date.now()}`
}
