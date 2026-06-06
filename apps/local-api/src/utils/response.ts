import type { Context } from 'hono'

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ code: status, data }, status as 200)
}

export function err(c: Context, message: string, status = 500) {
  return c.json({ code: status, message }, status as 500)
}

export function notFound(c: Context, message = 'Not found') {
  return c.json({ code: 404, message }, 404)
}

export function badRequest(c: Context, message: string) {
  return c.json({ code: 400, message }, 400)
}
