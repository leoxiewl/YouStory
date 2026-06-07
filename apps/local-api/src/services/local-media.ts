import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getAssetPath, getAssetUrl } from '../utils/storage.js'

type MediaStoryboard = {
  id: number
  orderIndex: number
  duration: number | null
  dialogue: string | null
  narration: string | null
  imagePrompt: string | null
  videoPrompt: string | null
  imageUrl: string | null
  videoUrl: string | null
  ttsAudioUrl: string | null
  composedVideoUrl: string | null
}

const FFMPEG_BIN = process.env.FFMPEG_PATH ?? 'ffmpeg'
const VIDEO_WIDTH = 1280
const VIDEO_HEIGHT = 720

export async function generatePlaceholderImage(kind: string, id: number, title: string, body: string) {
  const filename = `${kind}-${id}-${Date.now()}.png`
  const filePath = getAssetPath('images', filename)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  const svg = createImageSvg(title, body)
  await sharp(Buffer.from(svg)).png().toFile(filePath)

  return {
    localPath: filePath,
    url: getAssetUrl('images', filename),
  }
}

export async function generateSilentAudio(storyboard: MediaStoryboard) {
  const duration = normalizeDuration(storyboard.duration)
  const filename = `storyboard-${storyboard.id}-${Date.now()}.m4a`
  const filePath = getAssetPath('audio', filename)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', String(duration),
    '-c:a', 'aac',
    '-b:a', '128k',
    filePath,
  ])

  return {
    localPath: filePath,
    url: getAssetUrl('audio', filename),
  }
}

export async function generateStoryboardVideo(storyboard: MediaStoryboard) {
  const duration = normalizeDuration(storyboard.duration)
  const sourceImage = storyboard.imageUrl
    ? assetUrlToPath(storyboard.imageUrl)
    : (await generatePlaceholderImage(
        'storyboard',
        storyboard.id,
        `Shot ${storyboard.orderIndex + 1}`,
        storyboard.imagePrompt ?? storyboard.videoPrompt ?? storyboard.dialogue ?? 'YouStorys storyboard',
      )).localPath

  const filename = `storyboard-${storyboard.id}-${Date.now()}.mp4`
  const filePath = getAssetPath('videos', filename)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', sourceImage,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', String(duration),
    '-vf', `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    filePath,
  ])

  return {
    localPath: filePath,
    url: getAssetUrl('videos', filename),
  }
}

export async function composeStoryboardVideo(storyboard: MediaStoryboard) {
  if (!storyboard.videoUrl) {
    throw new Error('No video URL for this storyboard')
  }

  const videoPath = assetUrlToPath(storyboard.videoUrl)
  const audioPath = storyboard.ttsAudioUrl ? assetUrlToPath(storyboard.ttsAudioUrl) : null
  const filename = `composed-storyboard-${storyboard.id}-${Date.now()}.mp4`
  const filePath = getAssetPath('videos', filename)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  if (audioPath && fs.existsSync(audioPath)) {
    await runFfmpeg([
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      filePath,
    ])
  } else {
    await runFfmpeg([
      '-y',
      '-i', videoPath,
      '-c', 'copy',
      filePath,
    ])
  }

  return {
    localPath: filePath,
    url: getAssetUrl('videos', filename),
  }
}

export async function mergeEpisodeVideos(episodeId: number, storyboards: MediaStoryboard[]) {
  const clips = storyboards
    .map((storyboard) => storyboard.composedVideoUrl ?? storyboard.videoUrl)
    .filter((url): url is string => Boolean(url))

  if (clips.length === 0) {
    throw new Error('No composed or generated storyboard videos to merge')
  }

  const filename = `episode-${episodeId}-${Date.now()}.mp4`
  const filePath = getAssetPath('exports', filename)
  const listPath = getAssetPath('exports', `episode-${episodeId}-${Date.now()}.txt`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  fs.writeFileSync(
    listPath,
    clips.map((url) => `file '${assetUrlToPath(url).replace(/'/g, "'\\''")}'`).join('\n'),
  )

  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    filePath,
  ])

  return {
    localPath: filePath,
    url: getAssetUrl('exports', filename),
  }
}

export function assetUrlToPath(url: string) {
  if (!url.startsWith('/static/')) {
    throw new Error(`Unsupported local asset URL: ${url}`)
  }

  const [type, ...rest] = url.replace('/static/', '').split('/')
  if (!isAssetType(type)) {
    throw new Error(`Unsupported local asset type: ${type}`)
  }

  return getAssetPath(type, rest.join('/'))
}

function normalizeDuration(value: number | null | undefined) {
  if (Number.isFinite(value) && value && value > 0) {
    return Math.min(30, Math.max(1, Math.round(value)))
  }

  return 4
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1200)}`))
      }
    })
  })
}

function createImageSvg(title: string, body: string) {
  const titleLines = wrapSvgText(title || 'YouStorys', 22).slice(0, 2)
  const bodyLines = wrapSvgText(body || 'Local placeholder media', 36).slice(0, 6)

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}">
      <rect width="1280" height="720" fill="#111827"/>
      <rect x="60" y="58" width="1160" height="604" rx="28" fill="#f8fafc"/>
      <rect x="92" y="92" width="1096" height="540" rx="20" fill="#e8eef5"/>
      <circle cx="1010" cy="202" r="108" fill="#0f6bff" opacity="0.18"/>
      <circle cx="286" cy="498" r="150" fill="#14b885" opacity="0.16"/>
      <rect x="142" y="142" width="996" height="436" rx="22" fill="#ffffff" opacity="0.72"/>
      <text x="180" y="218" fill="#0f172a" font-family="Arial, sans-serif" font-size="46" font-weight="700">
        ${titleLines.map((line, index) => `<tspan x="180" dy="${index === 0 ? 0 : 58}">${escapeSvg(line)}</tspan>`).join('')}
      </text>
      <text x="184" y="${272 + titleLines.length * 58}" fill="#334155" font-family="Arial, sans-serif" font-size="28">
        ${bodyLines.map((line, index) => `<tspan x="184" dy="${index === 0 ? 0 : 40}">${escapeSvg(line)}</tspan>`).join('')}
      </text>
      <text x="184" y="604" fill="#64748b" font-family="Arial, sans-serif" font-size="22">Generated locally by YouStorys</text>
    </svg>
  `
}

function wrapSvgText(value: string, maxChars: number) {
  const text = value.replace(/\s+/g, ' ').trim()
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += maxChars) {
    chunks.push(text.slice(index, index + maxChars))
  }
  return chunks.length ? chunks : ['']
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isAssetType(value: string): value is 'images' | 'videos' | 'audio' | 'exports' {
  return value === 'images' || value === 'videos' || value === 'audio' || value === 'exports'
}
