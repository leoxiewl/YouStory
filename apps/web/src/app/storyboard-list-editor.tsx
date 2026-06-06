"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import {
  Clock3,
  ImagePlus,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import type {
  EpisodeProductionState,
  NovelToScriptResult,
  ScriptStoryboard,
  StoryEpisode,
} from "@/lib/types"

type StoryboardListEditorProps = {
  episode: StoryEpisode
  result: NovelToScriptResult
  onUpdateEpisode: (episode: StoryEpisode) => void
}

type StoryboardTextField =
  | "shotNumber"
  | "shotSize"
  | "cameraAngle"
  | "cameraMove"
  | "location"
  | "timeOfDay"
  | "cameraLogic"
  | "visualDescription"
  | "action"
  | "result"
  | "atmosphere"
  | "prompt"
  | "dialogue"
  | "sound"

const shotSizeOptions = ["远景", "全景", "中景", "近景", "特写", "固定镜头"]
const cameraAngleOptions = ["平视", "俯视", "仰视", "侧面", "背面"]
const cameraMoveOptions = ["固定", "缓慢推进", "跟随", "轻微摇移", "手持晃动"]
const timeOptions = ["清晨", "上午", "午后", "傍晚", "夜晚", "深夜"]

export function StoryboardListEditor({
  episode,
  result,
  onUpdateEpisode,
}: StoryboardListEditorProps) {
  const normalizedResult = useMemo(() => normalizeResult(result), [result])
  const storyboards = normalizedResult.storyboards
  const [selectedStoryboardId, setSelectedStoryboardId] = useState(storyboards[0]?.id)
  const [regenerating, setRegenerating] = useState(false)
  const [editorError, setEditorError] = useState("")
  const production = ensureProductionState(episode)

  useEffect(() => {
    if (!storyboards.some((storyboard) => storyboard.id === selectedStoryboardId)) {
      setSelectedStoryboardId(storyboards[0]?.id)
    }
  }, [selectedStoryboardId, storyboards])

  const selectedIndex = Math.max(
    0,
    storyboards.findIndex((storyboard) => storyboard.id === selectedStoryboardId),
  )
  const selectedStoryboard = storyboards[selectedIndex] ?? storyboards[0]
  const totalDuration = storyboards.reduce(
    (sum, storyboard) => sum + normalizeDuration(storyboard.durationSeconds),
    0,
  )

  function persistStoryboards(
    nextStoryboards: ScriptStoryboard[],
    nextProduction: EpisodeProductionState = production,
  ) {
    const nextResult = {
      ...normalizedResult,
      storyboards: nextStoryboards.map(normalizeStoryboard),
    }
    const hasStoryboards = nextResult.storyboards.length > 0

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
        draft: formatStoryboardDraft(nextResult),
      },
      production: {
        ...nextProduction,
        updatedAt: new Date().toISOString(),
      },
      workflow: episode.workflow.map((stage) =>
        stage.stageId === "storyboard_list"
          ? {
              ...stage,
              status: hasStoryboards ? "reviewing" : "not_started",
              inputs: ["格式化剧本", "角色表", "场景表"],
              outputs: hasStoryboards ? ["分镜列表", "镜头提示词"] : [],
            }
          : stage,
      ),
    })
  }

  function updateStoryboard(
    id: string,
    patch: Partial<ScriptStoryboard>,
  ) {
    persistStoryboards(
      storyboards.map((storyboard) =>
        storyboard.id === id
          ? normalizeStoryboard({
              ...storyboard,
              ...patch,
              reviewStatus: "edited",
            })
          : storyboard,
      ),
    )
  }

  function updateTextField(id: string, field: StoryboardTextField, value: string) {
    updateStoryboard(id, { [field]: value })
  }

  function updateDuration(id: string, value: string) {
    updateStoryboard(id, {
      durationSeconds: Math.max(1, Number.parseInt(value, 10) || 1),
    })
  }

  function toggleCharacter(storyboard: ScriptStoryboard, characterId: string) {
    const exists = storyboard.characterIds.includes(characterId)
    const nextCharacterIds = exists
      ? storyboard.characterIds.filter((id) => id !== characterId)
      : [...storyboard.characterIds, characterId]

    updateStoryboard(storyboard.id, {
      characterIds: nextCharacterIds.length > 0 ? nextCharacterIds : [characterId],
    })
  }

  function addStoryboard() {
    const nextIndex = storyboards.length + 1
    const scene = normalizedResult.scenes[0]
    const character = normalizedResult.characters[0]
    const id = createStoryboardId(storyboards)
    const nextStoryboard = normalizeStoryboard({
      id,
      shotNumber: `分镜 ${nextIndex}`,
      shotSize: "中景",
      durationSeconds: 12,
      cameraAngle: "平视",
      cameraMove: "固定",
      location: scene?.name ?? "待定地点",
      timeOfDay: "傍晚",
      cameraLogic: "中景建立人物与空间关系，保持清晰的动作连续性。",
      visualDescription: "补充当前镜头的画面描述。",
      action: "人物完成一个明确动作，推动情绪或剧情进入下一拍。",
      result: "观众获得新的信息，镜头形成可剪辑的结束点。",
      atmosphere: "真实、克制，光线自然但有情绪层次。",
      prompt: scene?.prompt ?? "电影感，真实空间，人物动作清晰",
      dialogue: "无对白，保留动作和环境声。",
      sound: "轻量环境声铺底。",
      characterIds: character ? [character.id] : [],
      sceneId: scene?.id ?? "",
      propEffectIds: [],
      reviewStatus: "needs_review",
    })

    setSelectedStoryboardId(id)
    persistStoryboards([...storyboards, nextStoryboard])
  }

  async function regenerateStoryboards() {
    const novelText = (episode.novelToScript?.novelText || episode.script.draft || episode.summary).trim()

    if (!novelText) {
      setEditorError("缺少可重新拆解的剧本文本。")
      return
    }

    setRegenerating(true)
    setEditorError("")

    try {
      const response = await fetch("/api/novel-to-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodeId: episode.id,
          novelText,
        }),
      })
      const data = (await response.json()) as { result?: NovelToScriptResult; error?: string }

      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "重新拆解失败，请稍后重试。")
      }

      const nextResult = normalizeResult(data.result)

      setSelectedStoryboardId(nextResult.storyboards[0]?.id)
      onUpdateEpisode({
        ...episode,
        novelToScript: {
          novelText,
          status: "reviewing",
          result: nextResult,
          updatedAt: new Date().toISOString(),
        },
        script: {
          ...episode.script,
          draft: formatStoryboardDraft(nextResult),
        },
        workflow: episode.workflow.map((stage) =>
          stage.stageId === "storyboard_list"
            ? {
                ...stage,
                status: nextResult.storyboards.length ? "reviewing" : "not_started",
                inputs: ["格式化剧本", "角色表", "场景表"],
                outputs: nextResult.storyboards.length ? ["分镜列表", "镜头提示词"] : [],
              }
            : stage,
        ),
      })
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "重新拆解失败，请稍后重试。")
    } finally {
      setRegenerating(false)
    }
  }

  function deleteSelectedStoryboard() {
    if (!selectedStoryboard) {
      return
    }

    const nextStoryboards = storyboards.filter((storyboard) => storyboard.id !== selectedStoryboard.id)
    const { [selectedStoryboard.id]: _removedAsset, ...nextStoryboardAssets } =
      production.storyboardAssets

    setSelectedStoryboardId(nextStoryboards[Math.max(0, selectedIndex - 1)]?.id)
    persistStoryboards(nextStoryboards, {
      ...production,
      storyboardAssets: nextStoryboardAssets,
    })
  }

  function updateFrame(
    storyboardId: string,
    frame: "first" | "last",
    value: string,
  ) {
    const current = production.storyboardAssets[storyboardId] ?? {}
    const nextAsset =
      frame === "first"
        ? {
            ...current,
            firstFrameUrl: value,
            firstFrameLabel: value ? "首帧参考图" : "",
            firstFrameStatus: value ? "ready" as const : "idle" as const,
            updatedAt: new Date().toISOString(),
          }
        : {
            ...current,
            lastFrameUrl: value,
            lastFrameLabel: value ? "尾帧参考图" : "",
            lastFrameStatus: value ? "ready" as const : "idle" as const,
            updatedAt: new Date().toISOString(),
          }

    persistStoryboards(storyboards, {
      ...production,
      storyboardAssets: {
        ...production.storyboardAssets,
        [storyboardId]: nextAsset,
      },
    })
  }

  function generateFrames(storyboard: ScriptStoryboard) {
    const current = production.storyboardAssets[storyboard.id] ?? {}

    persistStoryboards(storyboards, {
      ...production,
      storyboardAssets: {
        ...production.storyboardAssets,
        [storyboard.id]: {
          ...current,
          firstFrameStatus: "ready",
          firstFrameUrl: createFrameDataUrl(storyboard, "首帧"),
          firstFrameLabel: "首帧参考图",
          lastFrameStatus: "ready",
          lastFrameUrl: createFrameDataUrl(storyboard, "尾帧"),
          lastFrameLabel: "尾帧参考图",
          updatedAt: new Date().toISOString(),
        },
      },
    })
  }

  if (!selectedStoryboard) {
    return (
      <section className="rounded-[22px] border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-story">Storyboard Desk</p>
            <h3 className="mt-1 text-lg font-semibold">分镜列表</h3>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-story px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={addStoryboard}
            type="button"
          >
            <Plus size={16} />
            添加镜头
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-line bg-[#fbfbfa] p-8 text-center text-sm text-quiet">
          还没有分镜镜头。添加一个镜头后开始编辑结构、画面和首尾帧。
        </div>
      </section>
    )
  }

  const selectedAsset = production.storyboardAssets[selectedStoryboard.id] ?? {}
  const selectedCharacters = normalizedResult.characters.filter((character) =>
    selectedStoryboard.characterIds.includes(character.id),
  )
  const selectedScene = normalizedResult.scenes.find((scene) => scene.id === selectedStoryboard.sceneId)

  return (
    <section className="overflow-hidden rounded-[22px] border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line bg-[#fbfbfa] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-story/10 text-xs font-bold text-story">
            05
          </span>
          <div>
            <h3 className="font-semibold leading-tight">分镜列表</h3>
            <p className="mt-0.5 text-xs text-quiet">镜头序列、首尾帧和生产字段统一维护</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="镜头" value={`${storyboards.length}`} />
          <MetricPill label="总时长" value={`${totalDuration}s`} />
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-story hover:text-story"
            onClick={addStoryboard}
            type="button"
          >
            <Plus size={14} />
            添加
          </button>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-story hover:text-story"
            disabled={regenerating}
            onClick={regenerateStoryboards}
            type="button"
          >
            <RefreshCw className={clsx(regenerating && "animate-spin")} size={14} />
            {regenerating ? "拆解中" : "重新拆解"}
          </button>
        </div>
      </div>
      {editorError ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {editorError}
        </div>
      ) : null}

      <div className="grid min-h-[680px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-line px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">镜头序列</p>
                <p className="mt-1 text-xs text-quiet">按镜头顺序检查内容与素材状态</p>
              </div>
              <span className="rounded-full bg-story/10 px-2.5 py-1 text-xs font-semibold text-story">
                {totalDuration}s
              </span>
            </div>
          </div>
          <div className="story-scrollbar max-h-[640px] space-y-2 overflow-auto p-3">
            {storyboards.map((storyboard, index) => {
              const asset = production.storyboardAssets[storyboard.id]
              const isSelected = storyboard.id === selectedStoryboard.id
              const scene = normalizedResult.scenes.find((item) => item.id === storyboard.sceneId)
              const characterNames = normalizedResult.characters
                .filter((character) => storyboard.characterIds.includes(character.id))
                .map((character) => character.name)

              return (
                <button
                  className={clsx(
                    "w-full rounded-lg border p-3 text-left transition",
                    isSelected
                      ? "border-story bg-story/5 shadow-[inset_3px_0_0_#0f6bff]"
                      : "border-line bg-white hover:border-story/40 hover:bg-[#fbfbfa]",
                  )}
                  key={storyboard.id}
                  onClick={() => setSelectedStoryboardId(storyboard.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="rounded-md bg-story px-2 py-1 text-xs font-bold text-white">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-full bg-paper px-2 py-1 text-xs font-medium text-quiet">
                        {storyboard.shotSize}
                      </span>
                      <span className="rounded-full bg-paper px-2 py-1 text-xs font-medium text-quiet">
                        {storyboard.characterIds.length} 角色
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-story">
                      {normalizeDuration(storyboard.durationSeconds)}s
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink">
                    {storyboard.visualDescription}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-quiet">
                    <span className="min-w-0 truncate">
                      {scene?.name ?? storyboard.location}
                      {characterNames.length ? ` / ${characterNames.join("、")}` : ""}
                    </span>
                    {asset?.firstFrameStatus === "ready" && asset.lastFrameStatus === "ready" ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                        帧已就绪
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        待帧
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 bg-[#f7f8fa]">
          <div className="border-b border-line bg-white px-4 py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">镜头 #{String(selectedIndex + 1).padStart(2, "0")}</h3>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-quiet">
                    {selectedScene?.name ?? selectedStoryboard.location}
                  </span>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", getReviewStatusClass(selectedStoryboard.reviewStatus))}>
                    {getReviewStatusLabel(selectedStoryboard.reviewStatus)}
                  </span>
                </div>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-quiet">
                  {selectedStoryboard.visualDescription}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCharacters.map((character) => (
                    <span
                      className="rounded-full bg-story/10 px-3 py-1 text-xs font-semibold text-story"
                      key={character.id}
                    >
                      {character.name}
                    </span>
                  ))}
                  <StatusBadge label={`首帧 ${selectedAsset.firstFrameStatus === "ready" ? "已生成" : "待生成"}`} />
                  <StatusBadge label={`尾帧 ${selectedAsset.lastFrameStatus === "ready" ? "已生成" : "待生成"}`} />
                  <StatusBadge label={`视频 ${selectedAsset.videoStatus === "ready" ? "已生成" : "待生成"}`} />
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={storyboards.length <= 1}
                onClick={deleteSelectedStoryboard}
                type="button"
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>

          <div className="story-scrollbar max-h-[720px] space-y-3 overflow-auto p-4">
            <Panel title="镜头预览" eyebrow="首帧、尾帧和镜头概览">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px_280px]">
                <div className="rounded-lg border border-line bg-[#fbfbfa] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-quiet">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                      <Clock3 size={13} />
                      {normalizeDuration(selectedStoryboard.durationSeconds)}s
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">{selectedStoryboard.shotSize}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">{selectedStoryboard.cameraAngle}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">{selectedStoryboard.cameraMove}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink">{selectedStoryboard.cameraLogic}</p>
                  <p className="mt-3 text-sm leading-6 text-quiet">{selectedStoryboard.atmosphere}</p>
                </div>
                <FrameEditor
                  imageUrl={selectedAsset.firstFrameUrl}
                  label={selectedAsset.firstFrameLabel || "首帧"}
                  onChange={(value) => updateFrame(selectedStoryboard.id, "first", value)}
                  title="首帧"
                />
                <FrameEditor
                  imageUrl={selectedAsset.lastFrameUrl}
                  label={selectedAsset.lastFrameLabel || "尾帧"}
                  onChange={(value) => updateFrame(selectedStoryboard.id, "last", value)}
                  title="尾帧"
                />
              </div>
              <button
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
                onClick={() => generateFrames(selectedStoryboard)}
                type="button"
              >
                <ImagePlus size={16} />
                模拟生成首尾帧
              </button>
            </Panel>

            <Panel title="镜头结构" eyebrow="景别、角度、运镜、场景绑定和时长">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <TextInput
                  label="标题"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "shotNumber", value)}
                  value={selectedStoryboard.shotNumber}
                />
                <SelectInput
                  label="景别"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "shotSize", value)}
                  options={shotSizeOptions}
                  value={selectedStoryboard.shotSize}
                />
                <SelectInput
                  label="角度"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "cameraAngle", value)}
                  options={cameraAngleOptions}
                  value={selectedStoryboard.cameraAngle ?? "平视"}
                />
                <SelectInput
                  label="运镜"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "cameraMove", value)}
                  options={cameraMoveOptions}
                  value={selectedStoryboard.cameraMove ?? "固定"}
                />
                <SelectInput
                  label="绑定场景"
                  onChange={(value) => {
                    const scene = normalizedResult.scenes.find((item) => item.id === value)
                    updateStoryboard(selectedStoryboard.id, {
                      sceneId: value,
                      location: scene?.name ?? selectedStoryboard.location,
                    })
                  }}
                  options={normalizedResult.scenes.map((scene) => scene.id)}
                  renderOption={(value) =>
                    normalizedResult.scenes.find((scene) => scene.id === value)?.name ?? value
                  }
                  value={selectedStoryboard.sceneId}
                />
                <TextInput
                  label="地点"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "location", value)}
                  value={selectedStoryboard.location ?? ""}
                />
                <SelectInput
                  label="时间"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "timeOfDay", value)}
                  options={timeOptions}
                  value={selectedStoryboard.timeOfDay ?? "傍晚"}
                />
                <TextInput
                  label="时长"
                  onChange={(value) => updateDuration(selectedStoryboard.id, value)}
                  suffix="s"
                  type="number"
                  value={String(normalizeDuration(selectedStoryboard.durationSeconds))}
                />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-quiet">绑定角色</p>
                <div className="flex flex-wrap gap-2">
                  {normalizedResult.characters.map((character) => {
                    const selected = selectedStoryboard.characterIds.includes(character.id)

                    return (
                      <button
                        className={clsx(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                          selected
                            ? "border-story bg-story text-white"
                            : "border-line bg-white text-quiet hover:border-story hover:text-story",
                        )}
                        key={character.id}
                        onClick={() => toggleCharacter(selectedStoryboard, character.id)}
                        type="button"
                      >
                        {character.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Panel>

            <Panel title="画面语义" eyebrow="动作、结果、氛围和对白">
              <div className="grid gap-3 xl:grid-cols-2">
                <TextArea
                  label="动作"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "action", value)}
                  value={selectedStoryboard.action ?? ""}
                />
                <TextArea
                  label="结果"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "result", value)}
                  value={selectedStoryboard.result ?? ""}
                />
                <TextArea
                  label="画面描述"
                  minRows={4}
                  onChange={(value) => updateTextField(selectedStoryboard.id, "visualDescription", value)}
                  value={selectedStoryboard.visualDescription}
                />
                <TextArea
                  label="氛围"
                  minRows={4}
                  onChange={(value) => updateTextField(selectedStoryboard.id, "atmosphere", value)}
                  value={selectedStoryboard.atmosphere ?? ""}
                />
                <TextArea
                  label="对白 / 旁白"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "dialogue", value)}
                  value={selectedStoryboard.dialogue}
                />
                <TextArea
                  label="音效"
                  onChange={(value) => updateTextField(selectedStoryboard.id, "sound", value)}
                  value={selectedStoryboard.sound}
                />
              </div>
            </Panel>

            <Panel title="生成提示词" eyebrow="镜头逻辑和图像/视频提示词">
              <div className="grid gap-3 xl:grid-cols-2">
                <TextArea
                  label="镜头逻辑"
                  minRows={5}
                  onChange={(value) => updateTextField(selectedStoryboard.id, "cameraLogic", value)}
                  value={selectedStoryboard.cameraLogic}
                />
                <TextArea
                  label="提示词"
                  minRows={5}
                  onChange={(value) => updateTextField(selectedStoryboard.id, "prompt", value)}
                  value={selectedStoryboard.prompt}
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  )
}

