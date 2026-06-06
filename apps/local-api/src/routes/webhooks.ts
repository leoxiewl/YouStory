import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { ok } from '../utils/response.js'
import { logTaskSuccess, logTaskError } from '../utils/task-logger.js'

const router = new Hono()

// 通用视频/图片生成回调入口
router.post('/:provider', async (c) => {
  const provider = c.req.param('provider')
  const body = await c.req.json()

  logTaskSuccess('Webhook', `Received callback from ${provider}`, body)

  try {
    // 根据 provider 分发处理
    if (provider === 'vidu') {
      await handleViduCallback(body)
    } else if (provider === 'volcengine') {
      await handleVolcengineCallback(body)
    } else if (provider === 'minimax') {
      await handleMinimaxCallback(body)
    }
  } catch (e) {
    logTaskError('Webhook', `Error handling ${provider} callback`, { error: (e as Error).message })
  }

  return ok(c, { received: true })
})

async function handleViduCallback(body: Record<string, unknown>) {
  const { task_id, state, video_url, error } = body as {
    task_id: string
    state: string
    video_url?: string
    error?: string
  }

  const record = db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.taskId, task_id))
    .get()
  if (!record) return

  if (state === 'success' && video_url) {
    db.update(schema.videoGenerations).set({
      videoUrl: video_url as string,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.videoGenerations.id, record.id)).run()

    if (record.storyboardId) {
      db.update(schema.storyboards).set({
        videoUrl: video_url as string,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.storyboards.id, record.storyboardId)).run()
    }
  } else if (state === 'failed') {
    db.update(schema.videoGenerations).set({
      status: 'failed',
      errorMsg: error ?? 'Unknown error',
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.videoGenerations.id, record.id)).run()
  }
}

async function handleVolcengineCallback(body: Record<string, unknown>) {
  // 火山引擎回调处理（结构参照官方文档，后续填充）
  logTaskSuccess('Webhook', 'Volcengine callback', body)
}

async function handleMinimaxCallback(body: Record<string, unknown>) {
  // MiniMax 回调处理（后续填充）
  logTaskSuccess('Webhook', 'MiniMax callback', body)
}

export default router
