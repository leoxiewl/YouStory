import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok, err, notFound } from '../utils/response.js'

const router = new Hono()

router.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = db.insert(schema.episodes).values({
      projectId: body.projectId,
      episodeNumber: body.episodeNumber,
      title: body.title,
      summary: body.summary,
      rawContent: body.rawContent,
    }).run()
    const row = db.select().from(schema.episodes)
      .where(eq(schema.episodes.id, Number(result.lastInsertRowid))).get()
    return ok(c, row, 201)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

router.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.episodes).where(eq(schema.episodes.id, id)).get()
  return row ? ok(c, row) : notFound(c)
})

router.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    db.update(schema.episodes).set({
      title: body.title,
      summary: body.summary,
      rawContent: body.rawContent,
      scriptContent: body.scriptContent,
      imageConfigId: body.imageConfigId,
      videoConfigId: body.videoConfigId,
      audioConfigId: body.audioConfigId,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.episodes.id, id)).run()
    const row = db.select().from(schema.episodes).where(eq(schema.episodes.id, id)).get()
    return row ? ok(c, row) : notFound(c)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 获取集的角色列表
router.get('/:id/characters', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const rows = db.select({ character: schema.characters })
      .from(schema.episodeCharacters)
      .innerJoin(schema.characters, eq(schema.episodeCharacters.characterId, schema.characters.id))
      .where(eq(schema.episodeCharacters.episodeId, id))
      .all()
      .map(r => r.character)
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 获取集的场景列表
router.get('/:id/scenes', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const rows = db.select({ scene: schema.scenes })
      .from(schema.episodeScenes)
      .innerJoin(schema.scenes, eq(schema.episodeScenes.sceneId, schema.scenes.id))
      .where(eq(schema.episodeScenes.episodeId, id))
      .all()
      .map(r => r.scene)
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 获取集的分镜列表
router.get('/:id/storyboards', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const rows = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, id))
      .orderBy(schema.storyboards.orderIndex)
      .all()
    return ok(c, rows)
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

// 11 步工作流进度聚合查询
router.get('/:id/pipeline-status', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, id)).get()
    if (!episode) return notFound(c)

    const characters = db.select({ character: schema.characters })
      .from(schema.episodeCharacters)
      .innerJoin(schema.characters, eq(schema.episodeCharacters.characterId, schema.characters.id))
      .where(eq(schema.episodeCharacters.episodeId, id))
      .all().map(r => r.character)

    const scenes = db.select({ scene: schema.scenes })
      .from(schema.episodeScenes)
      .innerJoin(schema.scenes, eq(schema.episodeScenes.sceneId, schema.scenes.id))
      .where(eq(schema.episodeScenes.episodeId, id))
      .all().map(r => r.scene)

    const storyboards = db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, id))
      .orderBy(schema.storyboards.orderIndex)
      .all()

    return ok(c, {
      episode,
      characters,
      scenes,
      storyboards,
      progress: {
        hasRawContent: !!episode.rawContent,
        hasScript: !!episode.scriptContent,
        hasCharacters: characters.length > 0,
        hasScenes: scenes.length > 0,
        hasVoices: characters.some(ch => !!ch.voiceId),
        hasStoryboards: storyboards.length > 0,
        hasCharacterImages: characters.some(ch => !!ch.imageUrl),
        hasSceneImages: scenes.some(sc => !!sc.imageUrl),
        hasTts: storyboards.some(sb => !!sb.ttsAudioUrl),
        hasShotImages: storyboards.some(sb => !!sb.imageUrl),
        hasVideos: storyboards.some(sb => !!sb.videoUrl),
        hasComposedVideos: storyboards.some(sb => !!sb.composedVideoUrl),
      },
    })
  } catch (e) {
    return err(c, (e as Error).message)
  }
})

export default router
