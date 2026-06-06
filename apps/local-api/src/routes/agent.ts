import { Hono } from 'hono'
import { createAgent } from '../agents/index.js'
import { ok, err, badRequest } from '../utils/response.js'
import { logTaskStart, logTaskSuccess, logTaskError } from '../utils/task-logger.js'

const router = new Hono()

router.post('/:type/chat', async (c) => {
  const type = c.req.param('type')

  let body: { message: string; project_id: number; episode_id: number }
  try {
    body = await c.req.json()
  } catch {
    return badRequest(c, 'Invalid JSON body')
  }

  const { message, project_id: projectId, episode_id: episodeId } = body

  if (!message || !projectId || !episodeId) {
    return badRequest(c, 'message, project_id, episode_id are required')
  }

  const agent = createAgent(type, episodeId, projectId)
  if (!agent) {
    return badRequest(c, `Unknown agent type: ${type}. Supported: story_adapter, world_builder, storyboard_breaker, voice_caster, visual_director`)
  }

  logTaskStart('Agent', `Running ${type}`, { episodeId, projectId })

  try {
    const result = await agent.generate(
      [{ role: 'user', content: message }],
      { maxSteps: 20 }
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawToolCalls: any[] = (result as any).toolCalls ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawToolResults: any[] = (result as any).toolResults ?? []

    const toolCalls = rawToolCalls.map((tc) => ({
      toolName: tc?.toolName ?? tc?.name ?? '',
      args: tc?.args ?? tc?.input ?? null,
    }))
    const toolResults = rawToolResults.map((tr) => ({
      toolName: tr?.toolName ?? tr?.name ?? '',
      result: tr?.result ?? tr?.output ?? null,
    }))

    logTaskSuccess('Agent', `${type} completed`, { toolCalls: toolCalls.length })

    return ok(c, {
      type: 'done',
      text: result.text ?? '',
      toolCalls,
      toolResults,
    })
  } catch (e) {
    logTaskError('Agent', `${type} failed`, { error: (e as Error).message })
    return err(c, (e as Error).message)
  }
})

// Agent 调试端点（返回配置信息，不执行）
router.get('/:type/debug', (c) => {
  const type = c.req.param('type')
  return ok(c, {
    type,
    supported: ['story_adapter', 'world_builder', 'storyboard_breaker', 'voice_caster', 'visual_director'],
  })
})

export default router
