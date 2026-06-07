/**
 * YouStorys API Client
 *
 * 代理路径：前端通过 /local-api/* → next.config 转发到 http://localhost:5678/*
 * 此模块提供类型安全的封装，并在 backend 类型与 frontend 类型之间做桥接。
 */

const BASE = "/local-api/api/v1"

// ─── 基础 fetch 封装 ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? `API error ${res.status}`)
  return json.data as T
}

// ─── Backend 数据类型（与 local-api schema 对应）─────────────────────────────

export type ApiRecord = {
  id: number
  title: string
  body: string
  category: string
  createdAt: string
  updatedAt: string
}

export type ApiProject = {
  id: number
  title: string
  summary: string | null
  seriesTheme: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type ApiEpisode = {
  id: number
  projectId: number
  episodeNumber: number
  title: string
  summary: string | null
  rawContent: string | null
  scriptContent: string | null
  imageConfigId: number | null
  videoConfigId: number | null
  audioConfigId: number | null
  createdAt: string
  updatedAt: string
}

export type ApiCharacter = {
  id: number
  projectId: number
  name: string
  role: string | null
  description: string | null
  appearance: string | null
  personality: string | null
  voiceProvider: string | null
  voiceId: string | null
  imageUrl: string | null
  imagePrompt: string | null
  createdAt: string
  updatedAt: string
}

export type ApiScene = {
  id: number
  projectId: number
  name: string
  description: string | null
  atmosphere: string | null
  imageUrl: string | null
  imagePrompt: string | null
  createdAt: string
  updatedAt: string
}

export type ApiStoryboard = {
  id: number
  episodeId: number
  orderIndex: number
  shotType: string | null
  angle: string | null
  movement: string | null
  duration: number | null
  dialogue: string | null
  narration: string | null
  bgmNote: string | null
  soundEffect: string | null
  imagePrompt: string | null
  videoPrompt: string | null
  imageUrl: string | null
  videoUrl: string | null
  ttsAudioUrl: string | null
  composedVideoUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type ApiPipelineStatus = {
  episode: ApiEpisode
  characters: ApiCharacter[]
  scenes: ApiScene[]
  storyboards: ApiStoryboard[]
  progress: {
    hasRawContent: boolean
    hasScript: boolean
    hasCharacters: boolean
    hasScenes: boolean
    hasVoices: boolean
    hasStoryboards: boolean
    hasCharacterImages: boolean
    hasSceneImages: boolean
    hasTts: boolean
    hasShotImages: boolean
    hasVideos: boolean
    hasComposedVideos: boolean
  }
}

export type ApiAgentResult = {
  type: "done"
  text: string
  toolCalls: Array<{ toolName: string; args: unknown }>
  toolResults: Array<{ toolName: string; result: unknown }>
}

export type ApiComposeResult = {
  message: string
  storyboardId?: number
  episodeId?: number
  count?: number
  composedVideoUrl?: string
  composed?: Array<{ storyboardId: number; composedVideoUrl: string }>
}

export type ApiMergeResult = {
  id: number
  status: string
  episodeId: number
  mergedUrl?: string
  localPath?: string
  errorMsg?: string
}

export type ApiAiServiceType = "text" | "image" | "video" | "tts"

export type ApiAiConfig = {
  id: number
  serviceType: ApiAiServiceType
  provider: string
  name: string
  baseUrl: string | null
  apiKey: string | null
  hasApiKey?: boolean
  model: string | null
  extraParams: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ApiPipelineRunResult = ApiPipelineStatus & {
  message: string
  episodeId: number
  textConfigId: number | null
  imageConfigId: number | null
  videoConfigId: number | null
  audioConfigId: number | null
  composed: Array<{ storyboardId: number; composedVideoUrl: string }>
  merge: {
    id: number
    status: string
    episodeId: number
    mergedUrl?: string
  }
}

// ─── Records ─────────────────────────────────────────────────────────────────

export const recordsApi = {
  list: () => apiFetch<ApiRecord[]>("/records"),

  get: (id: number) => apiFetch<ApiRecord>(`/records/${id}`),

  create: (data: { title: string; body: string; category: string }) =>
    apiFetch<ApiRecord>("/records", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ title: string; body: string; category: string }>) =>
    apiFetch<ApiRecord>(`/records/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) => apiFetch<{ id: number }>(`/records/${id}`, { method: "DELETE" }),
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => apiFetch<ApiProject[]>("/projects"),

  get: (id: number) => apiFetch<ApiProject>(`/projects/${id}`),

  create: (data: { title: string; summary?: string; seriesTheme?: string }) =>
    apiFetch<ApiProject>("/projects", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ title: string; summary: string; seriesTheme: string; status: string }>) =>
    apiFetch<ApiProject>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  listEpisodes: (projectId: number) =>
    apiFetch<ApiEpisode[]>(`/projects/${projectId}/episodes`),
}

// ─── Episodes ────────────────────────────────────────────────────────────────

export const episodesApi = {
  get: (id: number) => apiFetch<ApiEpisode>(`/episodes/${id}`),

  create: (data: {
    projectId: number
    episodeNumber: number
    title: string
    summary?: string
    rawContent?: string
  }) => apiFetch<ApiEpisode>("/episodes", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<ApiEpisode>) =>
    apiFetch<ApiEpisode>(`/episodes/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  pipelineStatus: (id: number) =>
    apiFetch<ApiPipelineStatus>(`/episodes/${id}/pipeline-status`),

  listCharacters: (id: number) => apiFetch<ApiCharacter[]>(`/episodes/${id}/characters`),

  listScenes: (id: number) => apiFetch<ApiScene[]>(`/episodes/${id}/scenes`),

  listStoryboards: (id: number) => apiFetch<ApiStoryboard[]>(`/episodes/${id}/storyboards`),
}

// ─── Characters ──────────────────────────────────────────────────────────────

export const charactersApi = {
  create: (data: {
    projectId: number
    episodeId?: number
    name: string
    role?: string
    description?: string
    appearance?: string
    personality?: string
  }) => apiFetch<ApiCharacter>("/characters", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<ApiCharacter>) =>
    apiFetch<ApiCharacter>(`/characters/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  generateImage: (id: number) =>
    apiFetch<{ message: string; characterId: number }>(`/characters/${id}/generate-image`, { method: "POST" }),

  generateVoiceSample: (id: number) =>
    apiFetch<{ message: string; characterId: number }>(`/characters/${id}/generate-voice-sample`, { method: "POST" }),
}

// ─── Scenes ──────────────────────────────────────────────────────────────────

export const scenesApi = {
  create: (data: { projectId: number; episodeId?: number; name: string; description?: string; atmosphere?: string }) =>
    apiFetch<ApiScene>("/scenes", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<ApiScene>) =>
    apiFetch<ApiScene>(`/scenes/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  generateImage: (id: number) =>
    apiFetch<{ message: string; sceneId: number }>(`/scenes/${id}/generate-image`, { method: "POST" }),
}

// ─── Storyboards ─────────────────────────────────────────────────────────────

export const storyboardsApi = {
  create: (data: Partial<ApiStoryboard> & { episodeId: number; orderIndex: number }) =>
    apiFetch<ApiStoryboard>("/storyboards", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<ApiStoryboard>) =>
    apiFetch<ApiStoryboard>(`/storyboards/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiFetch<{ id: number }>(`/storyboards/${id}`, { method: "DELETE" }),

  generateTts: (id: number) =>
    apiFetch<{ message: string; storyboardId: number; audioUrl?: string }>(`/storyboards/${id}/generate-tts`, { method: "POST" }),

  generateImage: (id: number) =>
    apiFetch<{ message: string; storyboardId: number; imageUrl?: string }>(`/storyboards/${id}/generate-image`, { method: "POST" }),

  generateVideo: (id: number) =>
    apiFetch<{ message: string; storyboardId: number; videoUrl?: string }>(`/storyboards/${id}/generate-video`, { method: "POST" }),
}

// ─── Compose / Merge ────────────────────────────────────────────────────────

export const composeApi = {
  storyboard: (id: number) =>
    apiFetch<ApiComposeResult>(`/compose/storyboards/${id}/compose`, { method: "POST" }),

  episode: (id: number) =>
    apiFetch<ApiComposeResult>(`/compose/episodes/${id}/compose-all`, { method: "POST" }),

  status: (id: number) =>
    apiFetch<{ total: number; composed: number; progress: number }>(`/compose/episodes/${id}/compose-status`),
}

export const mergeApi = {
  episode: (id: number) =>
    apiFetch<ApiMergeResult>(`/merge/episodes/${id}/merge`, { method: "POST" }),

  get: (id: number) =>
    apiFetch<ApiMergeResult | null>(`/merge/episodes/${id}/merge`),
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export const agentApi = {
  chat: (params: {
    type: "story_adapter" | "world_builder" | "storyboard_breaker" | "voice_caster" | "visual_director"
    message: string
    projectId: number
    episodeId: number
  }) =>
    apiFetch<ApiAgentResult>(`/agent/${params.type}/chat`, {
      method: "POST",
      body: JSON.stringify({
        message: params.message,
        project_id: params.projectId,
        episode_id: params.episodeId,
      }),
    }),
}

// ─── AI Configs ──────────────────────────────────────────────────────────────

export const aiConfigsApi = {
  list: () => apiFetch<ApiAiConfig[]>("/ai-configs"),

  defaults: () => apiFetch<Array<ApiAiConfig | null>>("/ai-configs/defaults"),

  create: (data: Partial<ApiAiConfig> & {
    serviceType: ApiAiServiceType
    provider: string
    name: string
    apiKey?: string
  }) => apiFetch<ApiAiConfig>("/ai-configs", { method: "POST", body: JSON.stringify(data) }),

  update: (id: number, data: Partial<ApiAiConfig> & { apiKey?: string }) =>
    apiFetch<ApiAiConfig>(`/ai-configs/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiFetch<{ id: number }>(`/ai-configs/${id}`, { method: "DELETE" }),
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export const pipelineApi = {
  runDefault: (episodeId: number, data: { novelText?: string }) =>
    apiFetch<ApiPipelineRunResult>(`/pipeline/episodes/${episodeId}/run-default`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
}
