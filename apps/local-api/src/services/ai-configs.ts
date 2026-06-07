import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type AiServiceType = 'text' | 'image' | 'video' | 'tts'

export function getDefaultAiConfig(serviceType: AiServiceType) {
  return db.select().from(schema.aiConfigs)
    .where(and(
      eq(schema.aiConfigs.serviceType, serviceType),
      eq(schema.aiConfigs.isDefault, true),
      eq(schema.aiConfigs.isActive, true),
    ))
    .get()
}

export function getFirstActiveAiConfig(serviceType: AiServiceType) {
  return db.select().from(schema.aiConfigs)
    .where(and(
      eq(schema.aiConfigs.serviceType, serviceType),
      eq(schema.aiConfigs.isActive, true),
    ))
    .get()
}

export function getRuntimeAiConfig(serviceType: AiServiceType) {
  return getDefaultAiConfig(serviceType) ?? getFirstActiveAiConfig(serviceType)
}

export function clearDefaultAiConfig(serviceType: string) {
  db.update(schema.aiConfigs).set({
    isDefault: false,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.aiConfigs.serviceType, serviceType)).run()
}

export function maskAiConfig<T extends { apiKey: string | null }>(config: T) {
  return {
    ...config,
    apiKey: config.apiKey ? maskSecret(config.apiKey) : null,
    hasApiKey: Boolean(config.apiKey),
  }
}

function maskSecret(value: string) {
  if (value.length <= 8) return '********'
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}
