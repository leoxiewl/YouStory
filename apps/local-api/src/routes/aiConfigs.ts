import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'
import { clearDefaultAiConfig, maskAiConfig } from '../services/ai-configs.js'

const router = new Hono()

router.get('/', async (c) => {
  try {
    const rows = db.select().from(schema.aiConfigs).all()
    return ok(c, rows.map(maskAiConfig))
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/defaults', async (c) => {
  try {
    const rows = db.select().from(schema.aiConfigs).all()
    const defaults = ['text', 'image', 'video', 'tts'].map((serviceType) => {
      const row =
        rows.find((item) => item.serviceType === serviceType && item.isDefault && item.isActive) ??
        rows.find((item) => item.serviceType === serviceType && item.isActive)

      return row ? maskAiConfig(row) : null
    })

    return ok(c, defaults)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    if (body.isDefault ?? true) clearDefaultAiConfig(body.serviceType)

    const result = db.insert(schema.aiConfigs).values({
      serviceType: body.serviceType,
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model,
      extraParams: body.extraParams ? JSON.stringify(body.extraParams) : null,
      isDefault: body.isDefault ?? true,
      isActive: body.isActive ?? true,
    }).run()
    const row = db.select().from(schema.aiConfigs)
      .where(eq(schema.aiConfigs.id, Number(result.lastInsertRowid))).get()
    return ok(c, row ? maskAiConfig(row) : row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const existing = db.select().from(schema.aiConfigs).where(eq(schema.aiConfigs.id, id)).get()
    if (!existing) return notFound(c)

    const serviceType = body.serviceType ?? existing.serviceType
    if (body.isDefault ?? existing.isDefault) clearDefaultAiConfig(serviceType)

    db.update(schema.aiConfigs).set({
      serviceType,
      provider: body.provider ?? existing.provider,
      name: body.name ?? existing.name,
      baseUrl: body.baseUrl ?? existing.baseUrl,
      apiKey: body.apiKey === undefined ? existing.apiKey : body.apiKey,
      model: body.model ?? existing.model,
      extraParams: body.extraParams === undefined ? existing.extraParams : JSON.stringify(body.extraParams),
      isDefault: body.isDefault ?? existing.isDefault,
      isActive: body.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.aiConfigs.id, id)).run()
    const row = db.select().from(schema.aiConfigs).where(eq(schema.aiConfigs.id, id)).get()
    return row ? ok(c, maskAiConfig(row)) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.delete('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    db.delete(schema.aiConfigs).where(eq(schema.aiConfigs.id, id)).run()
    return ok(c, { id })
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
