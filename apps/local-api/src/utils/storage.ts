import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = path.join(__dirname, '../../../../data/static')

type AssetType = 'images' | 'videos' | 'audio' | 'exports'

export function getAssetPath(type: AssetType, filename: string): string {
  return path.join(ASSETS_DIR, type, filename)
}

export function getAssetUrl(type: AssetType, filename: string): string {
  return `/static/${type}/${filename}`
}

export async function saveAssetFromUrl(url: string, type: AssetType, filename: string): Promise<string> {
  const dir = path.join(ASSETS_DIR, type)
  fs.mkdirSync(dir, { recursive: true })

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${url}`)

  const buffer = await res.arrayBuffer()
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, Buffer.from(buffer))

  return filePath
}

export function saveAssetFromBuffer(buffer: Buffer, type: AssetType, filename: string): string {
  const dir = path.join(ASSETS_DIR, type)
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export function assetExists(type: AssetType, filename: string): boolean {
  return fs.existsSync(path.join(ASSETS_DIR, type, filename))
}

export function getAssetsDir(type: AssetType): string {
  const dir = path.join(ASSETS_DIR, type)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
