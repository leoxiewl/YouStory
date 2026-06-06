export type RecordCategory = "日记" | "随感" | "回忆" | "旅行" | "家人" | "成长"

export type RecordEntry = {
  id: string
  title: string
  body: string
  category: RecordCategory
  createdAt: string
}

export type StoryProject = {
  id: string
  title: string
  sourceRecordId: string
  summary: string
  seriesTheme: string
  targetEpisodeCount?: number
  episodes: StoryEpisode[]
  status: ProjectStatus
  createdAt: string
}

export type ProjectStatus = "draft" | "in_production" | "completed"

export type StoryEpisode = {
  id: string
  projectId: string
  episodeNumber: number
  title: string
  summary: string
  keywords: string[]
  emotionalTone?: string
  script: EpisodeScriptState
  novelToScript?: NovelToScriptState
  production?: EpisodeProductionState
  workflow: EpisodeWorkflowStage[]
}

export type EpisodeScriptState = {
  draft: string
  payoffMoments: string[]
  plotBranches: string[]
}

export type WorkflowStageId =
  | "raw_content"
  | "ai_rewrite"
  | "extract_characters_scenes"
  | "voice_casting"
  | "storyboard_list"
  | "character_images"
  | "scene_images"
  | "dubbing_generation"
  | "shot_images"
  | "video_generation"
  | "compose_export"

export type WorkflowStageStatus =
  | "not_started"
  | "drafting"
  | "reviewing"
  | "approved"
  | "needs_revision"

export type EpisodeWorkflowStage = {
  id: string
  stageId: WorkflowStageId
  status: WorkflowStageStatus
  inputs: string[]
  outputs: string[]
  notes?: string
}

export type LocalProductionStatus =
  | "idle"
  | "generating"
  | "ready"
  | "needs_revision"

export type EpisodeProductionState = {
  characterAssets: Record<string, CharacterProductionAsset>
  sceneAssets: Record<string, SceneProductionAsset>
  storyboardAssets: Record<string, StoryboardProductionAsset>
  export?: ExportProductionAsset
  updatedAt: string
}

export type CharacterProductionAsset = {
  voiceId?: string
  voiceName?: string
  voiceSampleStatus?: LocalProductionStatus
  imageStatus?: LocalProductionStatus
  imageLabel?: string
  updatedAt?: string
}

export type SceneProductionAsset = {
  imageStatus?: LocalProductionStatus
  imageLabel?: string
  updatedAt?: string
}

export type StoryboardProductionAsset = {
  ttsStatus?: LocalProductionStatus
  firstFrameStatus?: LocalProductionStatus
  firstFrameUrl?: string
  firstFrameLabel?: string
  lastFrameStatus?: LocalProductionStatus
  lastFrameUrl?: string
  lastFrameLabel?: string
  videoStatus?: LocalProductionStatus
  updatedAt?: string
}

export type ExportProductionAsset = {
  status: LocalProductionStatus
  title?: string
  generatedAt?: string
}

export type NovelToScriptStatus =
  | "idle"
  | "generating"
  | "reviewing"
  | "approved"
  | "needs_revision"

export type NovelToScriptState = {
  novelText: string
  status: NovelToScriptStatus
  result?: NovelToScriptResult
  updatedAt: string
}

export type NovelToScriptResult = {
  characters: ScriptCharacter[]
  scenes: ScriptScene[]
  propsEffects: ScriptPropEffect[]
  storyboards: ScriptStoryboard[]
}

export type ScriptCharacter = {
  id: string
  name: string
  age: string
  appearance: string
  profile: string
}

export type ScriptScene = {
  id: string
  name: string
  environment: string
  prompt: string
}

export type ScriptPropEffect = {
  id: string
  name: string
  type: "prop" | "effect"
  description: string
  prompt: string
}

export type ScriptStoryboard = {
  id: string
  shotNumber: string
  shotSize: string
  durationSeconds?: number
  cameraAngle?: string
  cameraMove?: string
  location?: string
  timeOfDay?: string
  cameraLogic: string
  visualDescription: string
  action?: string
  result?: string
  atmosphere?: string
  prompt: string
  dialogue: string
  sound: string
  characterIds: string[]
  sceneId: string
  propEffectIds: string[]
  reviewStatus: "original" | "edited" | "needs_review"
}

export type ActiveView =
  | "new-record"
  | "record-list"
  | "record-detail"
  | "project-detail"
  | "episode-workflow"
  | "search"
