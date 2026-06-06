import { Agent } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { createStoryTools } from './tools/story-tools.js'
import { createExtractTools } from './tools/extract-tools.js'
import { createStoryboardTools } from './tools/storyboard-tools.js'
import { createVoiceTools } from './tools/voice-tools.js'
import { createVisualTools } from './tools/visual-tools.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.join(__dirname, '../../../../skills')

const AGENT_TYPES = ['story_adapter', 'world_builder', 'storyboard_breaker', 'voice_caster', 'visual_director'] as const
type AgentType = typeof AGENT_TYPES[number]

function loadSkill(type: AgentType): string {
  const skillPath = path.join(SKILLS_DIR, type, 'SKILL.md')
  try {
    return fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf-8') : ''
  } catch {
    return ''
  }
}

function getModel(modelOverride?: string | null) {
  const modelId = modelOverride ?? process.env.DEFAULT_TEXT_MODEL ?? 'gpt-4o'
  if (modelId.startsWith('gemini')) return google(modelId)
  return openai(modelId)
}

const BASE_INSTRUCTIONS: Record<AgentType, string> = {
  story_adapter: `你是一位擅长将真实个人生活记录转化为短剧剧本的创作助手。
你的任务是：阅读用户的日记、回忆、随感等原始记录，将其改写成具有戏剧感的短剧剧本格式。
核心原则：保留真实情感内核，不要过度戏剧化；维持记录者的视角和个人声音。`,

  world_builder: `你是一位专业的故事世界构建助手。
你的任务是：从短剧剧本中精确提取所有角色和场景，并与已有数据进行去重合并。
核心原则：按名字精确匹配去重；新信息补充旧记录，不要覆盖已有内容；确保每个角色和场景有完整的视觉描述。`,

  storyboard_breaker: `你是一位专业的分镜脚本创作师。
你的任务是：将短剧剧本拆解为详细的分镜序列，每个分镜都应包含完整的镜头语言描述。
核心原则：每集控制在 6-12 个镜头；注重视觉叙事节奏；提示词要适合 AI 图片/视频生成。`,

  voice_caster: `你是一位专业的声音导演助手。
你的任务是：为短剧中的每个角色选择最合适的 TTS 音色，使声音与角色性格、年龄、性别完美匹配。
核心原则：根据角色描述推断合适的音色特质；试听后再做最终分配决定。`,

  visual_director: `你是一位专业的视觉提示词创作师。
你的任务是：为角色、场景和分镜生成高质量的 AI 图片/视频生成提示词。
核心原则：提示词应包含风格、光线、构图、色调等细节；角色提示词要保持一致的外观描述；场景提示词要有氛围感。`,
}

export function createAgent(type: string, episodeId: number, projectId: number): Agent | null {
  if (!AGENT_TYPES.includes(type as AgentType)) return null

  const agentType = type as AgentType
  const dbConfig = db.select().from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.agentType, agentType)).get()

  const skillDocs = loadSkill(agentType)
  const baseInstructions = BASE_INSTRUCTIONS[agentType]
  const instructions = [
    baseInstructions,
    skillDocs ? `\n\n## 技能参考文档\n${skillDocs}` : '',
    dbConfig?.customInstructions ? `\n\n## 自定义指令\n${dbConfig.customInstructions}` : '',
  ].filter(Boolean).join('')

  const model = getModel(dbConfig?.modelOverride)

  let tools: Record<string, unknown> = {}
  if (agentType === 'story_adapter') tools = createStoryTools(episodeId)
  else if (agentType === 'world_builder') tools = createExtractTools(episodeId, projectId)
  else if (agentType === 'storyboard_breaker') tools = createStoryboardTools(episodeId, projectId)
  else if (agentType === 'voice_caster') tools = createVoiceTools(episodeId)
  else if (agentType === 'visual_director') tools = createVisualTools(episodeId, projectId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Agent({ id: agentType, name: agentType, instructions, model, tools: tools as any })
}
