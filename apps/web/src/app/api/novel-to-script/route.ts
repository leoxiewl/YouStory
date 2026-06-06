import { NextResponse } from "next/server"
import type {
  NovelToScriptResult,
  ScriptCharacter,
  ScriptPropEffect,
  ScriptScene,
  ScriptStoryboard,
} from "@/lib/types"

type NovelToScriptRequest = {
  episodeId?: string
  novelText?: string
}

const shotSizes = ["远景", "全景", "中景", "近景", "特写", "固定镜头"]
const cameraAngles = ["平视", "俯视", "仰视", "侧面", "背面"]
const cameraMoves = ["固定", "缓慢推进", "跟随", "轻微摇移", "手持晃动"]

export async function POST(request: Request) {
  let payload: NovelToScriptRequest

  try {
    payload = (await request.json()) as NovelToScriptRequest
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 })
  }

  const novelText = payload.novelText?.trim() ?? ""

  if (!novelText) {
    return NextResponse.json({ error: "请输入小说文案后再拆解分镜。" }, { status: 400 })
  }

  return NextResponse.json({
    result: createMockNovelToScriptResult(novelText),
  })
}

function createMockNovelToScriptResult(novelText: string): NovelToScriptResult {
  const fragments = splitNovelText(novelText)
  const characters = createCharacters(novelText)
  const scenes = createScenes(fragments)
  const propsEffects = createPropsEffects(novelText)
  const storyboards = createStoryboards(fragments, characters, scenes, propsEffects)

  return {
    characters,
    scenes,
    propsEffects,
    storyboards,
  }
}

function splitNovelText(novelText: string) {
  const normalized = novelText
    .replace(/\r/g, "")
    .split(/\n+|(?<=[。！？!?])\s*/)
    .map((item) => item.trim())
    .filter(Boolean)

  const fragments = normalized.length > 0 ? normalized : [novelText.trim()]
  const targetCount = Math.min(8, Math.max(4, fragments.length))

  if (fragments.length >= targetCount) {
    return fragments.slice(0, targetCount)
  }

  const expanded = [...fragments]
  while (expanded.length < targetCount) {
    expanded.push(fragments[expanded.length % fragments.length])
  }

  return expanded
}

function createCharacters(novelText: string): ScriptCharacter[] {
  const names = Array.from(
    new Set(
      Array.from(novelText.matchAll(/(?:“([^”]{1,6})”|「([^」]{1,6})」|([一-龥]{2,4})(?:说|问|喊|冲|看|走|推|拉))/g))
        .map((match) => match[1] ?? match[2] ?? match[3])
        .filter(Boolean),
    ),
  ).slice(0, 3)

  const resolvedNames = names.length > 0 ? names : ["主角", "对手", "旁白"]

  return resolvedNames.map((name, index) => ({
    id: `character-${index + 1}`,
    name,
    age: index === 0 ? "约 20-30 岁" : "待定",
    appearance: index === 0 ? "神情紧绷，衣着贴合原文时代与场景" : "外貌由原文线索延展",
    profile:
      index === 0
        ? "承担主要行动线，情绪从克制推进到爆发。"
        : "与主角形成关系压力，推动对话、冲突或反转。",
  }))
}

function createScenes(fragments: string[]): ScriptScene[] {
  const firstFragment = fragments[0] ?? "故事发生的核心空间"
  const secondFragment = fragments[1] ?? firstFragment

  return [
    {
      id: "scene-1",
      name: "主场景",
      environment: compactText(firstFragment, 44),
      prompt: `电影感，真实空间，大环境交代，${compactText(firstFragment, 36)}`,
    },
    {
      id: "scene-2",
      name: "冲突场景",
      environment: compactText(secondFragment, 44),
      prompt: `中近景调度，人物关系紧张，情绪推进，${compactText(secondFragment, 36)}`,
    },
  ]
}

function createPropsEffects(novelText: string): ScriptPropEffect[] {
  const hasDoor = /门|推开|拉开/.test(novelText)
  const hasRain = /雨|水|雷|风/.test(novelText)

  return [
    {
      id: "prop-effect-1",
      name: hasDoor ? "门" : "关键道具",
      type: "prop",
      description: hasDoor ? "门被拉开，成为动作转折点。" : "承载人物记忆或冲突的核心物件。",
      prompt: hasDoor ? "门把手，突然拉开，动作清晰" : "关键道具特写，质感明确，叙事线索",
    },
    {
      id: "prop-effect-2",
      name: hasRain ? "雨声" : "情绪音效",
      type: "effect",
      description: hasRain ? "雨声压住对白，增强压迫和告别感。" : "跟随情绪高点进入，强化关键动作。",
      prompt: hasRain ? "雨声，环境声，远处低频" : "低频情绪音效，短促冲击，留白",
    },
  ]
}

