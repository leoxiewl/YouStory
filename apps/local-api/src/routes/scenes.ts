import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.scenes).values({
      projectId: body.projectId,
      name: body.name,
      description: body.description,
      atmosphere: body.atmosphere,
    }).run()
    const id = Number(result.lastInsertRowid)

    if (body.episodeId) {
      db.insert(schema.episodeScenes).values({ episodeId: body.episodeId, sceneId: id }).run()
    }

    const row = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.scenes).set({
      name: body.name,
      description: body.description,
      atmosphere: body.atmosphere,
      imageUrl: body.imageUrl,
      imagePrompt: body.imagePrompt,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.scenes.id, id)).run()
    const row = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 生成场景图片（占位）
router.post('/:id/generate-image', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const scene = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).get()
    if (!scene) return notFound(c)
    return ok(c, { message: 'Image generation queued', sceneId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
