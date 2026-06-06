import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

export function createVoiceTools(episodeId: number) {
  const listVoices = createTool({
    id: 'list_voices',
    description: '获取所有可用的 TTS 音色列表',
    inputSchema: z.object({
      gender: z.enum(['male', 'female']).optional(),
    }),
    execute: async ({ gender }) => {
      const rows = gender
        ? db.select().from(schema.aiVoices).where(eq(schema.aiVoices.gender, gender)).all()
        : db.select().from(schema.aiVoices).all()
      return { voices: rows }
    },
  })

  const getEpisodeCharacters = createTool({
    id: 'get_episode_characters',
    description: '获取当前集的所有角色（含已分配的音色信息）',
    inputSchema: z.object({}),
    execute: async () => {
      const rows = db.select({ character: schema.characters })
        .from(schema.episodeCharacters)
        .innerJoin(schema.characters, eq(schema.episodeCharacters.characterId, schema.characters.id))
        .where(eq(schema.episodeCharacters.episodeId, episodeId))
        .all().map(r => r.character)
      return { characters: rows }
    },
  })

  const assignVoice = createTool({
    id: 'assign_voice',
    description: '为角色分配 TTS 音色',
    inputSchema: z.object({
      characterId: z.number(),
      voiceProvider: z.string().describe('音色提供商，如 minimax'),
      voiceId: z.string().describe('音色 ID'),
    }),
    execute: async ({ characterId, voiceProvider, voiceId }) => {
      db.update(schema.characters).set({
        voiceProvider,
        voiceId,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.characters.id, characterId)).run()
      return { success: true, characterId, voiceProvider, voiceId }
    },
  })

  return {
    list_voices: listVoices,
    get_episode_characters: getEpisodeCharacters,
    assign_voice: assignVoice,
  }
}
