import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createAgent } from '../agents/index.js'
import { db, schema } from '../db/index.js'
import { ok, err, notFound, badRequest } from '../utils/response.js'
import { logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { getRuntimeAiConfig } from '../services/ai-configs.js'
import {
  composeStoryboardVideo,
  generatePlaceholderImage,
  generateSilentAudio,
  generateStoryboardVideo,
  mergeEpisodeVideos,
} from '../services/local-media.js'

const router = new Hono()

router.post('/episodes/:id/run-default', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).get()
  if (!episode) return notFound(c)

  let body: { novelText?: string }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const novelText = body.novelText?.trim() || episode.rawContent?.trim() || episode.scriptContent?.trim()
  if (!novelText) return badRequest(c, 'novelText is required')

  const textConfig = getRuntimeAiConfig('text')
  const imageConfig = getRuntimeAiConfig('image')
  const videoConfig = getRuntimeAiConfig('video')
  const audioConfig = getRuntimeAiConfig('tts')

  logTaskStart('Pipeline', 'Running default short-drama pipeline', { episodeId })

  try {
    db.update(schema.episodes).set({
      rawContent: novelText,
      imageConfigId: imageConfig?.id ?? null,
      videoConfigId: videoConfig?.id ?? null,
      audioConfigId: audioConfig?.id ?? null,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.episodes.id, episodeId)).run()

    await runAgentStep('story_adapter', episodeId, episode.projectId, `请将以下小说内容改写为适合短剧拍摄的格式化中文剧本，并调用工具保存剧本：\n\n${novelText}`)
    await runAgentStep('world_builder', episodeId, episode.projectId, '请读取当前集剧本，提取全部角色和场景，去重后调用工具保存。')
    await runAgentStep('storyboard_breaker', episodeId, episode.projectId, '请读取当前集剧本、角色和场景，将剧本拆解为 6-12 个分镜，并调用工具保存。')

    const characters = getEpisodeCharacters(episodeId)
    const scenes = getEpisodeScenes(episodeId)
    const storyboards = getEpisodeStoryboards(episodeId)

    if (storyboards.length === 0) {
      throw new Error('Agent did not save storyboards. Please check the text model API key and model capability.')
    }

    for (const character of characters) {
      const image = await generatePlaceholderImage(
        'character',
        character.id,
        character.name,
        character.imagePrompt ?? character.appearance ?? character.description ?? 'YouStorys character',
      )

      db.update(schema.characters).set({
        voiceProvider: audioConfig?.provider ?? 'local',
        voiceId: character.voiceId ?? `${audioConfig?.provider ?? 'local'}_default_voice`,
        imageUrl: image.url,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.characters.id, character.id)).run()
    }

    for (const scene of scenes) {
      const image = await generatePlaceholderImage(
        'scene',
        scene.id,
        scene.name,
        scene.imagePrompt ?? scene.description ?? scene.atmosphere ?? 'YouStorys scene',
      )

      db.update(schema.scenes).set({
        imageUrl: image.url,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.scenes.id, scene.id)).run()
    }

    const composed: Array<{ storyboardId: number; composedVideoUrl: string }> = []
    for (const storyboard of storyboards) {
      const audio = await generateSilentAudio(storyboard)
      const image = await generatePlaceholderImage(
        'storyboard',
        storyboard.id,
        `分镜 ${storyboard.orderIndex + 1}`,
        storyboard.imagePrompt ?? storyboard.videoPrompt ?? storyboard.dialogue ?? storyboard.narration ?? 'YouStorys storyboard',
      )
      const video = await generateStoryboardVideo({ ...storyboard, imageUrl: image.url, ttsAudioUrl: audio.url })
      const composedVideo = await composeStoryboardVideo({
        ...storyboard,
        imageUrl: image.url,
        videoUrl: video.url,
        ttsAudioUrl: audio.url,
      })

      db.update(schema.storyboards).set({
        ttsAudioUrl: audio.url,
        imageUrl: image.url,
        videoUrl: video.url,
        composedVideoUrl: composedVideo.url,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.storyboards.id, storyboard.id)).run()

      db.insert(schema.imageGenerations).values({
        storyboardId: storyboard.id,
        provider: imageConfig?.provider ?? 'local',
        model: imageConfig?.model ?? 'sharp-placeholder',
        prompt: storyboard.imagePrompt ?? storyboard.videoPrompt ?? '',
        status: 'completed',
        imageUrl: image.url,
        localPath: image.localPath,
      }).run()

      db.insert(schema.videoGenerations).values({
        storyboardId: storyboard.id,
        provider: videoConfig?.provider ?? 'local',
        model: videoConfig?.model ?? 'ffmpeg-placeholder',
        prompt: storyboard.videoPrompt ?? storyboard.imagePrompt ?? '',
        duration: storyboard.duration,
        status: 'completed',
        videoUrl: video.url,
        localPath: video.localPath,
      }).run()

      composed.push({ storyboardId: storyboard.id, composedVideoUrl: composedVideo.url })
    }

    const refreshedStoryboards = getEpisodeStoryboards(episodeId)
    const merged = await mergeEpisodeVideos(episodeId, refreshedStoryboards)
    const mergeResult = db.insert(schema.videoMerges).values({
      episodeId,
      status: 'completed',
      mergedUrl: merged.url,
      localPath: merged.localPath,
    }).run()

    const status = getPipelineStatus(episodeId)
    logTaskSuccess('Pipeline', 'Default pipeline completed', { episodeId, storyboards: storyboards.length })

    return ok(c, {
      message: 'Default pipeline completed',
      episodeId,
      textConfigId: textConfig?.id ?? null,
      imageConfigId: imageConfig?.id ?? null,
      videoConfigId: videoConfig?.id ?? null,
      audioConfigId: audioConfig?.id ?? null,
      composed,
      merge: {
        id: Number(mergeResult.lastInsertRowid),
        episodeId,
        status: 'completed',
        mergedUrl: merged.url,
      },
      ...status,
    })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

async function runAgentStep(type: string, episodeId: number, projectId: number, message: string) {
  const agent = createAgent(type, episodeId, projectId)
  if (!agent) throw new Error(`Unknown agent type: ${type}`)

  const result = await agent.generate(
    [{ role: 'user', content: message }],
    { maxSteps: 20 },
  )

  return result
}

function getEpisodeCharacters(episodeId: number) {
  return db.select({ character: schema.characters })
    .from(schema.episodeCharacters)
    .innerJoin(schema.characters, eq(schema.episodeCharacters.characterId, schema.characters.id))
    .where(eq(schema.episodeCharacters.episodeId, episodeId))
    .all()
    .map((row) => row.character)
}

function getEpisodeScenes(episodeId: number) {
  return db.select({ scene: schema.scenes })
    .from(schema.episodeScenes)
    .innerJoin(schema.scenes, eq(schema.episodeScenes.sceneId, schema.scenes.id))
    .where(eq(schema.episodeScenes.episodeId, episodeId))
    .all()
    .map((row) => row.scene)
}

function getEpisodeStoryboards(episodeId: number) {
  return db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId))
    .orderBy(schema.storyboards.orderIndex)
    .all()
}

function getPipelineStatus(episodeId: number) {
  const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).get()
  if (!episode) throw new Error('Episode not found')

  const characters = getEpisodeCharacters(episodeId)
  const scenes = getEpisodeScenes(episodeId)
  const storyboards = getEpisodeStoryboards(episodeId)

  return {
    episode,
    characters,
    scenes,
    storyboards,
    progress: {
      hasRawContent: !!episode.rawContent,
      hasScript: !!episode.scriptContent,
      hasCharacters: characters.length > 0,
      hasScenes: scenes.length > 0,
      hasVoices: characters.some((ch) => !!ch.voiceId),
      hasStoryboards: storyboards.length > 0,
      hasCharacterImages: characters.some((ch) => !!ch.imageUrl),
      hasSceneImages: scenes.some((sc) => !!sc.imageUrl),
      hasTts: storyboards.some((sb) => !!sb.ttsAudioUrl),
      hasShotImages: storyboards.some((sb) => !!sb.imageUrl),
      hasVideos: storyboards.some((sb) => !!sb.videoUrl),
      hasComposedVideos: storyboards.some((sb) => !!sb.composedVideoUrl),
    },
  }
}

export default router
