import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.get('/', async (c) => {
  try {
    const rows = db.select().from(schema.projects).orderBy(schema.projects.createdAt).all()
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.projects).values({
      title: body.title,
      summary: body.summary,
      seriesTheme: body.seriesTheme,
      status: body.status ?? 'draft',
    }).run()
    const row = db.select().from(schema.projects)
      .where(eq(schema.projects.id, Number(result.lastInsertRowid))).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.projects).set({
      title: body.title,
      summary: body.summary,
      seriesTheme: body.seriesTheme,
      status: body.status,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.projects.id, id)).run()
    const row = db.select().from(schema.projects).where(eq(schema.projects.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 获取项目下的所有集
router.get('/:id/episodes', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const rows = db.select().from(schema.episodes)
      .where(eq(schema.episodes.projectId, id))
      .orderBy(schema.episodes.episodeNumber)
      .all()
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
