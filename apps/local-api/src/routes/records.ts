import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.get('/', async (c) => {
  try {
    const rows = db.select().from(schema.records).orderBy(schema.records.createdAt).all()
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.records).values({
      title: body.title,
      body: body.body,
      category: body.category ?? 'diary',
    }).run()
    const row = db.select().from(schema.records)
      .where(eq(schema.records.id, Number(result.lastInsertRowid))).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.records).where(eq(schema.records.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.records).set({
      title: body.title,
      body: body.body,
      category: body.category,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.records.id, id)).run()
    const row = db.select().from(schema.records).where(eq(schema.records.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.delete('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    db.delete(schema.records).where(eq(schema.records.id, id)).run()
    return ok(c, { id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
