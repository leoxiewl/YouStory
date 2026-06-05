"use client"

import { useEffect, useState, type ReactNode } from "react"
import clsx from "clsx"
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  FileText,
  GitBranch,
  Layers,
  WandSparkles,
} from "lucide-react"
import {
  workflowStageDefinitions,
  workflowStageStatusLabels,
} from "@/lib/workflow"
import type {
  EpisodeWorkflowStage,
  RecordEntry,
  StoryEpisode,
  StoryProject,
  WorkflowStageStatus,
} from "@/lib/types"

export function EpisodeWorkflowView({
  project,
  episode,
  sourceRecord,
  onBackToProject,
}: {
  project: StoryProject
  episode: StoryEpisode
  sourceRecord?: RecordEntry
  onBackToProject: () => void
}) {
  const [selectedStageId, setSelectedStageId] = useState(episode.workflow[0]?.stageId)
  const selectedStage =
    episode.workflow.find((stage) => stage.stageId === selectedStageId) ?? episode.workflow[0]

  useEffect(() => {
    setSelectedStageId(episode.workflow[0]?.stageId)
  }, [episode.id, episode.workflow])

  if (!selectedStage) {
    return (
      <div className="w-full rounded-2xl border border-line bg-white p-6 shadow-soft">
        这个单集还没有流程。
      </div>
    )
  }

  return (
    <div className="w-full">
      <button
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
        onClick={onBackToProject}
        type="button"
      >
        <ArrowLeft size={16} />
        返回全部剧集
      </button>

      <div className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-3 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-medium text-story">
              {project.title} · 第 {episode.episodeNumber} 集
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">{episode.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-quiet">{episode.summary}</p>
          </div>
          <span className="rounded-full bg-paper px-3 py-1.5 text-sm text-quiet">
            已启动 {getEpisodeProgress(episode)} / 5
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-line bg-paper p-3">
            {episode.workflow.map((stage, index) => {
              const definition = workflowStageDefinitions.find((item) => item.id === stage.stageId)

              return (
                <button
                  className={clsx(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left transition",
                    selectedStage.stageId === stage.stageId ? "bg-white shadow-sm" : "hover:bg-white/70",
                  )}
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.stageId)}
                  type="button"
                >
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      selectedStage.stageId === stage.stageId ? "bg-ink text-white" : "bg-white text-ink",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{definition?.label ?? stage.stageId}</span>
                    <span
                      className={clsx(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        getWorkflowStatusClass(stage.status),
                      )}
                    >
                      {workflowStageStatusLabels[stage.status]}
                    </span>
                  </span>
                </button>
              )
            })}
          </aside>

          <section className="min-w-0">
            <StageContent
              episode={episode}
              project={project}
              sourceRecord={sourceRecord}
              stage={selectedStage}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

function StageContent({
  episode,
  project,
  sourceRecord,
  stage,
}: {
  episode: StoryEpisode
  project: StoryProject
  sourceRecord?: RecordEntry
  stage: EpisodeWorkflowStage
}) {
  const definition = workflowStageDefinitions.find((item) => item.id === stage.stageId)

  return (
    <div className="rounded-2xl border border-line bg-[#fbfbfa] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{definition?.label ?? stage.stageId}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-quiet">{definition?.description}</p>
        </div>
        <span className={clsx("rounded-full px-3 py-1 text-sm font-medium", getWorkflowStatusClass(stage.status))}>
          {workflowStageStatusLabels[stage.status]}
        </span>
      </div>

      {stage.stageId === "script_writing" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <ScriptPanel episode={episode} />
          <SourceRecordPanel sourceRecord={sourceRecord} />
        </div>
      ) : null}

      {stage.stageId === "storyboard_design" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <StoryboardPanel episode={episode} project={project} sourceRecord={sourceRecord} />
          <WorkflowInputsPanel episode={episode} stage={stage} />
        </div>
      ) : null}

      {stage.stageId === "video_generation" ? (
        <StagePlaceholder
          title="视频生成素材"
          points={[
            "文字生成视频：等待根据镜头描述生成片段。",
            "图片生成视频：等待使用分镜帧生成动态镜头。",
            "首尾帧生成视频：等待补充镜头首帧和尾帧。",
          ]}
        />
      ) : null}

      {stage.stageId === "voiceover_sound" ? (
        <StagePlaceholder
          title="配音及音效素材"
          points={[
            "旁白音色：等待选择角色或旁白声线。",
            "背景音乐：等待匹配剧情情绪。",
            "剧情节点音效：等待对齐剧本或分镜节点。",
          ]}
        />
      ) : null}

      {stage.stageId === "post_production_editing" ? (
        <StagePlaceholder
          title="后期剪辑素材"
          points={[
            "自动拆镜：等待视频片段生成后整理镜头。",
            "卡点剪辑：等待音频轨道和节奏点。",
            "画面修复：等待标记闪烁、扭曲或变形问题。",
          ]}
        />
      ) : null}
    </div>
  )
}

