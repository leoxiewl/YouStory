import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

// 单镜头合成（视频 + TTS 音频 + 字幕）
router.post('/storyboards/:id/compose', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const sb = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).get()
    if (!sb) return notFound(c)

    if (!sb.videoUrl) return err(c, 'No video URL for this storyboard', 400)

    // TODO: 接入 ffmpeg-compose.ts 服务
    return ok(c, { message: 'Compose queued', storyboardId: id, status: 'processing' })
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

    // TODO: 批量调用 ffmpeg-compose.ts
    return ok(c, { message: 'Batch compose queued', episodeId: id, count: storyboards.length })
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