function createStoryboards(
  fragments: string[],
  characters: ScriptCharacter[],
  scenes: ScriptScene[],
  propsEffects: ScriptPropEffect[],
): ScriptStoryboard[] {
  return fragments.map((fragment, index) => {
    const shotSize = shotSizes[index % shotSizes.length]
    const scene = scenes[index < 2 ? 0 : 1] ?? scenes[0]
    const character = characters[index % characters.length]
    const propEffect = propsEffects[index % propsEffects.length]

    return {
      id: `storyboard-${index + 1}`,
      shotNumber: `分镜 ${index + 1}`,
      shotSize,
      durationSeconds: 12,
      cameraAngle: cameraAngles[index % cameraAngles.length],
      cameraMove: cameraMoves[index % cameraMoves.length],
      location: scene.name,
      timeOfDay: index < 2 ? "傍晚" : "夜晚",
      cameraLogic: getCameraLogic(index, shotSize, fragment),
      visualDescription: compactText(fragment, 96),
      action: inferAction(fragment, character.name),
      result: inferResult(fragment),
      atmosphere: inferAtmosphere(fragment),
      prompt: `${shotSize}，${scene.prompt}，${character.name}，${compactText(fragment, 52)}`,
      dialogue: inferDialogue(fragment, character.name),
      sound: inferSound(fragment, propEffect.name),
      characterIds: [character.id],
      sceneId: scene.id,
      propEffectIds: [propEffect.id],
      reviewStatus: "needs_review",
    }
  })
}

function inferAction(fragment: string, fallbackName: string) {
  if (/门|推开|拉开|冲/.test(fragment)) {
    return `${fallbackName}推动关键动作，空间关系被迅速打破。`
  }

  if (/说|问|喊|回答/.test(fragment)) {
    return `${fallbackName}开口或停顿，对话推进人物关系。`
  }

  return `${fallbackName}在场景中完成一个清晰动作，情绪随动作推进。`
}

function inferResult(fragment: string) {
  if (/沉默|停|看/.test(fragment)) {
    return "人物反应被留住，情绪进入更安静的停顿。"
  }

  if (/门|推开|拉开|冲/.test(fragment)) {
    return "事件进入下一拍，形成可剪辑的动作转折点。"
  }

  return "信息被交代清楚，观众理解人物处境和下一步动机。"
}

function inferAtmosphere(fragment: string) {
  if (/雨|水|雷|风/.test(fragment)) {
    return "潮湿、压迫，环境声包裹人物。"
  }

  if (/沉默|告别|回头|站/.test(fragment)) {
    return "克制、留白，情绪藏在停顿里。"
  }

  return "真实、电影感，光线自然但有情绪层次。"
}

function getCameraLogic(index: number, shotSize: string, fragment: string) {
  if (index === 0) {
    return `[${shotSize}] 交代大环境，建立人物所处空间和事件气氛。`
  }

  if (/门|推开|拉开|冲/.test(fragment)) {
    return "[固定镜头] 门被拉开 -> [中景] 人物冲出来，动作形成剪辑点。"
  }

  if (/说|问|喊|回答|沉默/.test(fragment)) {
    return `[${shotSize}] 人物对话推进关系，镜头停在表情和反应上。`
  }

  return `[${shotSize}] 跟随人物行动，突出关键动作和情绪变化。`
}

function inferDialogue(fragment: string, fallbackName: string) {
  const quoted = fragment.match(/[“「]([^”」]+)[”」]/)?.[1]

  if (quoted) {
    return `${fallbackName}：${quoted}`
  }

  if (/说|问|喊/.test(fragment)) {
    return `${fallbackName}：根据原文语气补写一句短对白。`
  }

  return "无对白，保留动作和环境声。"
}

function inferSound(fragment: string, fallbackEffect: string) {
  if (/门|推开|拉开/.test(fragment)) {
    return "门轴声、急促脚步声、短促低频冲击。"
  }

  if (/雨|水|雷|风/.test(fragment)) {
    return "雨声、风声、远处环境噪声。"
  }

  if (/沉默|看|停/.test(fragment)) {
    return "环境声降低，留出情绪停顿。"
  }

  return `${fallbackEffect}，轻量环境铺底。`
}

function compactText(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact
}
