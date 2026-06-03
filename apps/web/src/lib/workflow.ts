import type {
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
    id: "script_writing",
    label: "剧本创作",
    shortLabel: "剧本",
    description: "根据关键词、人生记录或源材料生成初稿、爽点清单和剧情分支。",
  },
  {
    id: "storyboard_design",
    label: "分镜设计",
    shortLabel: "分镜",
    description: "把剧本拆解成镜头、画面候选和可调整的视觉风格。",
  },
  {
    id: "video_generation",
    label: "视频生成",
    shortLabel: "视频",
    description: "使用文字、图片、首帧和尾帧约束生成单集镜头片段。",
  },
  {
    id: "voiceover_sound",
    label: "配音及音效",
    shortLabel: "音频",
    description: "匹配旁白、角色声线、背景音乐、节点音效和本地化版本。",
  },
  {
    id: "post_production_editing",
    label: "后期剪辑",
    shortLabel: "剪辑",
    description: "组装镜头、对齐声音节奏，并追踪闪烁、扭曲、变形等修复任务。",
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

export function normalizeStoryProject(project: Partial<StoryProject>): StoryProject {
  const id = project.id ?? createStableFallbackId("project")
  const title = project.title ?? "未命名剧集"
  const summary = project.summary ?? "这个项目还没有摘要。"
  const sourceRecordId = project.sourceRecordId ?? ""
  const createdAt = project.createdAt ?? new Date().toISOString()
  const seriesTheme = project.seriesTheme ?? deriveSeriesTheme(summary)
  const episodes =
    Array.isArray(project.episodes) && project.episodes.length > 0
      ? project.episodes.map((episode, index) => normalizeEpisode(episode, id, index + 1, summary))
      : [
          createStoryEpisode({
            projectId: id,
            episodeNumber: 1,
            title,
            summary,
            keywords: deriveKeywords(summary),
            emotionalTone: "真实、克制、带一点回望感",
            scriptDraft: summary,
            payoffMoments: ["真实记录里的情绪高点"],
            plotBranches: ["保留真实叙事", "强化转折与告别", "改写为更具戏剧张力的版本"],
          }),
        ]

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
    workflow: createDefaultWorkflow(episodeId, {
      script_writing: {
        status: scriptDraft ? "reviewing" : "not_started",
        inputs: keywords,
        outputs: scriptDraft ? ["剧本初稿", "剧情分支", "爽点清单"] : [],
        notes: "第一版先展示结构化占位，后续接入真实生成能力。",
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

  return {
    id,
    projectId,
    episodeNumber,
    title: episode.title ?? `第 ${episodeNumber} 集`,
    summary,
    keywords,
    emotionalTone: episode.emotionalTone,
    script,
    workflow:
      Array.isArray(episode.workflow) && episode.workflow.length === workflowStageDefinitions.length
        ? episode.workflow
        : createDefaultWorkflow(id, {
            script_writing: {
              status: script.draft ? "reviewing" : "not_started",
              inputs: keywords,
              outputs: script.draft ? ["剧本初稿"] : [],
            },
          }),
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
