"use client"

import { useEffect, useState, type ReactNode } from "react"
import clsx from "clsx"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleDot,
  Download,
  FileText,
  ImagePlus,
  Layers,
  Loader2,
  MapPin,
  Mic,
  Sparkles,
  UserRound,
  Video,
  WandSparkles,
} from "lucide-react"
import {
  workflowStageDefinitions,
  workflowStageStatusLabels,
} from "@/lib/workflow"
import { StoryboardListEditor } from "./storyboard-list-editor"
import type {
  EpisodeWorkflowStage,
  NovelToScriptResult,
  RecordEntry,
  ScriptCharacter,
  ScriptPropEffect,
  ScriptScene,
  ScriptStoryboard,
  StoryEpisode,
  StoryProject,
  WorkflowStageId,
  WorkflowStageStatus,
} from "@/lib/types"

export function EpisodeWorkflowView({
  project,
  episode,
  sourceRecord,
  onBackToProject,
  onUpdateEpisode,
}: {
  project: StoryProject
  episode: StoryEpisode
  sourceRecord?: RecordEntry
  onBackToProject: () => void
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const [selectedStageId, setSelectedStageId] = useState(episode.workflow[0]?.stageId)
  const selectedStage =
    episode.workflow.find((stage) => stage.stageId === selectedStageId) ?? episode.workflow[0]

  useEffect(() => {
    setSelectedStageId(episode.workflow[0]?.stageId)
  }, [episode.id])

  useEffect(() => {
    setSelectedStageId((currentStageId) => {
      if (episode.workflow.some((stage) => stage.stageId === currentStageId)) {
        return currentStageId
      }

      return episode.workflow[0]?.stageId
    })
  }, [episode.workflow])

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
            已启动 {getEpisodeProgress(episode)} / {episode.workflow.length}
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
              onUpdateEpisode={onUpdateEpisode}
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
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  project: StoryProject
  sourceRecord?: RecordEntry
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
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

      {stage.stageId === "raw_content" ? (
        <RawContentWorkspace
          episode={episode}
          sourceRecord={sourceRecord}
          stage={stage}
          onUpdateEpisode={onUpdateEpisode}
        />
      ) : null}

      {stage.stageId === "ai_rewrite" ? (
        <RewriteWorkspace
          episode={episode}
          sourceRecord={sourceRecord}
          stage={stage}
          onUpdateEpisode={onUpdateEpisode}
        />
      ) : null}

      {stage.stageId === "extract_characters_scenes" ? (
        <NovelToScriptWorkspace
          episode={episode}
          sourceRecord={sourceRecord}
          onUpdateEpisode={onUpdateEpisode}
        />
      ) : null}

      {stage.stageId === "voice_casting" ? (
        <VoiceCastingWorkspace episode={episode} stage={stage} onUpdateEpisode={onUpdateEpisode} />
      ) : null}

      {stage.stageId === "storyboard_list" ? (
        <StoryboardListWorkspace episode={episode} project={project} sourceRecord={sourceRecord} onUpdateEpisode={onUpdateEpisode} />
      ) : null}

      {stage.stageId === "character_images" ? (
        <CharacterImagesWorkspace episode={episode} stage={stage} onUpdateEpisode={onUpdateEpisode} />
      ) : null}

      {stage.stageId === "scene_images" ? (
        <SceneImagesWorkspace episode={episode} stage={stage} onUpdateEpisode={onUpdateEpisode} />
      ) : null}

      {stage.stageId === "dubbing_generation" ? (
        <StoryboardAssetWorkspace
          buttonLabel="生成配音"
          emptyText="当前还没有可生成配音的对白分镜。"
          field="ttsStatus"
          icon={<Mic size={18} />}
          readyOutput="对白配音"
          stage={stage}
          title="配音生成"
          episode={episode}
          onUpdateEpisode={onUpdateEpisode}
          filter={(storyboard) => Boolean(storyboard.dialogue && !storyboard.dialogue.includes("无对白"))}
        />
      ) : null}

      {stage.stageId === "shot_images" ? (
        <StoryboardAssetWorkspace
          buttonLabel="生成首尾帧"
          emptyText="请先完成分镜列表。"
          field="frameStatus"
          icon={<ImagePlus size={18} />}
          readyOutput="镜头首尾帧"
          stage={stage}
          title="镜头图片"
          episode={episode}
          onUpdateEpisode={onUpdateEpisode}
        />
      ) : null}

      {stage.stageId === "video_generation" ? (
        <StoryboardAssetWorkspace
          buttonLabel="生成视频"
          emptyText="请先完成分镜列表。"
          field="videoStatus"
          icon={<Video size={18} />}
          readyOutput="镜头视频"
          stage={stage}
          title="视频生成"
          episode={episode}
          onUpdateEpisode={onUpdateEpisode}
        />
      ) : null}

      {stage.stageId === "compose_export" ? (
        <ComposeExportWorkspace episode={episode} stage={stage} onUpdateEpisode={onUpdateEpisode} />
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

function RawContentWorkspace({
  episode,
  sourceRecord,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  sourceRecord?: RecordEntry
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const initialText = episode.novelToScript?.novelText || sourceRecord?.body || episode.script.draft || ""
  const [rawText, setRawText] = useState(initialText)

  useEffect(() => {
    setRawText(episode.novelToScript?.novelText || sourceRecord?.body || episode.script.draft || "")
  }, [episode.id, episode.novelToScript?.novelText, episode.script.draft, sourceRecord?.body])

  function saveRawContent() {
    const cleanedText = rawText.trim()

    onUpdateEpisode({
      ...episode,
      novelToScript: {
        novelText: cleanedText,
        status: episode.novelToScript?.status ?? "idle",
        result: episode.novelToScript?.result,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: cleanedText ? "approved" : "not_started",
        inputs: episode.keywords,
        outputs: cleanedText ? ["原始内容"] : [],
      }),
    })
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[22px] border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">本集源材料</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-quiet">
              保存小说章节、人生记录或剧情片段，后续改写、提取和分镜都会从这里继续。
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            onClick={saveRawContent}
            type="button"
          >
            <Check size={16} />
            保存原文
          </button>
        </div>
        <textarea
          className="mt-4 min-h-64 w-full resize-y rounded-2xl border border-line bg-[#fbfbfa] px-4 py-3 text-base leading-7 outline-none transition placeholder:text-[#b8b8b2] focus:border-ink focus:bg-white"
          onChange={(event) => setRawText(event.target.value)}
          placeholder="粘贴小说原文、故事大纲或人生片段..."
          value={rawText}
        />
      </div>
      <WorkflowInputsPanel episode={episode} stage={stage} />
    </div>
  )
}

function RewriteWorkspace({
  episode,
  sourceRecord,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  sourceRecord?: RecordEntry
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const rawText = episode.novelToScript?.novelText || sourceRecord?.body || episode.summary
  const [draft, setDraft] = useState(episode.script.draft)

  useEffect(() => {
    setDraft(episode.script.draft)
  }, [episode.id, episode.script.draft])

  function saveDraft(nextDraft = draft) {
    const cleanedDraft = nextDraft.trim()

    onUpdateEpisode({
      ...episode,
      script: {
        ...episode.script,
        draft: cleanedDraft,
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: cleanedDraft ? "approved" : "not_started",
        inputs: rawText ? ["原始内容"] : episode.keywords,
        outputs: cleanedDraft ? ["格式化剧本"] : [],
      }),
    })
  }

  function mockRewrite() {
    const rewritten = [
      `【本集主题】${episode.title}`,
      `【情绪基调】${episode.emotionalTone || "真实、克制、有记忆感"}`,
      "【剧情正文】",
      rawText.trim() || episode.summary,
      "【制作提示】保留真实细节，把关键动作、沉默和转折拆成可拍摄段落。",
    ].join("\n")

    setDraft(rewritten)
    saveDraft(rewritten)
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="rounded-[22px] border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">格式化剧本</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-quiet">
              本地版使用模拟改写，把原始内容整理成后续提取和分镜可用的剧本文本。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
              onClick={() => saveDraft(rawText)}
              type="button"
            >
              <FileText size={16} />
              跳过改写
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              onClick={mockRewrite}
              type="button"
            >
              <Sparkles size={16} />
              模拟改写
            </button>
          </div>
        </div>
        <textarea
          className="mt-4 min-h-64 w-full resize-y rounded-2xl border border-line bg-[#fbfbfa] px-4 py-3 text-base leading-7 outline-none transition placeholder:text-[#b8b8b2] focus:border-ink focus:bg-white"
          onBlur={() => saveDraft()}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="这里会保存格式化剧本..."
          value={draft}
        />
      </div>
      <SourceRecordPanel sourceRecord={sourceRecord} />
    </div>
  )
}

function NovelToScriptWorkspace({
  episode,
  sourceRecord,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  sourceRecord?: RecordEntry
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const initialText = episode.novelToScript?.novelText || sourceRecord?.body || episode.script.draft || ""
  const [novelText, setNovelText] = useState(initialText)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setNovelText(episode.novelToScript?.novelText || sourceRecord?.body || episode.script.draft || "")
    setError("")
  }, [episode.id, episode.novelToScript?.novelText, episode.script.draft, sourceRecord?.body])

  const novelState = episode.novelToScript
  const result = novelState?.result
  const status = generating ? "generating" : novelState?.status ?? "idle"

  function persistNovelText(nextText: string) {
    setNovelText(nextText)
    onUpdateEpisode({
      ...episode,
      novelToScript: {
        novelText: nextText,
        status: novelState?.status ?? "idle",
        result: novelState?.result,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  function persistResult(nextResult: NovelToScriptResult) {
    const nextStatus = novelState?.status === "approved" ? "needs_revision" : "reviewing"

    onUpdateEpisode({
      ...episode,
      novelToScript: {
        novelText,
        status: nextStatus,
        result: nextResult,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowForScriptReview(episode.workflow, nextStatus),
    })
  }

  async function generateStoryboards() {
    const cleanedText = novelText.trim()

    if (!cleanedText) {
      setError("请输入小说文案后再拆解分镜。")
      return
    }

    setGenerating(true)
    setError("")
    onUpdateEpisode({
      ...episode,
      novelToScript: {
        novelText: cleanedText,
        status: "generating",
        result,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowForScriptReview(episode.workflow, "generating"),
    })

    try {
      const response = await fetch("/api/novel-to-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeId: episode.id,
          novelText: cleanedText,
        }),
      })
      const data = (await response.json()) as { result?: NovelToScriptResult; error?: string }

      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "拆解失败，请稍后重试。")
      }

      onUpdateEpisode({
        ...episode,
        script: {
          ...episode.script,
          draft: formatScriptDraft(data.result),
        },
        novelToScript: {
          novelText: cleanedText,
          status: "reviewing",
          result: data.result,
          updatedAt: new Date().toISOString(),
        },
        workflow: updateWorkflowForScriptReview(episode.workflow, "reviewing"),
      })
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "拆解失败，请稍后重试。")
      onUpdateEpisode({
        ...episode,
        novelToScript: {
          novelText: cleanedText,
          status: result ? "needs_revision" : "idle",
          result,
          updatedAt: new Date().toISOString(),
        },
        workflow: updateWorkflowForScriptReview(episode.workflow, result ? "needs_revision" : "idle"),
      })
    } finally {
      setGenerating(false)
    }
  }

  function confirmStoryboards() {
    if (!result) {
      setError("请先拆解出分镜脚本，再确认。")
      return
    }

    onUpdateEpisode({
      ...episode,
      script: {
        ...episode.script,
        draft: formatScriptDraft(result),
      },
      novelToScript: {
        novelText,
        status: "approved",
        result,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowForScriptApproved(episode.workflow),
    })
    setError("")
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[22px] border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <WandSparkles className="text-story" size={18} />
              <h3 className="font-semibold">小说到剧本 Agent</h3>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-quiet">
              输入小说文案后，一键拆解为角色、场景、道具/特效和可 Review 的 AI 分镜脚本。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx("rounded-full px-3 py-1 text-sm font-medium", getNovelStatusClass(status))}>
              {getNovelStatusLabel(status)}
            </span>
            {novelState?.updatedAt ? (
              <span className="rounded-full bg-paper px-3 py-1 text-sm text-quiet">
                已保存 {formatShortTime(novelState.updatedAt)}
              </span>
            ) : null}
          </div>
        </div>

        <textarea
          className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-line bg-[#fbfbfa] px-4 py-3 text-base leading-7 outline-none transition placeholder:text-[#b8b8b2] focus:border-ink focus:bg-white"
          onChange={(event) => persistNovelText(event.target.value)}
          placeholder="粘贴小说章节、关键段落或剧情文案。例：门被猛地拉开，少年从雨夜里冲进来，手里攥着那封没有寄出的信..."
          value={novelText}
        />

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {episode.keywords.map((keyword) => (
              <span className="rounded-full bg-paper px-3 py-1 text-sm text-quiet" key={keyword}>
                {keyword}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={generating}
              onClick={generateStoryboards}
              type="button"
            >
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              一键拆解分镜
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!result}
              onClick={confirmStoryboards}
              type="button"
            >
              <Check size={16} />
              确认剧本分镜
            </button>
          </div>
        </div>
      </div>

      {result ? (
        <ExtractionReviewBoard result={result} onChange={persistResult} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm leading-7 text-quiet">
            生成后这里会显示分镜一、分镜二等结构化卡片，可直接修改镜号、景别、逻辑镜头、提示词、对白和音效。
          </div>
          <SourceRecordPanel sourceRecord={sourceRecord} />
        </div>
      )}
    </div>
  )
}

const voiceProfiles = [
  { id: "narrator_warm", name: "温暖旁白", description: "温柔、克制，适合回忆和独白。" },
  { id: "young_clear", name: "清亮青年", description: "干净、真诚，适合年轻主角。" },
  { id: "mature_low", name: "沉稳低音", description: "稳重、有距离感，适合长辈或旁白。" },
  { id: "soft_bright", name: "明亮女声", description: "细腻、轻快，适合女性角色。" },
]

function VoiceCastingWorkspace({
  episode,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const result = episode.novelToScript?.result
  const characters = result?.characters ?? []
  const production = ensureProductionState(episode)

  function updateVoice(characterId: string, voiceId: string) {
    const voice = voiceProfiles.find((item) => item.id === voiceId)
    const nextProduction = {
      ...production,
      characterAssets: {
        ...production.characterAssets,
        [characterId]: {
          ...production.characterAssets[characterId],
          voiceId,
          voiceName: voice?.name ?? voiceId,
          voiceSampleStatus: "ready" as const,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    }
    const allVoiced = characters.every((character) => nextProduction.characterAssets[character.id]?.voiceId)

    onUpdateEpisode({
      ...episode,
      production: nextProduction,
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: allVoiced ? "approved" : "drafting",
        inputs: ["角色表"],
        outputs: allVoiced ? ["角色音色", "试听占位"] : ["部分角色音色"],
      }),
    })
  }

  function autoAssignVoices() {
    const nextAssets = { ...production.characterAssets }
    characters.forEach((character, index) => {
      const voice = voiceProfiles[index % voiceProfiles.length]
      nextAssets[character.id] = {
        ...nextAssets[character.id],
        voiceId: voice.id,
        voiceName: voice.name,
        voiceSampleStatus: "ready",
        updatedAt: new Date().toISOString(),
      }
    })

    onUpdateEpisode({
      ...episode,
      production: {
        ...production,
        characterAssets: nextAssets,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: characters.length ? "approved" : "not_started",
        inputs: characters.length ? ["角色表"] : [],
        outputs: characters.length ? ["角色音色", "试听占位"] : [],
      }),
    })
  }

  if (!characters.length) {
    return (
      <StagePlaceholder
        title="等待角色表"
        points={["请先完成“提取角色与场景”，这里会出现角色音色分配表。"]}
      />
    )
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center gap-2">
          <Mic className="text-story" size={18} />
          <h3 className="font-semibold">音色库</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-quiet">
          本地版先记录音色选择和试听状态，后续可替换为真实 TTS 服务。
        </p>
        <div className="mt-4 space-y-3">
          {voiceProfiles.map((voice) => (
            <div className="rounded-xl border border-line bg-[#fbfbfa] p-3" key={voice.id}>
              <p className="font-medium">{voice.name}</p>
              <p className="mt-1 text-sm leading-6 text-quiet">{voice.description}</p>
            </div>
          ))}
        </div>
        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          onClick={autoAssignVoices}
          type="button"
        >
          <Sparkles size={16} />
          AI 自动分配
        </button>
      </aside>

      <div className="grid gap-3 lg:grid-cols-2">
        {characters.map((character) => {
          const asset = production.characterAssets[character.id]

          return (
            <div className="rounded-[22px] border border-line bg-white p-4 shadow-sm" key={character.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper font-semibold text-story">
                  {character.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{character.name}</h3>
                    <span className={clsx("rounded-full px-2.5 py-1 text-xs", asset?.voiceId ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
                      {asset?.voiceId ? "已分配" : "待分配"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-quiet">{character.profile || character.appearance}</p>
                </div>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-medium text-quiet">选择音色</span>
                <select
                  className="w-full rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-sm outline-none transition focus:border-ink focus:bg-white"
                  onChange={(event) => updateVoice(character.id, event.target.value)}
                  value={asset?.voiceId ?? ""}
                >
                  <option value="">待选择</option>
                  {voiceProfiles.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </label>
              {asset?.voiceName ? (
                <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm text-quiet">
                  试听占位：{asset.voiceName} · {asset.voiceSampleStatus === "ready" ? "已生成" : "待生成"}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StoryboardListWorkspace({
  episode,
  project,
  sourceRecord,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  project: StoryProject
  sourceRecord?: RecordEntry
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const result = episode.novelToScript?.result

  if (!result) {
    return (
      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <StoryboardPanel episode={episode} project={project} sourceRecord={sourceRecord} />
        <StagePlaceholder
          title="等待 AI 分镜脚本"
          points={["请先完成“提取角色与场景”，再在这里逐条检查镜头列表。"]}
        />
      </div>
    )
  }

  function persistResult(nextResult: NovelToScriptResult) {
    onUpdateEpisode({
      ...episode,
      novelToScript: {
        novelText: episode.novelToScript?.novelText ?? episode.script.draft,
        status: episode.novelToScript?.status ?? "reviewing",
        result: nextResult,
        updatedAt: new Date().toISOString(),
      },
      script: {
        ...episode.script,
        draft: formatScriptDraft(nextResult),
      },
      workflow: updateWorkflowStage(episode.workflow, "storyboard_list", {
        status: nextResult.storyboards.length ? "reviewing" : "not_started",
        inputs: ["格式化剧本", "角色表", "场景表"],
        outputs: nextResult.storyboards.length ? ["分镜列表", "镜头提示词"] : [],
      }),
    })
  }

  return (
    <div className="mt-5">
      <StoryboardListEditor
        episode={episode}
        result={result}
        onUpdateEpisode={onUpdateEpisode}
      />
    </div>
  )
}

function ExtractionReviewBoard({
  result,
  onChange,
}: {
  result: NovelToScriptResult
  onChange: (result: NovelToScriptResult) => void
}) {
  function updateCharacter(id: string, field: keyof Omit<ScriptCharacter, "id">, value: string) {
    onChange({
      ...result,
      characters: result.characters.map((character) =>
        character.id === id ? { ...character, [field]: value } : character,
      ),
    })
  }

  function updateScene(id: string, field: keyof Omit<ScriptScene, "id">, value: string) {
    onChange({
      ...result,
      scenes: result.scenes.map((scene) =>
        scene.id === id ? { ...scene, [field]: value } : scene,
      ),
    })
  }

  const primaryCharacters = result.characters.filter((character) => /主角|主/.test(character.profile))
  const supportCharacters = result.characters.length - primaryCharacters.length

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="rounded-[22px] border border-line bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ea0b8]">Extraction Board</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-normal">角色与场景结果</h3>
        <p className="mt-3 text-sm leading-7 text-quiet">
          从剧本里提取出的角色和场景已经入库。这里先确认命名、角色小传和场景描述是否可直接进入后续制作。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatusStat label="角色" value={`${result.characters.length}`} />
          <StatusStat label="场景" value={`${result.scenes.length}`} />
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-[#fbfbfa] p-4 text-sm leading-6 text-quiet">
          如果角色小传过于简短，后续分配音色和生成形象时建议先补充人物特征。
        </div>
        <div className="mt-4 space-y-2 text-xs text-quiet">
          <span className="inline-flex rounded-full bg-paper px-2.5 py-1">主角 {primaryCharacters.length}</span>
          <span className="ml-2 inline-flex rounded-full bg-paper px-2.5 py-1">配角 {Math.max(0, supportCharacters)}</span>
          <span className="ml-2 inline-flex rounded-full bg-paper px-2.5 py-1">道具/特效 {result.propsEffects.length}</span>
        </div>
      </aside>

      <section className="rounded-[22px] border border-line bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <UserRound className="text-story" size={18} />
          <h3 className="font-semibold">角色</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-quiet">
            {result.characters.length}
          </span>
        </div>
        <div className="grid max-h-[760px] gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          {result.characters.map((character) => (
            <div className="rounded-[20px] border border-line bg-[#fbfbfa] p-4" key={character.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-story shadow-sm">
                  {character.name.slice(0, 1) || "角"}
                </div>
                <div className="min-w-0 flex-1">
                  <EditableField
                    label="姓名"
                    value={character.name}
                    onChange={(value) => updateCharacter(character.id, "name", value)}
                  />
                </div>
              </div>
              <EditableField
                className="mt-3"
                label="人物小传描述"
                minRows={7}
                value={formatCharacterProfile(character)}
                onChange={(value) => updateCharacter(character.id, "profile", value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-line bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <MapPin className="text-story" size={18} />
          <h3 className="font-semibold">场景</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-quiet">
            {result.scenes.length}
          </span>
        </div>
        <div className="max-h-[760px] space-y-3 overflow-y-auto p-4">
          {result.scenes.map((scene) => (
            <div className="rounded-[20px] border border-line bg-[#fbfbfa] p-4" key={scene.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-story shadow-sm">
                  <MapPin size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <EditableField
                    label="场景名称"
                    value={scene.name}
                    onChange={(value) => updateScene(scene.id, "name", value)}
                  />
                </div>
              </div>
              <EditableField
                className="mt-3"
                label="场景描述"
                minRows={8}
                value={formatSceneDescription(scene)}
                onChange={(value) => updateScene(scene.id, "environment", value)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function CharacterImagesWorkspace({
  episode,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const characters = episode.novelToScript?.result?.characters ?? []
  const production = ensureProductionState(episode)

  function generateCharacterImage(characterId: string) {
    const character = characters.find((item) => item.id === characterId)
    const nextProduction = {
      ...production,
      characterAssets: {
        ...production.characterAssets,
        [characterId]: {
          ...production.characterAssets[characterId],
          imageStatus: "ready" as const,
          imageLabel: `${character?.name ?? "角色"}形象占位`,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    }
    const allReady = characters.every((item) => nextProduction.characterAssets[item.id]?.imageStatus === "ready")

    onUpdateEpisode({
      ...episode,
      production: nextProduction,
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: allReady ? "approved" : "drafting",
        inputs: ["角色表"],
        outputs: allReady ? ["角色形象"] : ["部分角色形象"],
      }),
    })
  }

  function generateAllCharacterImages() {
    const nextAssets = { ...production.characterAssets }
    characters.forEach((character) => {
      nextAssets[character.id] = {
        ...nextAssets[character.id],
        imageStatus: "ready",
        imageLabel: `${character.name}形象占位`,
        updatedAt: new Date().toISOString(),
      }
    })

    onUpdateEpisode({
      ...episode,
      production: {
        ...production,
        characterAssets: nextAssets,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: characters.length ? "approved" : "not_started",
        inputs: characters.length ? ["角色表"] : [],
        outputs: characters.length ? ["角色形象"] : [],
      }),
    })
  }

  return (
    <AssetGrid
      emptyText="请先完成角色提取。"
      icon={<UserRound size={18} />}
      items={characters.map((character) => ({
        id: character.id,
        title: character.name,
        body: character.profile || character.appearance,
        status: production.characterAssets[character.id]?.imageStatus,
        label: production.characterAssets[character.id]?.imageLabel,
      }))}
      title="角色形象"
      onGenerate={generateCharacterImage}
      onGenerateAll={generateAllCharacterImages}
    />
  )
}

function SceneImagesWorkspace({
  episode,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const scenes = episode.novelToScript?.result?.scenes ?? []
  const production = ensureProductionState(episode)

  function generateSceneImage(sceneId: string) {
    const scene = scenes.find((item) => item.id === sceneId)
    const nextProduction = {
      ...production,
      sceneAssets: {
        ...production.sceneAssets,
        [sceneId]: {
          ...production.sceneAssets[sceneId],
          imageStatus: "ready" as const,
          imageLabel: `${scene?.name ?? "场景"}图片占位`,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    }
    const allReady = scenes.every((item) => nextProduction.sceneAssets[item.id]?.imageStatus === "ready")

    onUpdateEpisode({
      ...episode,
      production: nextProduction,
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: allReady ? "approved" : "drafting",
        inputs: ["场景表"],
        outputs: allReady ? ["场景图片"] : ["部分场景图片"],
      }),
    })
  }

  function generateAllSceneImages() {
    const nextAssets = { ...production.sceneAssets }
    scenes.forEach((scene) => {
      nextAssets[scene.id] = {
        ...nextAssets[scene.id],
        imageStatus: "ready",
        imageLabel: `${scene.name}图片占位`,
        updatedAt: new Date().toISOString(),
      }
    })

    onUpdateEpisode({
      ...episode,
      production: {
        ...production,
        sceneAssets: nextAssets,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: scenes.length ? "approved" : "not_started",
        inputs: scenes.length ? ["场景表"] : [],
        outputs: scenes.length ? ["场景图片"] : [],
      }),
    })
  }

  return (
    <AssetGrid
      emptyText="请先完成场景提取。"
      icon={<MapPin size={18} />}
      items={scenes.map((scene) => ({
        id: scene.id,
        title: scene.name,
        body: scene.environment || scene.prompt,
        status: production.sceneAssets[scene.id]?.imageStatus,
        label: production.sceneAssets[scene.id]?.imageLabel,
      }))}
      title="场景图片"
      onGenerate={generateSceneImage}
      onGenerateAll={generateAllSceneImages}
    />
  )
}

function StoryboardAssetWorkspace({
  buttonLabel,
  emptyText,
  episode,
  field,
  filter,
  icon,
  readyOutput,
  stage,
  title,
  onUpdateEpisode,
}: {
  buttonLabel: string
  emptyText: string
  episode: StoryEpisode
  field: "ttsStatus" | "frameStatus" | "videoStatus"
  filter?: (storyboard: ScriptStoryboard) => boolean
  icon: ReactNode
  readyOutput: string
  stage: EpisodeWorkflowStage
  title: string
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const storyboards = (episode.novelToScript?.result?.storyboards ?? []).filter((storyboard) =>
    filter ? filter(storyboard) : true,
  )
  const production = ensureProductionState(episode)

  function getStatus(storyboardId: string) {
    const asset = production.storyboardAssets[storyboardId]

    if (field === "frameStatus") {
      return asset?.firstFrameStatus === "ready" && asset.lastFrameStatus === "ready" ? "ready" : "idle"
    }

    return asset?.[field] ?? "idle"
  }

  function generateAsset(storyboardId: string) {
    const current = production.storyboardAssets[storyboardId] ?? {}
    const nextStoryboardAsset =
      field === "frameStatus"
        ? {
            ...current,
            firstFrameStatus: "ready" as const,
            firstFrameUrl: createStoryboardFrameDataUrl(storyboardId, "首帧"),
            firstFrameLabel: "首帧参考图",
            lastFrameStatus: "ready" as const,
            lastFrameUrl: createStoryboardFrameDataUrl(storyboardId, "尾帧"),
            lastFrameLabel: "尾帧参考图",
            updatedAt: new Date().toISOString(),
          }
        : {
            ...current,
            [field]: "ready" as const,
            updatedAt: new Date().toISOString(),
          }
    const nextProduction = {
      ...production,
      storyboardAssets: {
        ...production.storyboardAssets,
        [storyboardId]: nextStoryboardAsset,
      },
      updatedAt: new Date().toISOString(),
    }
    const allReady = storyboards.every((storyboard) => {
      const asset = nextProduction.storyboardAssets[storyboard.id]
      return field === "frameStatus"
        ? asset?.firstFrameStatus === "ready" && asset.lastFrameStatus === "ready"
        : asset?.[field] === "ready"
    })

    onUpdateEpisode({
      ...episode,
      production: nextProduction,
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: allReady && storyboards.length ? "approved" : "drafting",
        inputs: ["分镜列表"],
        outputs: allReady && storyboards.length ? [readyOutput] : [`部分${readyOutput}`],
      }),
    })
  }

  function generateAllAssets() {
    const nextAssets = { ...production.storyboardAssets }
    storyboards.forEach((storyboard) => {
      const current = nextAssets[storyboard.id] ?? {}
      nextAssets[storyboard.id] =
        field === "frameStatus"
          ? {
              ...current,
              firstFrameStatus: "ready",
              firstFrameUrl: createStoryboardFrameDataUrl(storyboard.id, "首帧"),
              firstFrameLabel: "首帧参考图",
              lastFrameStatus: "ready",
              lastFrameUrl: createStoryboardFrameDataUrl(storyboard.id, "尾帧"),
              lastFrameLabel: "尾帧参考图",
              updatedAt: new Date().toISOString(),
            }
          : {
              ...current,
              [field]: "ready",
              updatedAt: new Date().toISOString(),
            }
    })

    onUpdateEpisode({
      ...episode,
      production: {
        ...production,
        storyboardAssets: nextAssets,
        updatedAt: new Date().toISOString(),
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: storyboards.length ? "approved" : "not_started",
        inputs: storyboards.length ? ["分镜列表"] : [],
        outputs: storyboards.length ? [readyOutput] : [],
      }),
    })
  }

  return (
    <AssetGrid
      emptyText={emptyText}
      icon={icon}
      items={storyboards.map((storyboard, index) => ({
        id: storyboard.id,
        title: `${storyboard.shotNumber || `分镜 ${index + 1}`} · ${storyboard.shotSize}`,
        body: storyboard.visualDescription || storyboard.dialogue || storyboard.prompt,
        status: getStatus(storyboard.id),
        label: getStatus(storyboard.id) === "ready" ? readyOutput : undefined,
      }))}
      title={title}
      generateLabel={buttonLabel}
      onGenerate={generateAsset}
      onGenerateAll={generateAllAssets}
    />
  )
}

function ComposeExportWorkspace({
  episode,
  stage,
  onUpdateEpisode,
}: {
  episode: StoryEpisode
  stage: EpisodeWorkflowStage
  onUpdateEpisode: (episode: StoryEpisode) => void
}) {
  const production = ensureProductionState(episode)
  const storyboards = episode.novelToScript?.result?.storyboards ?? []
  const videosReady = storyboards.length > 0 && storyboards.every((storyboard) => {
    return production.storyboardAssets[storyboard.id]?.videoStatus === "ready"
  })
  const exportReady = production.export?.status === "ready"

  function composeExport() {
    const generatedAt = new Date().toISOString()

    onUpdateEpisode({
      ...episode,
      production: {
        ...production,
        export: {
          status: "ready",
          title: `${episode.title} 本地成片占位`,
          generatedAt,
        },
        updatedAt: generatedAt,
      },
      workflow: updateWorkflowStage(episode.workflow, stage.stageId, {
        status: "approved",
        inputs: ["镜头视频", "配音"],
        outputs: ["本地成片"],
      }),
    })
  }

  return (
    <div className="mt-5 rounded-[22px] border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Download className="text-story" size={18} />
            <h3 className="font-semibold">合成导出</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-quiet">
            本地版把视频合成和拼接导出合并为一个完成状态，等待真实 FFmpeg 能力接入。
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!videosReady}
          onClick={composeExport}
          type="button"
        >
          <Download size={16} />
          {exportReady ? "重新合成" : "合成本集"}
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusStat label="分镜" value={`${storyboards.length}`} />
        <StatusStat
          label="视频"
          value={`${storyboards.filter((storyboard) => production.storyboardAssets[storyboard.id]?.videoStatus === "ready").length}/${storyboards.length}`}
        />
        <StatusStat label="导出" value={exportReady ? "已生成" : "待生成"} />
      </div>
      {exportReady ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
          {production.export?.title} · {production.export?.generatedAt ? `生成于 ${formatShortTime(production.export.generatedAt)}` : "已生成"}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-quiet">
          请先完成所有镜头视频生成，再合成本集。
        </p>
      )}
    </div>
  )
}

function AssetGrid({
  emptyText,
  generateLabel = "模拟生成",
  icon,
  items,
  title,
  onGenerate,
  onGenerateAll,
}: {
  emptyText: string
  generateLabel?: string
  icon: ReactNode
  items: {
    id: string
    title: string
    body: string
    status?: string
    label?: string
  }[]
  title: string
  onGenerate: (id: string) => void
  onGenerateAll: () => void
}) {
  const readyCount = items.filter((item) => item.status === "ready").length

  if (!items.length) {
    return <StagePlaceholder title={title} points={[emptyText]} />
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-quiet">
            {readyCount}/{items.length}
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          onClick={onGenerateAll}
          type="button"
        >
          <Sparkles size={16} />
          批量生成
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-[22px] border border-line bg-white p-4 shadow-sm" key={item.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line bg-[#fbfbfa] text-story">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <span className={clsx("rounded-full px-2.5 py-1 text-xs", item.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
                    {item.status === "ready" ? "已生成" : "待生成"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-quiet">{item.body || "等待补充描述。"}</p>
                {item.label ? (
                  <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-xs text-quiet">{item.label}</p>
                ) : null}
              </div>
            </div>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
              onClick={() => onGenerate(item.id)}
              type="button"
            >
              <ImagePlus size={16} />
              {item.status === "ready" ? "重新生成" : generateLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-[#fbfbfa] p-4">
      <p className="text-sm text-quiet">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  )
}

function formatCharacterProfile(character: ScriptCharacter) {
  if (/年龄：|外貌：|小传：|角色小传：|人物小传：/.test(character.profile)) {
    return character.profile
  }

  return [
    character.age ? `年龄：${character.age}` : "",
    character.appearance ? `外貌：${character.appearance}` : "",
    character.profile ? `人物小传：${character.profile}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function formatSceneDescription(scene: ScriptScene) {
  if (/场景描述：|环境：|提示词：|场景提示词：/.test(scene.environment)) {
    return scene.environment
  }

  return [
    scene.environment ? `场景描述：${scene.environment}` : "",
    scene.prompt ? `场景提示词：${scene.prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function ScriptReferenceTables({
  result,
  onChange,
}: {
  result: NovelToScriptResult
  onChange: (result: NovelToScriptResult) => void
}) {
  function updateCharacter(id: string, field: keyof Omit<ScriptCharacter, "id">, value: string) {
    onChange({
      ...result,
      characters: result.characters.map((character) =>
        character.id === id ? { ...character, [field]: value } : character,
      ),
    })
  }

  function updateScene(id: string, field: keyof Omit<ScriptScene, "id">, value: string) {
    onChange({
      ...result,
      scenes: result.scenes.map((scene) =>
        scene.id === id ? { ...scene, [field]: value } : scene,
      ),
    })
  }

  function updatePropEffect(id: string, field: keyof Omit<ScriptPropEffect, "id" | "type">, value: string) {
    onChange({
      ...result,
      propsEffects: result.propsEffects.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    })
  }

  return (
    <aside className="space-y-4">
      <ReferenceGroup title="角色表" count={result.characters.length}>
        {result.characters.map((character) => (
          <div className="rounded-2xl border border-line bg-white p-4" key={character.id}>
            <EditableField
              label="姓名"
              value={character.name}
              onChange={(value) => updateCharacter(character.id, "name", value)}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <EditableField
                label="年龄"
                value={character.age}
                onChange={(value) => updateCharacter(character.id, "age", value)}
              />
              <EditableField
                label="外貌"
                minRows={2}
                value={character.appearance}
                onChange={(value) => updateCharacter(character.id, "appearance", value)}
              />
            </div>
            <EditableField
              className="mt-3"
              label="设定"
              minRows={3}
              value={character.profile}
              onChange={(value) => updateCharacter(character.id, "profile", value)}
            />
          </div>
        ))}
      </ReferenceGroup>

      <ReferenceGroup title="场景表" count={result.scenes.length}>
        {result.scenes.map((scene) => (
          <div className="rounded-2xl border border-line bg-white p-4" key={scene.id}>
            <EditableField
              label="场景"
              value={scene.name}
              onChange={(value) => updateScene(scene.id, "name", value)}
            />
            <EditableField
              className="mt-3"
              label="环境"
              minRows={2}
              value={scene.environment}
              onChange={(value) => updateScene(scene.id, "environment", value)}
            />
            <EditableField
              className="mt-3"
              label="环境提示词"
              minRows={3}
              value={scene.prompt}
              onChange={(value) => updateScene(scene.id, "prompt", value)}
            />
          </div>
        ))}
      </ReferenceGroup>

      <ReferenceGroup title="道具/特效表" count={result.propsEffects.length}>
        {result.propsEffects.map((item) => (
          <div className="rounded-2xl border border-line bg-white p-4" key={item.id}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-quiet">
                {item.type === "prop" ? "道具" : "特效"}
              </span>
            </div>
            <EditableField
              label="名称"
              value={item.name}
              onChange={(value) => updatePropEffect(item.id, "name", value)}
            />
            <EditableField
              className="mt-3"
              label="描述"
              minRows={2}
              value={item.description}
              onChange={(value) => updatePropEffect(item.id, "description", value)}
            />
            <EditableField
              className="mt-3"
              label="提示词"
              minRows={3}
              value={item.prompt}
              onChange={(value) => updatePropEffect(item.id, "prompt", value)}
            />
          </div>
        ))}
      </ReferenceGroup>
    </aside>
  )
}

function StoryboardReviewList({
  result,
  onChange,
}: {
  result: NovelToScriptResult
  onChange: (result: NovelToScriptResult) => void
}) {
  function updateStoryboard(
    id: string,
    field: keyof Pick<
      ScriptStoryboard,
      "shotNumber" | "shotSize" | "cameraLogic" | "visualDescription" | "prompt" | "dialogue" | "sound"
    >,
    value: string,
  ) {
    onChange({
      ...result,
      storyboards: result.storyboards.map((storyboard) =>
        storyboard.id === id
          ? {
              ...storyboard,
              [field]: value,
              reviewStatus: "edited",
            }
          : storyboard,
      ),
    })
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">AI 分镜脚本</h3>
          <p className="mt-1 text-sm text-quiet">按分镜逐条 Review，修改会自动标记为已修改。</p>
        </div>
        <span className="rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">
          {result.storyboards.length} 个分镜
        </span>
      </div>

      {result.storyboards.map((storyboard, index) => (
        <div
          className={clsx(
            "relative overflow-hidden rounded-[24px] border-2 p-4 shadow-sm transition hover:shadow-soft",
            index % 2 === 0 ? "border-story/35 bg-white" : "border-amber-200 bg-amber-50/25",
          )}
          key={storyboard.id}
        >
          <div
            className={clsx(
              "absolute inset-y-0 left-0 w-1.5",
              index % 2 === 0 ? "bg-story" : "bg-amber-400",
            )}
          />
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
                  index % 2 === 0 ? "bg-story text-white" : "bg-amber-400 text-white",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-quiet">Storyboard Shot</p>
                <h3 className="mt-1 font-semibold">镜头 #{String(index + 1).padStart(2, "0")}</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", getReviewStatusClass(storyboard.reviewStatus))}>
                {getReviewStatusLabel(storyboard.reviewStatus)}
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs text-quiet">
                角色 {storyboard.characterIds.length}
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs text-quiet">
                道具/特效 {storyboard.propEffectIds.length}
              </span>
            </div>
          </div>

          <div className="grid gap-3 border-b border-line pb-4 sm:grid-cols-[minmax(120px,0.4fr)_minmax(120px,0.3fr)]">
              <EditableField
                label="镜号"
                value={storyboard.shotNumber}
                onChange={(value) => updateStoryboard(storyboard.id, "shotNumber", value)}
              />
              <EditableField
                label="景别"
                value={storyboard.shotSize}
                onChange={(value) => updateStoryboard(storyboard.id, "shotSize", value)}
              />
          </div>

          <div className="mt-4 grid gap-3">
            <EditableField
              label="逻辑镜头"
              minRows={2}
              value={storyboard.cameraLogic}
              onChange={(value) => updateStoryboard(storyboard.id, "cameraLogic", value)}
            />
            <EditableField
              label="画面描述"
              minRows={3}
              value={storyboard.visualDescription}
              onChange={(value) => updateStoryboard(storyboard.id, "visualDescription", value)}
            />
            <EditableField
              label="提示词"
              minRows={3}
              value={storyboard.prompt}
              onChange={(value) => updateStoryboard(storyboard.id, "prompt", value)}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <EditableField
                label="对白"
                minRows={2}
                value={storyboard.dialogue}
                onChange={(value) => updateStoryboard(storyboard.id, "dialogue", value)}
              />
              <EditableField
                label="音效"
                minRows={2}
                value={storyboard.sound}
                onChange={(value) => updateStoryboard(storyboard.id, "sound", value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-quiet">
            <span className="rounded-full bg-paper px-2.5 py-1">排序 {index + 1}</span>
            <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">{storyboard.shotSize}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

function ReferenceGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="rounded-[22px] border border-line bg-[#fbfbfa] p-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-quiet shadow-sm">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EditableField({
  className,
  label,
  minRows = 1,
  value,
  onChange,
}: {
  className?: string
  label: string
  minRows?: number
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-quiet">{label}</span>
      <textarea
        className="w-full resize-y rounded-xl border border-line bg-[#fbfbfa] px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-ink focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        rows={minRows}
        value={value}
      />
    </label>
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

function getNovelStatusClass(status: StoryEpisode["novelToScript"] extends infer State
  ? State extends { status: infer Status }
    ? Status | "generating"
    : "idle" | "generating"
  : "idle" | "generating") {
  return clsx({
    "bg-neutral-100 text-neutral-600": status === "idle",
    "bg-sky-100 text-sky-700": status === "generating",
    "bg-amber-100 text-amber-700": status === "reviewing",
    "bg-emerald-100 text-emerald-700": status === "approved",
    "bg-rose-100 text-rose-700": status === "needs_revision",
  })
}

function getNovelStatusLabel(status: StoryEpisode["novelToScript"] extends infer State
  ? State extends { status: infer Status }
    ? Status | "generating"
    : "idle" | "generating"
  : "idle" | "generating") {
  const labels = {
    idle: "待输入",
    generating: "生成中",
    reviewing: "待 Review",
    approved: "已确认",
    needs_revision: "需要修改",
  }

  return labels[status as keyof typeof labels]
}

function getReviewStatusClass(status: ScriptStoryboard["reviewStatus"]) {
  return clsx({
    "bg-neutral-100 text-neutral-600": status === "original",
    "bg-sky-100 text-sky-700": status === "edited",
    "bg-amber-100 text-amber-700": status === "needs_review",
  })
}

function getReviewStatusLabel(status: ScriptStoryboard["reviewStatus"]) {
  const labels: Record<ScriptStoryboard["reviewStatus"], string> = {
    original: "未修改",
    edited: "已修改",
    needs_review: "需复核",
  }

  return labels[status]
}

function updateWorkflowForScriptReview(
  workflow: EpisodeWorkflowStage[],
  status: "idle" | "generating" | "reviewing" | "approved" | "needs_revision",
) {
  return workflow.map((stage) => {
    if (stage.stageId !== "extract_characters_scenes") {
      return stage
    }

    const workflowStatus: WorkflowStageStatus =
      status === "generating"
        ? "drafting"
        : status === "reviewing"
          ? "reviewing"
          : status === "approved"
            ? "approved"
            : status === "needs_revision"
              ? "needs_revision"
              : "not_started"

    return {
      ...stage,
      status: workflowStatus,
      outputs:
        status === "idle"
          ? stage.outputs
          : ["角色表", "场景表", "道具/特效表", "AI 分镜脚本"],
    }
  })
}

function updateWorkflowForScriptApproved(workflow: EpisodeWorkflowStage[]) {
  return workflow.map((stage) => {
    if (stage.stageId === "extract_characters_scenes") {
      return {
        ...stage,
        status: "approved" as WorkflowStageStatus,
        outputs: ["角色表", "场景表", "道具/特效表", "AI 分镜脚本"],
      }
    }

    if (stage.stageId === "storyboard_list") {
      return {
        ...stage,
        status: stage.status === "not_started" ? ("drafting" as WorkflowStageStatus) : stage.status,
        inputs: Array.from(new Set([...stage.inputs, "AI 分镜脚本"])),
      }
    }

    return stage
  })
}

function updateWorkflowStage(
  workflow: EpisodeWorkflowStage[],
  stageId: WorkflowStageId,
  patch: Partial<Pick<EpisodeWorkflowStage, "status" | "inputs" | "outputs" | "notes">>,
) {
  return workflow.map((stage) =>
    stage.stageId === stageId
      ? {
          ...stage,
          ...patch,
        }
      : stage,
  )
}

function ensureProductionState(episode: StoryEpisode) {
  return {
    characterAssets: episode.production?.characterAssets ?? {},
    sceneAssets: episode.production?.sceneAssets ?? {},
    storyboardAssets: episode.production?.storyboardAssets ?? {},
    export: episode.production?.export,
    updatedAt: episode.production?.updatedAt ?? new Date().toISOString(),
  }
}

function formatScriptDraft(result: NovelToScriptResult) {
  return result.storyboards
    .map((storyboard) =>
      [
        `${storyboard.shotNumber} · ${storyboard.shotSize}`,
        `镜头结构：${storyboard.durationSeconds ?? 12}s · ${storyboard.cameraAngle ?? "平视"} · ${storyboard.cameraMove ?? "固定"} · ${storyboard.location ?? "待定地点"} · ${storyboard.timeOfDay ?? "傍晚"}`,
        `逻辑镜头：${storyboard.cameraLogic}`,
        `动作：${storyboard.action ?? ""}`,
        `结果：${storyboard.result ?? ""}`,
        `画面：${storyboard.visualDescription}`,
        `氛围：${storyboard.atmosphere ?? ""}`,
        `对白：${storyboard.dialogue}`,
        `音效：${storyboard.sound}`,
      ].join("\n"),
    )
    .join("\n\n")
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
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

function createStoryboardFrameDataUrl(storyboardId: string, frameLabel: "首帧" | "尾帧") {
  const accent = frameLabel === "首帧" ? "#0f6bff" : "#14b885"
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#15171f"/>
          <stop offset="0.58" stop-color="#34404f"/>
          <stop offset="1" stop-color="#08090d"/>
        </linearGradient>
        <radialGradient id="light" cx="0.32" cy="0.36" r="0.58">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.44"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="540" fill="url(#bg)"/>
      <rect width="960" height="540" fill="url(#light)"/>
      <rect x="54" y="48" width="852" height="444" rx="28" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
      <circle cx="260" cy="250" r="86" fill="rgba(255,255,255,0.12)"/>
      <rect x="370" y="178" width="360" height="22" rx="11" fill="rgba(255,255,255,0.34)"/>
      <rect x="370" y="224" width="440" height="16" rx="8" fill="rgba(255,255,255,0.22)"/>
      <rect x="370" y="260" width="310" height="16" rx="8" fill="rgba(255,255,255,0.18)"/>
      <text x="72" y="88" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="28" font-weight="700">${frameLabel} · ${storyboardId}</text>
      <text x="72" y="458" fill="rgba(255,255,255,0.78)" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="22">Storyboard frame placeholder</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function deriveSummary(body: string) {
  const compact = body.replace(/\s+/g, " ").trim()
  return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact
}
