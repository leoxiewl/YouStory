import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'

export function createVisualTools(episodeId: number, projectId: number) {
  const readVisualContext = createTool({
    id: 'read_visual_context',
    description: '读取视觉创作所需的完整上下文：角色、场景、分镜列表',
    inputSchema: z.object({}),
    execute: async () => {
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

      const storyboards = db.select().from(schema.storyboards)
        .where(eq(schema.storyboards.episodeId, episodeId))
        .orderBy(schema.storyboards.orderIndex)
        .all()

      return { characters, scenes, storyboards }
    },
  })

  const saveCharacterPrompts = createTool({
    id: 'save_character_prompts',
    description: '批量保存角色的图片生成提示词',
    inputSchema: z.object({
      characters: z.array(z.object({
        id: z.number(),
        imagePrompt: z.string().describe('英文图片生成提示词，包含外貌、服装、风格、光线等'),
      })),
    }),
    execute: async ({ characters }) => {
      for (const char of characters) {
        db.update(schema.characters).set({
          imagePrompt: char.imagePrompt,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.characters.id, char.id)).run()
      }
      return { saved: characters.length }
    },
  })

  const saveScenePrompts = createTool({
    id: 'save_scene_prompts',
    description: '批量保存场景的图片生成提示词',
    inputSchema: z.object({
      scenes: z.array(z.object({
        id: z.number(),
        imagePrompt: z.string().describe('英文图片生成提示词，包含环境、氛围、光线、风格等'),
      })),
    }),
    execute: async ({ scenes }) => {
      for (const scene of scenes) {
        db.update(schema.scenes).set({
          imagePrompt: scene.imagePrompt,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.scenes.id, scene.id)).run()
      }
      return { saved: scenes.length }
    },
  })

  const saveShotPrompts = createTool({
    id: 'save_shot_prompts',
    description: '批量保存分镜的图片和视频生成提示词',
    inputSchema: z.object({
      storyboards: z.array(z.object({
        id: z.number(),
        imagePrompt: z.string().describe('静态画面提示词，适合图片生成'),
        videoPrompt: z.string().describe('动态视频提示词，包含运动描述、时间标记等'),
      })),
    }),
    execute: async ({ storyboards }) => {
      for (const sb of storyboards) {
        db.update(schema.storyboards).set({
          imagePrompt: sb.imagePrompt,
          videoPrompt: sb.videoPrompt,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.storyboards.id, sb.id)).run()
      }
      return { saved: storyboards.length }
    },
  })

  return {
    read_visual_context: readVisualContext,
    save_character_prompts: saveCharacterPrompts,
    save_scene_prompts: saveScenePrompts,
    save_shot_prompts: saveShotPrompts,
  }
}