function normalizeResult(result: NovelToScriptResult): NovelToScriptResult {
  return {
    ...result,
    storyboards: result.storyboards.map(normalizeStoryboard),
  }
}

function normalizeStoryboard(storyboard: ScriptStoryboard): ScriptStoryboard {
  return {
    ...storyboard,
    durationSeconds: normalizeDuration(storyboard.durationSeconds),
    cameraAngle: storyboard.cameraAngle || "平视",
    cameraMove: storyboard.cameraMove || deriveCameraMove(storyboard.cameraLogic),
    location: storyboard.location || "待定地点",
    timeOfDay: storyboard.timeOfDay || "傍晚",
    action: storyboard.action || deriveAction(storyboard),
    result: storyboard.result || "镜头形成明确剪辑点，进入下一拍。",
    atmosphere: storyboard.atmosphere || "真实、克制，光线自然但有情绪层次。",
  }
}

function normalizeDuration(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.round(value) : 12
}

function deriveCameraMove(cameraLogic: string) {
  if (/推进|靠近/.test(cameraLogic)) {
    return "缓慢推进"
  }

  if (/跟随|行动/.test(cameraLogic)) {
    return "跟随"
  }

  if (/手持|晃/.test(cameraLogic)) {
    return "手持晃动"
  }

  return "固定"
}

