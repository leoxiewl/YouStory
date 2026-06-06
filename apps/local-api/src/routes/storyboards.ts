import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

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

// TTS 配音生成（占位）
router.post('/:id/generate-tts', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)
    return ok(c, { message: 'TTS queued', storyboardId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 分镜图片生成（占位）
router.post('/:id/generate-image', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)
    return ok(c, { message: 'Image generation queued', storyboardId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 分镜视频生成（占位）
router.post('/:id/generate-video', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)
    return ok(c, { message: 'Video generation queued', storyboardId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
