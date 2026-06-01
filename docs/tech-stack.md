# YouStory 技术栈规划

YouStory 采用双运行模式：Vercel 上提供轻量云端展示能力，本地运行提供完整创作能力。这个边界可以让项目快速公开演示，同时避免把视频生成、视频存储和本地媒体处理强行塞进 Serverless 环境。

## 运行模式

| 模式 | 部署位置 | 支持能力 | 存储策略 |
| --- | --- | --- | --- |
| Cloud Demo | Vercel | 文字生成、故事拆分、图片场景生成、图片保存与展示 | Neon Postgres + Vercel Blob images only |
| Local Full | 用户本地 | 文字、图片、视频、音频的完整生成与管理 | SQLite + local filesystem + FFmpeg |

Cloud Demo 不承担视频文件存储和视频生成任务。视频相关能力仅在 Local Full 模式中开放。

## 前端

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react

前端以 Next.js 为统一入口，既可以部署到 Vercel，也可以连接本地后端运行完整功能。UI 以创作工作台为核心，重点支持故事输入、场景拆分、图片预览、素材管理和本地导出流程。

## 后端

- Node.js 20+
- TypeScript
- Hono

后端采用轻量 TypeScript 服务，优先服务本地完整能力。云端轻量 API 可以由 Next.js Route Handlers 或 Server Actions 承担，本地完整 API 由 Hono 承担。

## 数据与文件存储

### Cloud

- Neon Postgres：存储故事、场景、提示词、生成状态、图片元数据。
- Vercel Blob：只存储图片文件。
- 不存储视频文件。
- 不执行视频生成任务。

### Local

- SQLite：存储故事、场景、提示词、任务状态、资产索引和生成配置。
- local filesystem：存储图片、视频、音频、参考图和导出文件。
- FFmpeg：处理视频合成、转码、字幕、音频混合和导出。

建议本地数据目录：

```text
.data/
  youstory.sqlite
  assets/
    images/
    videos/
    audio/
    references/
  exports/
```

## AI 服务适配

AI 能力通过适配器封装，避免业务代码绑定具体模型供应商。

| 能力 | 适配目标 |
| --- | --- |
| 文字 | 故事拆分、场景描述、提示词扩写、字幕与旁白生成 |
| 图片 | 场景图生成、人物参考图辅助、风格化图片生成 |
| 视频 | 本地视频生成、图生视频、视频片段处理 |
| 音频 | 旁白生成、背景音乐、音频混合 |

建议抽象接口：

```text
TextGenerationProvider
ImageGenerationProvider
VideoGenerationProvider
AudioGenerationProvider
AssetStore
```

Cloud 模式可以只启用文字和图片适配器；Local 模式启用全部适配器。

## 建议项目结构

```text
apps/
  web/                 # Next.js 前端与云端轻量 API
  local-api/           # Node.js + Hono 本地后端

packages/
  core/                # 共享类型、业务模型、运行模式判断
  db/                  # Drizzle schema、迁移和数据访问
  storage/             # Vercel Blob 与本地文件系统适配
  ai/                  # 文字、图片、视频、音频服务适配
  media/               # FFmpeg 与本地媒体处理
```

## 推荐依赖方向

- Drizzle ORM：统一管理 SQLite 与 Postgres schema。
- Zod：请求参数、AI 响应和配置校验。
- react-hook-form：创作表单和生成配置表单。
- FFmpeg：本地视频与音频处理。

## 功能边界

Cloud Demo:

- 支持输入故事片段。
- 支持拆分图片场景。
- 支持保存文字、图片和图片元数据。
- 支持公开展示生成结果。
- 不支持视频生成和视频存储。

Local Full:

- 支持 Cloud Demo 的全部能力。
- 支持本地图片、视频、音频文件存储。
- 支持 FFmpeg 视频合成与导出。
- 支持完整素材管理和本地项目归档。
