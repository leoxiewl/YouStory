const RESET = '\x1b[0m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const GRAY = '\x1b[90m'

function timestamp() {
  return new Date().toTimeString().slice(0, 8)
}

export function logTaskStart(tag: string, action: string, meta?: Record<string, unknown>) {
  console.log(`${CYAN}[${timestamp()}] ▶ ${tag}${RESET} ${action}`, meta ? GRAY + JSON.stringify(meta) + RESET : '')
}

export function logTaskProgress(tag: string, msg: string, meta?: Record<string, unknown>) {
  console.log(`${BLUE}[${timestamp()}] ◌ ${tag}${RESET} ${msg}`, meta ? GRAY + JSON.stringify(meta) + RESET : '')
}

export function logTaskSuccess(tag: string, msg: string, meta?: Record<string, unknown>) {
  console.log(`${GREEN}[${timestamp()}] ✓ ${tag}${RESET} ${msg}`, meta ? GRAY + JSON.stringify(meta) + RESET : '')
}

export function logTaskWarn(tag: string, msg: string, meta?: Record<string, unknown>) {
  console.log(`${YELLOW}[${timestamp()}] ⚠ ${tag}${RESET} ${msg}`, meta ? GRAY + JSON.stringify(meta) + RESET : '')
}

export function logTaskError(tag: string, action: string, meta?: Record<string, unknown>) {
  console.error(`${RED}[${timestamp()}] ✗ ${tag}${RESET} ${action}`, meta ? GRAY + JSON.stringify(meta) + RESET : '')
}