function deriveAction(storyboard: ScriptStoryboard) {
  if (storyboard.dialogue && !storyboard.dialogue.includes("无对白")) {
    return "人物通过对白或停顿推动关系变化。"
  }

  return storyboard.visualDescription || "人物完成一个可见动作。"
}

function ensureProductionState(episode: StoryEpisode): EpisodeProductionState {
  return {
    characterAssets: episode.production?.characterAssets ?? {},
    sceneAssets: episode.production?.sceneAssets ?? {},
    storyboardAssets: episode.production?.storyboardAssets ?? {},
    export: episode.production?.export,
    updatedAt: episode.production?.updatedAt ?? new Date().toISOString(),
  }
}

function createStoryboardId(storyboards: ScriptStoryboard[]) {
  let index = storyboards.length + 1
  let id = `storyboard-${index}`

  while (storyboards.some((storyboard) => storyboard.id === id)) {
    index += 1
    id = `storyboard-${index}`
  }

  return id
}

function formatStoryboardDraft(result: NovelToScriptResult) {
  return result.storyboards
    .map((storyboard) =>
      [
        `${storyboard.shotNumber} · ${storyboard.shotSize} · ${normalizeDuration(storyboard.durationSeconds)}s`,
        `镜头结构：${storyboard.cameraAngle ?? "平视"} / ${storyboard.cameraMove ?? "固定"} / ${storyboard.location ?? "待定地点"} / ${storyboard.timeOfDay ?? "傍晚"}`,
        `镜头逻辑：${storyboard.cameraLogic}`,
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

function createFrameDataUrl(storyboard: ScriptStoryboard, frameLabel: "首帧" | "尾帧") {
  const accent = frameLabel === "首帧" ? "#0f6bff" : "#14b885"
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#15171f"/>
          <stop offset="0.55" stop-color="#34404f"/>
          <stop offset="1" stop-color="#08090d"/>
        </linearGradient>
        <radialGradient id="light" cx="0.32" cy="0.35" r="0.52">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.45"/>
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
      <text x="72" y="88" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="28" font-weight="700">${escapeSvgText(frameLabel)} · ${escapeSvgText(storyboard.shotNumber)}</text>
      <text x="72" y="458" fill="rgba(255,255,255,0.78)" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="22">${escapeSvgText(storyboard.shotSize)} / ${escapeSvgText(storyboard.cameraAngle ?? "平视")} / ${escapeSvgText(storyboard.cameraMove ?? "固定")}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs text-quiet">
      <span>{label}</span>
      <strong className="font-semibold text-ink">{value}</strong>
    </span>
  )
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      {label}
    </span>
  )
}

function Panel({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <span className="text-xs text-quiet">{eyebrow}</span>
      </div>
      {children}
    </section>
  )
}

function FrameEditor({
  imageUrl,
  label,
  title,
  onChange,
}: {
  imageUrl?: string
  label: string
  title: string
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{title}</span>
        <span className="text-xs text-quiet">{label}</span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-[#eef1f5]">
        {imageUrl ? (
          <img
            alt={label}
            className="h-full w-full object-cover"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-quiet">
            <Sparkles size={20} />
            <span className="text-xs font-medium">待生成</span>
          </div>
        )}
      </div>
      <input
        className="mt-2 w-full rounded-lg border border-line bg-[#fbfbfa] px-3 py-2 text-xs text-ink outline-none transition focus:border-story focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder="粘贴图片 URL"
        value={imageUrl ?? ""}
      />
    </div>
  )
}

function TextInput({
  label,
  suffix,
  type = "text",
  value,
  onChange,
}: {
  label: string
  suffix?: string
  type?: "text" | "number"
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-quiet">{label}</span>
      <div className="flex rounded-lg border border-line bg-[#fbfbfa] focus-within:border-story focus-within:bg-white">
        <input
          className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-ink outline-none"
          min={type === "number" ? 1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          value={value}
        />
        {suffix ? (
          <span className="flex items-center px-3 text-xs font-semibold text-quiet">{suffix}</span>
        ) : null}
      </div>
    </label>
  )
}

function SelectInput({
  label,
  options,
  renderOption,
  value,
  onChange,
}: {
  label: string
  options: string[]
  renderOption?: (value: string) => string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-quiet">{label}</span>
      <select
        className="w-full rounded-lg border border-line bg-[#fbfbfa] px-3 py-2 text-sm text-ink outline-none transition focus:border-story focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderOption ? renderOption(option) : option}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextArea({
  label,
  minRows = 3,
  value,
  onChange,
}: {
  label: string
  minRows?: number
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-quiet">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-line bg-[#fbfbfa] px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-story focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        rows={minRows}
        value={value}
      />
    </label>
  )
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
