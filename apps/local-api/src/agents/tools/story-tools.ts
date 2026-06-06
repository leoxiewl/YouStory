import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

export function createStoryTools(episodeId: number) {
  const readEpisodeRaw = createTool({
    id: 'read_episode_raw',
    description: '读取当前集的原始记录内容，用于改写为剧本',
    inputSchema: z.object({}),
    execute: async () => {
      const episode = db.select().from(schema.episodes)
        .where(eq(schema.episodes.id, episodeId)).get()
      if (!episode) return { error: 'Episode not found' }
      return {
        episodeId: episode.id,
        title: episode.title,
        rawContent: episode.rawContent ?? '',
        summary: episode.summary ?? '',
      }
    },
  })

  const saveScript = createTool({
    id: 'save_script',
    description: '将改写好的剧本保存到数据库',
    inputSchema: z.object({
      scriptContent: z.string().describe('改写后的完整剧本内容（格式化的中文短剧剧本）'),
    }),
    execute: async ({ scriptContent }) => {
      db.update(schema.episodes).set({
        scriptContent,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.episodes.id, episodeId)).run()
      return { success: true, episodeId, savedLength: scriptContent.length }
    },
  })

  return { read_episode_raw: readEpisodeRaw, save_script: saveScript }
}
