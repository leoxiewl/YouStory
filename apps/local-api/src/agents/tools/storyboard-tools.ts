import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

export function createStoryboardTools(episodeId: number, projectId: number) {
  const readEpisodeContext = createTool({
    id: 'read_episode_context',
    description: '读取当前集的完整上下文：剧本、角色列表、场景列表',
    inputSchema: z.object({}),
    execute: async () => {
      const episode = db.select().from(schema.episodes)
        .where(eq(schema.episodes.id, episodeId)).get()
      if (!episode) return { error: 'Episode not found' }

      const characters = db.select({ character: schema.characters })
        .from(schema.episodeCharacters)
        .innerJoin(schema.characters, eq(schema.episodeCharacters.characterId, schema.characters.id))
        .where(eq(schema.episodeCharacters.episodeId, episodeId))
        .all().map(r => r.character)

      const scenes = db.select({ scene: schema.scenes })
        .from(schema.episodeScenes)
        .innerJoin(schema.scenes, eq(schema.episodeScenes.sceneId, schema.scenes.id))
        .where(eq(schema.episodeScenes.episodeId, episodeId))
        .all().map(r => r.scene)

      return {
        episode: { id: episode.id, title: episode.title, scriptContent: episode.scriptContent },
        characters,
        scenes,
      }
    },
  })

  const saveStoryboards = createTool({
    id: 'save_storyboards',
    description: '保存分镜序列（先清除当前集已有分镜，再写入新的）',
    inputSchema: z.object({
      storyboards: z.array(z.object({
        orderIndex: z.number(),
        shotType: z.string().optional().describe('景别：extreme_close|close|medium|full|long'),
        angle: z.string().optional().describe('机位：eye|low|high|bird|worm'),
        movement: z.string().optional().describe('运动：static|pan|tilt|dolly|zoom|handheld'),
        duration: z.number().optional().describe('时长（秒）'),
        dialogue: z.string().optional(),
        narration: z.string().optional(),
        bgmNote: z.string().optional(),
        soundEffect: z.string().optional(),
        imagePrompt: z.string().optional().describe('静态画面提示词（适合图片生成）'),
        videoPrompt: z.string().optional().describe('动态视频提示词（适合视频生成）'),
      })),
    }),
    execute: async ({ storyboards }) => {
      // 清除已有分镜
      db.delete(schema.storyboards)
        .where(eq(schema.storyboards.episodeId, episodeId))
        .run()

      // 写入新分镜
      const ids: number[] = []
      for (const sb of storyboards) {
        const res = db.insert(schema.storyboards).values({
          episodeId,
          orderIndex: sb.orderIndex,
          shotType: sb.shotType,
          angle: sb.angle,
          movement: sb.movement,
          duration: sb.duration,
          dialogue: sb.dialogue,
          narration: sb.narration,
          bgmNote: sb.bgmNote,
          soundEffect: sb.soundEffect,
          imagePrompt: sb.imagePrompt,
          videoPrompt: sb.videoPrompt,
        }).run()
        ids.push(Number(res.lastInsertRowid))
      }

      return { saved: ids.length, storyboardIds: ids }
    },
  })

  return {
    read_episode_context: readEpisodeContext,
    save_storyboards: saveStoryboards,
  }
}
