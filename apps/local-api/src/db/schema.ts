import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

const now = () => new Date().toISOString()

// ─── 原始记录 ───────────────────────────────────────────────────────────────

export const records = sqliteTable('records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  category: text('category').notNull().default('diary'), // diary|reflection|memory|travel|family|growth
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 剧集项目 ───────────────────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  summary: text('summary'),
  seriesTheme: text('series_theme'),
  status: text('status').notNull().default('draft'), // draft|in_progress|completed
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 单集 ────────────────────────────────────────────────────────────────────

export const episodes = sqliteTable('episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  rawContent: text('raw_content'),       // 原始记录内容
  scriptContent: text('script_content'), // AI 改写后的剧本
  imageConfigId: integer('image_config_id').references(() => aiConfigs.id),
  videoConfigId: integer('video_config_id').references(() => aiConfigs.id),
  audioConfigId: integer('audio_config_id').references(() => aiConfigs.id),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 角色（project 级复用） ─────────────────────────────────────────────────

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  role: text('role'),         // protagonist|supporting|minor
  description: text('description'),
  appearance: text('appearance'),
  personality: text('personality'),
  voiceProvider: text('voice_provider'),
  voiceId: text('voice_id'),
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

export const episodeCharacters = sqliteTable('episode_characters', {
  episodeId: integer('episode_id').notNull().references(() => episodes.id),
  characterId: integer('character_id').notNull().references(() => characters.id),
})

// ─── 场景（project 级复用） ─────────────────────────────────────────────────

export const scenes = sqliteTable('scenes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  atmosphere: text('atmosphere'),
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

export const episodeScenes = sqliteTable('episode_scenes', {
  episodeId: integer('episode_id').notNull().references(() => episodes.id),
  sceneId: integer('scene_id').notNull().references(() => scenes.id),
})

// ─── 分镜 ────────────────────────────────────────────────────────────────────

export const storyboards = sqliteTable('storyboards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  episodeId: integer('episode_id').notNull().references(() => episodes.id),
  orderIndex: integer('order_index').notNull(),
  shotType: text('shot_type'),      // 景别：extreme_close|close|medium|full|long
  angle: text('angle'),             // 机位：eye|low|high|bird|worm
  movement: text('movement'),       // 运动：static|pan|tilt|dolly|zoom|handheld
  duration: real('duration'),       // 时长（秒）
  dialogue: text('dialogue'),       // 对白
  narration: text('narration'),     // 旁白
  bgmNote: text('bgm_note'),        // 背景音乐描述
  soundEffect: text('sound_effect'),
  imagePrompt: text('image_prompt'),
  videoPrompt: text('video_prompt'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  ttsAudioUrl: text('tts_audio_url'),
  composedVideoUrl: text('composed_video_url'),
  status: text('status').notNull().default('pending'), // pending|processing|completed|failed
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 图片生成任务 ────────────────────────────────────────────────────────────

export const imageGenerations = sqliteTable('image_generations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storyboardId: integer('storyboard_id').references(() => storyboards.id),
  characterId: integer('character_id').references(() => characters.id),
  sceneId: integer('scene_id').references(() => scenes.id),
  provider: text('provider').notNull(),
  model: text('model'),
  prompt: text('prompt').notNull(),
  taskId: text('task_id'),           // 异步任务 ID（供轮询）
  status: text('status').notNull().default('processing'), // processing|completed|failed
  imageUrl: text('image_url'),
  localPath: text('local_path'),
  errorMsg: text('error_msg'),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 视频生成任务 ────────────────────────────────────────────────────────────

export const videoGenerations = sqliteTable('video_generations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storyboardId: integer('storyboard_id').references(() => storyboards.id),
  provider: text('provider').notNull(),
  model: text('model'),
  prompt: text('prompt').notNull(),
  duration: real('duration'),
  taskId: text('task_id'),
  status: text('status').notNull().default('processing'), // processing|completed|failed
  videoUrl: text('video_url'),
  localPath: text('local_path'),
  errorMsg: text('error_msg'),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 整集合成任务 ────────────────────────────────────────────────────────────

export const videoMerges = sqliteTable('video_merges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  episodeId: integer('episode_id').notNull().references(() => episodes.id),
  status: text('status').notNull().default('processing'),
  mergedUrl: text('merged_url'),
  localPath: text('local_path'),
  errorMsg: text('error_msg'),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── AI 服务配置 ─────────────────────────────────────────────────────────────

export const aiConfigs = sqliteTable('ai_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceType: text('service_type').notNull(), // text|image|video|tts
  provider: text('provider').notNull(),        // openai|gemini|minimax|volcengine|vidu
  name: text('name').notNull(),
  baseUrl: text('base_url'),
  apiKey: text('api_key'),
  model: text('model'),
  extraParams: text('extra_params'),           // JSON string for provider-specific params
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(now),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 声音库 ──────────────────────────────────────────────────────────────────

export const aiVoices = sqliteTable('ai_voices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(),
  voiceId: text('voice_id').notNull(),
  name: text('name').notNull(),
  gender: text('gender'),    // male|female
  style: text('style'),      // 风格描述
  previewUrl: text('preview_url'),
  createdAt: text('created_at').notNull().$defaultFn(now),
})

// ─── Agent 配置（运行时可调整） ───────────────────────────────────────────────

export const agentConfigs = sqliteTable('agent_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentType: text('agent_type').notNull().unique(), // story_adapter|world_builder|...
  customInstructions: text('custom_instructions'), // 覆盖 SKILL.md 的额外指令
  modelOverride: text('model_override'),           // 指定不同模型
  updatedAt: text('updated_at').notNull().$defaultFn(now),
})

// ─── 类型导出 ─────────────────────────────────────────────────────────────────

export type Record = typeof records.$inferSelect
export type NewRecord = typeof records.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Episode = typeof episodes.$inferSelect
export type NewEpisode = typeof episodes.$inferInsert
export type Character = typeof characters.$inferSelect
export type NewCharacter = typeof characters.$inferInsert
export type Scene = typeof scenes.$inferSelect
export type NewScene = typeof scenes.$inferInsert
export type Storyboard = typeof storyboards.$inferSelect
export type NewStoryboard = typeof storyboards.$inferInsert
export type ImageGeneration = typeof imageGenerations.$inferSelect
export type VideoGeneration = typeof videoGenerations.$inferSelect
export type AiConfig = typeof aiConfigs.$inferSelect
export type AiVoice = typeof aiVoices.$inferSelect
export type AgentConfig = typeof agentConfigs.$inferSelect
