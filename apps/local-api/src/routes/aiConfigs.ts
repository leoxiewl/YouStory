import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.get('/', async (c) => {
  try {
    const rows = db.select().from(schema.aiConfigs).all()
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.aiConfigs).values({
      serviceType: body.serviceType,
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model,
      extraParams: body.extraParams ? JSON.stringify(body.extraParams) : null,
      isDefault: body.isDefault ?? false,
      isActive: body.isActive ?? true,
    }).run()
    const row = db.select().from(schema.aiConfigs)
      .where(eq(schema.aiConfigs.id, Number(result.lastInsertRowid))).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.aiConfigs).set({
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model,
      extraParams: body.extraParams ? JSON.stringify(body.extraParams) : undefined,
      isDefault: body.isDefault,
      isActive: body.isActive,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.aiConfigs.id, id)).run()
    const row = db.select().from(schema.aiConfigs).where(eq(schema.aiConfigs.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 获取所有支持的 AI 厂商列表
router.get('/providers', async (c) => {
  return ok(c, {
    image: ['openai', 'gemini', 'minimax', 'volcengine', 'aliyun'],
    video: ['minimax', 'volcengine', 'vidu', 'aliyun'],
    tts: ['minimax'],
    text: ['openai', 'gemini'],
  })
})

export default router
