import type { MiddlewareHandler } from 'hono'
import { logTaskError, logTaskSuccess } from '../utils/task-logger.js'

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const { method, url } = c.req.raw

  await next()

  const ms = Date.now() - start
  const status = c.res.status

  if (status >= 400) {
    logTaskError('HTTP', `${method} ${url} → ${status} (${ms}ms)`)
  } else {
    logTaskSuccess('HTTP', `${method} ${url} → ${status} (${ms}ms)`)
  }
}

export const errorHandler = (err: Error, c: Parameters<MiddlewareHandler>[0]) => {
  logTaskError('Error', err.message, { stack: err.stack })
  return c.json({ code: 500, message: err.message }, 500)
}
