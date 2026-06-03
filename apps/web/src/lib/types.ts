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
  workflow: EpisodeWorkflowStage[]
}

export type EpisodeScriptState = {
  draft: string
  payoffMoments: string[]
  plotBranches: string[]
}

export type WorkflowStageId =
  | "script_writing"
  | "storyboard_design"
  | "video_generation"
  | "voiceover_sound"
  | "post_production_editing"

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

export type ActiveView =
  | "new-record"
  | "record-list"
  | "record-detail"
  | "project-detail"
  | "episode-workflow"
  | "search"
