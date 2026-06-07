import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { requestLogger } from './middleware/logger.js'
import { logTaskStart, logTaskSuccess } from './utils/task-logger.js'

import recordsRouter from './routes/records.js'
import projectsRouter from './routes/projects.js'
import episodesRouter from './routes/episodes.js'
import charactersRouter from './routes/characters.js'
import scenesRouter from './routes/scenes.js'
import storyboardsRouter from './routes/storyboards.js'
import agentRouter from './routes/agent.js'
import aiConfigsRouter from './routes/aiConfigs.js'
import composeRouter from './routes/compose.js'
import mergeRouter from './routes/merge.js'
import pipelineRouter from './routes/pipeline.js'
import webhooksRouter from './routes/webhooks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 5678)
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

const app = new Hono()

app.use('*', cors({
  origin: [FRONTEND_URL, 'http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', requestLogger)

// 静态资源服务（生成的图片/视频/音频）
app.use('/static/*', serveStatic({ root: path.join(__dirname, '../../../data') }))

// API 路由
app.route('/api/v1/records', recordsRouter)
app.route('/api/v1/projects', projectsRouter)
app.route('/api/v1/episodes', episodesRouter)
app.route('/api/v1/characters', charactersRouter)
app.route('/api/v1/scenes', scenesRouter)
app.route('/api/v1/storyboards', storyboardsRouter)
app.route('/api/v1/agent', agentRouter)
app.route('/api/v1/ai-configs', aiConfigsRouter)
app.route('/api/v1/compose', composeRouter)
app.route('/api/v1/merge', mergeRouter)
app.route('/api/v1/pipeline', pipelineRouter)
app.route('/webhooks', webhooksRouter)

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))

logTaskStart('Server', `Starting YouStorys Local API on port ${PORT}`)

serve({ fetch: app.fetch, port: PORT }, () => {
  logTaskSuccess('Server', `YouStorys Local API running at http://localhost:${PORT}`)
})
