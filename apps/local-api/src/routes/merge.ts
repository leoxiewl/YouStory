import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'
import { mergeEpisodeVideos } from '../services/local-media.js'

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

    const storyboards = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, id))
      .orderBy(schema.storyboards.orderIndex)
      .all()

    const merged = await mergeEpisodeVideos(id, storyboards)
    db.update(schema.videoMerges).set({
      status: 'completed',
      mergedUrl: merged.url,
      localPath: merged.localPath,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.videoMerges.id, mergeId)).run()

    return ok(c, { id: mergeId, status: 'completed', episodeId: id, mergedUrl: merged.url })
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
