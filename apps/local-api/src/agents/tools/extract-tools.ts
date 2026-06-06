import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

export function createExtractTools(episodeId: number, projectId: number) {
  const readScript = createTool({
    id: 'read_script',
    description: '读取当前集的格式化剧本内容，用于提取角色和场景',
    inputSchema: z.object({}),
    execute: async () => {
      const episode = db.select().from(schema.episodes)
        .where(eq(schema.episodes.id, episodeId)).get()
      if (!episode) return { error: 'Episode not found' }
      return { scriptContent: episode.scriptContent ?? episode.rawContent ?? '' }
    },
  })

  const readExistingCharacters = createTool({
    id: 'read_existing_characters',
    description: '读取项目中已有的角色列表，用于去重比对',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = db.select().from(schema.characters)
        .where(eq(schema.characters.projectId, projectId)).all()
      return { characters: rows }
    },
  })

  const readExistingScenes = createTool({
    id: 'read_existing_scenes',
    description: '读取项目中已有的场景列表，用于去重比对',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = db.select().from(schema.scenes)
        .where(eq(schema.scenes.projectId, projectId)).all()
      return { scenes: rows }
    },
  })

  const saveCharacters = createTool({
    id: 'save_characters',
    description: '智能去重保存角色列表（按名字匹配：已有则更新补充，不存在则新增）',
    inputSchema: z.object({
      characters: z.array(z.object({
        name: z.string(),
        role: z.string().optional(),
        description: z.string().optional(),
        appearance: z.string().optional(),
        personality: z.string().optional(),
      })),
    }),
    execute: async ({ characters }) => {
      const existing = db.select().from(schema.characters)
        .where(eq(schema.characters.projectId, projectId)).all()

      const savedIds: number[] = []

      for (const char of characters) {
        const match = existing.find(c => c.name === char.name)

        if (match) {
          db.update(schema.characters).set({
            description: char.description ?? match.description ?? undefined,
            appearance: char.appearance ?? match.appearance ?? undefined,
            personality: char.personality ?? match.personality ?? undefined,
            role: char.role ?? match.role ?? undefined,
            updatedAt: new Date().toISOString(),
          }).where(eq(schema.characters.id, match.id)).run()
          savedIds.push(match.id)
        } else {
          const res = db.insert(schema.characters).values({
            projectId,
            name: char.name,
            role: char.role,
            description: char.description,
            appearance: char.appearance,
            personality: char.personality,
          }).run()
          savedIds.push(Number(res.lastInsertRowid))
        }
      }

      // 关联角色到当前集（忽略重复）
      for (const charId of savedIds) {
        try {
          db.insert(schema.episodeCharacters)
            .values({ episodeId, characterId: charId })
            .run()
        } catch {
          // 已关联，忽略
        }
      }

      return { saved: savedIds.length, characterIds: savedIds }
    },
  })

  const saveScenes = createTool({
    id: 'save_scenes',
    description: '智能去重保存场景列表（按名字匹配：已有则更新补充，不存在则新增）',
    inputSchema: z.object({
      scenes: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        atmosphere: z.string().optional(),
      })),
    }),
    execute: async ({ scenes }) => {
      const existing = db.select().from(schema.scenes)
        .where(eq(schema.scenes.projectId, projectId)).all()

      const savedIds: number[] = []

      for (const scene of scenes) {
        const match = existing.find(s => s.name === scene.name)

        if (match) {
          db.update(schema.scenes).set({
            description: scene.description ?? match.description ?? undefined,
            atmosphere: scene.atmosphere ?? match.atmosphere ?? undefined,
            updatedAt: new Date().toISOString(),
          }).where(eq(schema.scenes.id, match.id)).run()
          savedIds.push(match.id)
        } else {
          const res = db.insert(schema.scenes).values({
            projectId,
            name: scene.name,
            description: scene.description,
            atmosphere: scene.atmosphere,
          }).run()
          savedIds.push(Number(res.lastInsertRowid))
        }
      }

      for (const sceneId of savedIds) {
        try {
          db.insert(schema.episodeScenes)
            .values({ episodeId, sceneId })
            .run()
        } catch {
          // 已关联，忽略
        }
      }

      return { saved: savedIds.length, sceneIds: savedIds }
    },
  })

  return {
    read_script: readScript,
    read_existing_characters: readExistingCharacters,
    read_existing_scenes: readExistingScenes,
    save_characters: saveCharacters,
    save_scenes: saveScenes,
  }
}
