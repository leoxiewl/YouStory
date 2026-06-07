import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'
import {
  generatePlaceholderImage,
  generateSilentAudio,
  generateStoryboardVideo,
} from '../services/local-media.js'

const router = new Hono()

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.storyboards).values({
      episodeId: body.episodeId,
      orderIndex: body.orderIndex,
      shotType: body.shotType,
      angle: body.angle,
      movement: body.movement,
      duration: body.duration,
      dialogue: body.dialogue,
      narration: body.narration,
      bgmNote: body.bgmNote,
      soundEffect: body.soundEffect,
      imagePrompt: body.imagePrompt,
      videoPrompt: body.videoPrompt,
    }).run()
    const row = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.id, Number(result.lastInsertRowid))).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.storyboards).set({
      orderIndex: body.orderIndex,
      shotType: body.shotType,
      angle: body.angle,
      movement: body.movement,
      duration: body.duration,
      dialogue: body.dialogue,
      narration: body.narration,
      bgmNote: body.bgmNote,
      soundEffect: body.soundEffect,
      imagePrompt: body.imagePrompt,
      videoPrompt: body.videoPrompt,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      ttsAudioUrl: body.ttsAudioUrl,
      composedVideoUrl: body.composedVideoUrl,
      status: body.status,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.storyboards.id, id)).run()
    const row = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.delete('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    db.delete(schema.storyboards).where(eq(schema.storyboards.id, id)).run()
    return ok(c, { id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// TTS 配音生成（本地静音音轨占位，用于跑通合成链路）
router.post('/:id/generate-tts', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)

    const audio = await generateSilentAudio(sb)
    db.update(schema.storyboards).set({
      ttsAudioUrl: audio.url,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.storyboards.id, id)).run()

    return ok(c, { message: 'TTS generated', storyboardId: id, audioUrl: audio.url })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 分镜图片生成（本地占位图片）
router.post('/:id/generate-image', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)

    const image = await generatePlaceholderImage(
      'storyboard',
      id,
      `分镜 ${sb.orderIndex + 1}`,
      sb.imagePrompt ?? sb.videoPrompt ?? sb.dialogue ?? sb.narration ?? 'YouStorys storyboard',
    )
    db.update(schema.storyboards).set({
      imageUrl: image.url,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.storyboards.id, id)).run()

    return ok(c, { message: 'Image generated', storyboardId: id, imageUrl: image.url })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 分镜视频生成（本地图片转视频）
router.post('/:id/generate-video', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)

    let storyboard = sb
    if (!storyboard.imageUrl) {
      const image = await generatePlaceholderImage(
        'storyboard',
        id,
        `分镜 ${sb.orderIndex + 1}`,
        sb.imagePrompt ?? sb.videoPrompt ?? sb.dialogue ?? sb.narration ?? 'YouStorys storyboard',
      )
      db.update(schema.storyboards).set({
        imageUrl: image.url,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.storyboards.id, id)).run()
      storyboard = { ...storyboard, imageUrl: image.url }
    }

    const video = await generateStoryboardVideo(storyboard)
    db.update(schema.storyboards).set({
      videoUrl: video.url,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.storyboards.id, id)).run()

    db.insert(schema.videoGenerations).values({
      storyboardId: id,
      provider: 'local',
      model: 'ffmpeg-placeholder',
      prompt: sb.videoPrompt ?? sb.imagePrompt ?? '',
      duration: sb.duration,
      status: 'completed',
      videoUrl: video.url,
      localPath: video.localPath,
    }).run()

    return ok(c, { message: 'Video generated', storyboardId: id, videoUrl: video.url })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
