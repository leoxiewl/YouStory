import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.characters).values({
      projectId: body.projectId,
      name: body.name,
      role: body.role,
      description: body.description,
      appearance: body.appearance,
      personality: body.personality,
    }).run()
    const id = Number(result.lastInsertRowid)

    // 若同时提供 episodeId，建立关联
    if (body.episodeId) {
      db.insert(schema.episodeCharacters).values({ episodeId: body.episodeId, characterId: id }).run()
    }

    const row = db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.characters).set({
      name: body.name,
      role: body.role,
      description: body.description,
      appearance: body.appearance,
      personality: body.personality,
      voiceProvider: body.voiceProvider,
      voiceId: body.voiceId,
      imageUrl: body.imageUrl,
      imagePrompt: body.imagePrompt,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.characters.id, id)).run()
    const row = db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 生成角色图片（占位，后续接入图片生成服务）
router.post('/:id/generate-image', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const character = db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()
    if (!character) return notFound(c)

    // TODO: 接入 image-generation.ts 服务
    return ok(c, { message: 'Image generation queued', characterId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 生成角色试音（占位，后续接入 TTS 服务）
router.post('/:id/generate-voice-sample', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const character = db.select().from(schema.characters).where(eq(schema.characters.id, id)).get()
    if (!character) return notFound(c)

    // TODO: 接入 tts-generation.ts 服务
    return ok(c, { message: 'Voice sample queued', characterId: id })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
