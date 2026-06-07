import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'
import { composeStoryboardVideo } from '../services/local-media.js'

const router = new Hono()

// 单镜头合成（视频 + TTS 音频 + 字幕）
router.post('/storyboards/:id/compose', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)

    if (!sb.videoUrl) return err(c, 'No video URL for this storyboard', 400)

    const composed = await composeStoryboardVideo(sb)
    db.update(schema.storyboards).set({
      composedVideoUrl: composed.url,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.storyboards.id, id)).run()

    return ok(c, { message: 'Composed', storyboardId: id, composedVideoUrl: composed.url })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 全集批量合成
router.post('/episodes/:id/compose-all', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, id)).get()
    if (!episode) return notFound(c)

    const storyboards = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, id))
      .orderBy(schema.storyboards.orderIndex)
      .all()

    const composed: Array<{ storyboardId: number; composedVideoUrl: string }> = []
    for (const storyboard of storyboards) {
      if (!storyboard.videoUrl) continue

      const result = await composeStoryboardVideo(storyboard)
      db.update(schema.storyboards).set({
        composedVideoUrl: result.url,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.storyboards.id, storyboard.id)).run()
      composed.push({ storyboardId: storyboard.id, composedVideoUrl: result.url })
    }

    return ok(c, { message: 'Batch composed', episodeId: id, count: composed.length, composed })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 查询合成状态
router.get('/episodes/:id/compose-status', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const storyboards = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, id))
      .orderBy(schema.storyboards.orderIndex)
      .all()

    const total = storyboards.length
    const composed = storyboards.filter(sb => !!sb.composedVideoUrl).length

    return ok(c, { total, composed, progress: total > 0 ? composed / total : 0 })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
