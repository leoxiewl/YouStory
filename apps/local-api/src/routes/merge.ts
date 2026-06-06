import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

// 整集视频拼接导出
router.post('/episodes/:id/merge', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, id)).get()
    if (!episode) return notFound(c)

    const result = db.insert(schema.videoMerges).values({
      episodeId: id,
      status: 'processing',
    }).run()
    const mergeId = Number(result.lastInsertRowid)

    // TODO: 接入 ffmpeg-merge.ts 服务（fire-and-forget）

    return ok(c, { id: mergeId, status: 'processing', episodeId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 查询拼接状态
router.get('/episodes/:id/merge', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const merges = db.select().from(schema.videoMerges)
      .where(eq(schema.videoMerges.episodeId, id))
      .orderBy(schema.videoMerges.createdAt)
      .all()

    const latest = merges[merges.length - 1] ?? null
    return ok(c, latest)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
