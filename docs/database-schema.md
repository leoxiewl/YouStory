# YouStorys 数据库表设计

本文档说明 YouStorys 当前本地数据库的表结构、字段设计和表之间的关系。

数据库文件默认位于：

`/Users/leo/Documents/Wiki/Project/YouStorys/data/youstorys.sqlite`

Schema 源码位于：

[schema.ts](/Users/leo/Documents/Wiki/Project/YouStorys/apps/local-api/src/db/schema.ts)

## 设计概览

当前数据库以 SQLite 为底座，按业务大致分成 5 类数据：

1. 内容源数据：`records`
2. 项目与剧集数据：`projects`、`episodes`
3. 生产素材数据：`characters`、`scenes`、`storyboards`
4. 生成任务数据：`image_generations`、`video_generations`、`video_merges`
5. 运行配置数据：`ai_configs`、`ai_voices`、`agent_configs`

整体关系可以概括为：

- 一条 `record` 可以衍生一个或多个 `project`
- 一个 `project` 下可以有多个 `episode`
- 角色 `character` 和场景 `scene` 以 `project` 为复用单位
- 单集通过中间表关联本集涉及的角色和场景
- 一个 `episode` 下有多条 `storyboard`
- 分镜可进一步产生图片、视频、配音和整集合成记录

## 表结构

### `records`

用途：保存原始记录、日记、回忆、旅行片段等故事素材。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `title` | text | 记录标题 |
| `body` | text | 记录正文 |
| `category` | text | 分类，默认 `diary` |
| `created_at` | text | 创建时间，ISO 字符串 |
| `updated_at` | text | 更新时间，ISO 字符串 |

说明：

- 这是内容入口表。
- 前端“保存记录”会直接写入这里。

### `projects`

用途：保存一个短剧主题项目，不直接代表具体某一集。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `title` | text | 项目标题 |
| `summary` | text nullable | 项目摘要 |
| `series_theme` | text nullable | 剧集主题 |
| `status` | text | 状态，默认 `draft` |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- 当前设计里，`project` 表示一个主题容器。
- 点击“开始故事”后，应该先只创建 `project`，不自动创建 `episode`。

### `episodes`

用途：保存项目下的单集数据，是后续剧本、分镜、素材生成的核心单位。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `project_id` | integer FK | 所属项目，关联 `projects.id` |
| `episode_number` | integer | 集数序号 |
| `title` | text | 单集标题 |
| `summary` | text nullable | 单集摘要 |
| `raw_content` | text nullable | 原始内容 |
| `script_content` | text nullable | AI 改写后的剧本 |
| `image_config_id` | integer FK nullable | 图片模型配置，关联 `ai_configs.id` |
| `video_config_id` | integer FK nullable | 视频模型配置，关联 `ai_configs.id` |
| `audio_config_id` | integer FK nullable | 音频模型配置，关联 `ai_configs.id` |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- `raw_content` 保存原文或小说素材。
- `script_content` 保存改写后的剧本。
- 三个 `*_config_id` 用来记录这集在生产时使用的模型配置。

### `characters`

用途：保存角色资产，按 `project` 维度复用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `project_id` | integer FK | 所属项目 |
| `name` | text | 角色名 |
| `role` | text nullable | 角色类型，如主角/配角 |
| `description` | text nullable | 角色描述 |
| `appearance` | text nullable | 外貌描述 |
| `personality` | text nullable | 性格描述 |
| `voice_provider` | text nullable | 语音供应商 |
| `voice_id` | text nullable | 语音 ID |
| `image_url` | text nullable | 角色图 URL |
| `image_prompt` | text nullable | 角色图提示词 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- 角色并不直接属于某一集，而是属于某个项目。
- 某一集用到哪些角色，通过中间表 `episode_characters` 维护。

### `episode_characters`

用途：维护单集与角色的多对多关系。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `episode_id` | integer FK | 关联 `episodes.id` |
| `character_id` | integer FK | 关联 `characters.id` |

说明：

- 一集可以有多个角色。
- 一个角色可以跨多集复用。

### `scenes`

用途：保存场景资产，按 `project` 维度复用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `project_id` | integer FK | 所属项目 |
| `name` | text | 场景名 |
| `description` | text nullable | 场景描述 |
| `atmosphere` | text nullable | 场景氛围描述 |
| `image_url` | text nullable | 场景图 URL |
| `image_prompt` | text nullable | 场景图提示词 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- 和角色一样，场景以项目为复用单位。

### `episode_scenes`

用途：维护单集与场景的多对多关系。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `episode_id` | integer FK | 关联 `episodes.id` |
| `scene_id` | integer FK | 关联 `scenes.id` |

### `storyboards`

用途：保存单集分镜，是实际生产链路最核心的执行表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `episode_id` | integer FK | 所属单集 |
| `order_index` | integer | 分镜顺序 |
| `shot_type` | text nullable | 景别 |
| `angle` | text nullable | 机位 |
| `movement` | text nullable | 运镜方式 |
| `duration` | real nullable | 时长，单位秒 |
| `dialogue` | text nullable | 对白 |
| `narration` | text nullable | 旁白 |
| `bgm_note` | text nullable | 背景音乐说明 |
| `sound_effect` | text nullable | 音效说明 |
| `image_prompt` | text nullable | 图片提示词 |
| `video_prompt` | text nullable | 视频提示词 |
| `image_url` | text nullable | 分镜图 URL |
| `video_url` | text nullable | 分镜视频 URL |
| `tts_audio_url` | text nullable | 配音 URL |
| `composed_video_url` | text nullable | 单镜头合成后视频 URL |
| `status` | text | 状态，默认 `pending` |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- `storyboards` 承接了文本拆解之后的大部分生产流程。
- 一条分镜后面可能有首图、视频、配音、合成视频。