function SourceRecordPanel({ sourceRecord }: { sourceRecord?: RecordEntry }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold">来源记录</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-quiet">
        {sourceRecord?.body ?? "未找到来源记录。"}
      </p>
    </div>
  )
}

function StoryboardPanel({
  project,
  episode,
  sourceRecord,
}: {
  project: StoryProject
  episode: StoryEpisode
  sourceRecord?: RecordEntry
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold">分镜草稿</h3>
      <div className="mt-4 space-y-3">
        {makeStoryboard(project, episode, sourceRecord).map((scene) => (
          <div className="flex gap-3 rounded-xl border border-line bg-[#fbfbfa] p-3" key={scene.title}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper">
              <FileText size={18} />
            </div>
            <div>
              <p className="font-medium">{scene.title}</p>
              <p className="mt-1 text-sm leading-6 text-quiet">{scene.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StagePlaceholder({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-quiet">
        {points.map((point) => (
          <li className="flex gap-2" key={point}>
            <CircleDot className="mt-1.5 shrink-0 text-story" size={14} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScriptPanel({ episode }: { episode: StoryEpisode }) {
  return (
    <div className="rounded-2xl border border-line bg-[#fbfbfa] p-5">
      <div className="flex items-center gap-2">
        <WandSparkles className="text-story" size={18} />
        <h2 className="font-semibold">剧本创作占位</h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {episode.keywords.map((keyword) => (
          <span className="rounded-full bg-white px-3 py-1 text-sm text-quiet shadow-sm" key={keyword}>
            {keyword}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-line bg-white p-4">
        <p className="text-sm font-medium text-quiet">初稿</p>
        <p className="mt-2 text-sm leading-7">{episode.script.draft || "等待根据关键词生成剧本初稿。"}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ScriptList
          icon={<CheckCircle2 size={16} />}
          title="爽点与高光"
          items={episode.script.payoffMoments}
          fallback="等待标记情绪高点。"
        />
        <ScriptList
          icon={<GitBranch size={16} />}
          title="剧情分支"
          items={episode.script.plotBranches}
          fallback="等待生成多个剧情走向。"
        />
      </div>
    </div>
  )
}

function WorkflowInputsPanel({
  episode,
  stage,
}: {
  episode: StoryEpisode
  stage?: EpisodeWorkflowStage
}) {
  const stages = stage ? [stage] : episode.workflow

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-2">
        <Layers className="text-story" size={18} />
        <h2 className="font-semibold">流程输入与输出</h2>
      </div>
      <div className="mt-4 space-y-3">
        {stages.map((item) => {
          const definition = workflowStageDefinitions.find((stageDefinition) => stageDefinition.id === item.stageId)

          return (
            <div className="rounded-xl border border-line bg-[#fbfbfa] p-3" key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{definition?.label ?? item.stageId}</p>
                <span className="text-xs text-quiet">{workflowStageStatusLabels[item.status]}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-quiet">
                输入：{item.inputs.length > 0 ? item.inputs.join("、") : "待补充"}
              </p>
              <p className="text-sm leading-6 text-quiet">
                输出：{item.outputs.length > 0 ? item.outputs.join("、") : "待生成"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScriptList({
  icon,
  title,
  items,
  fallback,
}: {
  icon: ReactNode
  title: string
  items: string[]
  fallback: string
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-quiet">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {(items.length > 0 ? items : [fallback]).map((item) => (
          <li className="flex gap-2" key={item}>
            <CircleDot className="mt-1 shrink-0 text-story" size={14} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function getWorkflowStatusClass(status: WorkflowStageStatus) {
  return clsx({
    "bg-neutral-100 text-neutral-600": status === "not_started",
    "bg-sky-100 text-sky-700": status === "drafting",
    "bg-amber-100 text-amber-700": status === "reviewing",
    "bg-emerald-100 text-emerald-700": status === "approved",
    "bg-rose-100 text-rose-700": status === "needs_revision",
  })
}

function getEpisodeProgress(episode: StoryEpisode) {
  return episode.workflow.filter((stage) => stage.status !== "not_started").length
}

function makeStoryboard(project: StoryProject, episode: StoryEpisode, sourceRecord?: RecordEntry) {
  const baseText = sourceRecord?.body ?? episode.summary

  return [
    {
      title: "开场",
      body: `${project.title}第 ${episode.episodeNumber} 集的环境和时间被建立，画面先保留真实记录里的气氛。`,
    },
    {
      title: "人物与情绪",
      body: episode.emotionalTone
        ? `镜头靠近人物动作、表情或沉默，整体情绪保持${episode.emotionalTone}。`
        : "镜头靠近人物动作、表情或沉默，让这段记录的情绪变得可见。",
    },
    {
      title: "记忆定格",
      body: deriveSummary(baseText),
    },
  ]
}

function deriveSummary(body: string) {
  const compact = body.replace(/\s+/g, " ").trim()
  return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact
}