### `image_generations`

用途：记录图片生成任务，无论目标是角色、场景还是分镜。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `storyboard_id` | integer FK nullable | 分镜图任务 |
| `character_id` | integer FK nullable | 角色图任务 |
| `scene_id` | integer FK nullable | 场景图任务 |
| `provider` | text | 模型供应商 |
| `model` | text nullable | 模型名 |
| `prompt` | text | 使用的提示词 |
| `task_id` | text nullable | 异步任务 ID |
| `status` | text | 任务状态 |
| `image_url` | text nullable | 输出图片 URL |
| `local_path` | text nullable | 本地文件路径 |
| `error_msg` | text nullable | 错误信息 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- 三个目标外键是互斥语义，不是同时使用。
- 当前既支持真实任务记录，也支持本地占位图链路。

### `video_generations`

用途：记录分镜视频生成任务。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `storyboard_id` | integer FK nullable | 所属分镜 |
| `provider` | text | 供应商 |
| `model` | text nullable | 模型名 |
| `prompt` | text | 提示词 |
| `duration` | real nullable | 时长 |
| `task_id` | text nullable | 异步任务 ID |
| `status` | text | 状态 |
| `video_url` | text nullable | 输出视频 URL |
| `local_path` | text nullable | 本地文件路径 |
| `error_msg` | text nullable | 错误信息 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

### `video_merges`

用途：记录整集视频拼接导出任务。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `episode_id` | integer FK | 所属单集 |
| `status` | text | 状态 |
| `merged_url` | text nullable | 合成后整集视频 URL |
| `local_path` | text nullable | 本地文件路径 |
| `error_msg` | text nullable | 错误信息 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

### `ai_configs`

用途：保存文本、图片、视频、TTS 等模型服务配置。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `service_type` | text | `text` / `image` / `video` / `tts` |
| `provider` | text | 供应商名 |
| `name` | text | 配置名称 |
| `base_url` | text nullable | API Base URL |
| `api_key` | text nullable | API Key |
| `model` | text nullable | 模型名 |
| `extra_params` | text nullable | 额外 JSON 参数 |
| `is_default` | boolean | 是否默认配置 |
| `is_active` | boolean | 是否启用 |
| `created_at` | text | 创建时间 |
| `updated_at` | text | 更新时间 |

说明：

- 这是模型配置中心。
- 当前前端“API 配置”页就是维护这张表。
- 列表接口对 `api_key` 做脱敏返回，但数据库内仍是原值。

### `ai_voices`

用途：保存可选语音库元数据。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `provider` | text | 供应商 |
| `voice_id` | text | 语音 ID |
| `name` | text | 语音名称 |
| `gender` | text nullable | 性别 |
| `style` | text nullable | 风格描述 |
| `preview_url` | text nullable | 试听地址 |
| `created_at` | text | 创建时间 |

### `agent_configs`

用途：保存各类 Agent 的运行覆盖配置。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer PK | 主键，自增 |
| `agent_type` | text unique | Agent 类型 |
| `custom_instructions` | text nullable | 自定义指令 |
| `model_override` | text nullable | 模型覆盖 |
| `updated_at` | text | 更新时间 |

说明：

- 当前主要用于 `story_adapter`、`world_builder`、`storyboard_breaker` 等 Agent 的动态配置。

## 表关系

核心外键关系如下：

- `episodes.project_id -> projects.id`
- `characters.project_id -> projects.id`
- `scenes.project_id -> projects.id`
- `episode_characters.episode_id -> episodes.id`
- `episode_characters.character_id -> characters.id`
- `episode_scenes.episode_id -> episodes.id`
- `episode_scenes.scene_id -> scenes.id`
- `storyboards.episode_id -> episodes.id`
- `image_generations.storyboard_id -> storyboards.id`
- `image_generations.character_id -> characters.id`
- `image_generations.scene_id -> scenes.id`
- `video_generations.storyboard_id -> storyboards.id`
- `video_merges.episode_id -> episodes.id`
- `episodes.image_config_id -> ai_configs.id`
- `episodes.video_config_id -> ai_configs.id`
- `episodes.audio_config_id -> ai_configs.id`

## 典型业务流转

### 1. 从记录到项目

1. 用户保存记录，写入 `records`
2. 用户点击“开始故事”，写入 `projects`
3. 用户手动添加剧集，写入 `episodes`

### 2. 从剧本到分镜

1. 原始文本进入 `episodes.raw_content`
2. Agent 改写后写入 `episodes.script_content`
3. 角色提取写入 `characters`，并通过 `episode_characters` 关联
4. 场景提取写入 `scenes`，并通过 `episode_scenes` 关联
5. 分镜拆解写入 `storyboards`

### 3. 从分镜到成片

1. 图片生成写入 `image_generations`
2. 视频生成写入 `video_generations`
3. 分镜表中的 `image_url`、`video_url`、`tts_audio_url`、`composed_video_url` 持续更新
4. 整集导出写入 `video_merges`

## 当前设计特点

### 优点

- 项目、剧集、角色、场景、分镜层次清楚
- 角色和场景按项目复用，避免跨集重复创建
- 模型配置独立成表，方便前端配置和运行时切换
- 任务表与业务表分离，便于后续接入真实异步生成服务

### 当前限制

- `records` 和 `projects` 之间没有显式外键，前端目前是运行时推导关系
- 中间表 `episode_characters`、`episode_scenes` 没有独立主键和额外元数据
- `ai_configs.api_key` 目前是本地数据库明文存储
- 部分前端 workflow 状态没有完整落库，仍有运行时派生逻辑

如果后续要继续演进，优先建议补两件事：

1. 给 `projects` 增加 `source_record_id`
2. 明确哪些 workflow / production 状态要正式持久化到数据库
