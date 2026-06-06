# Storyboard Breaker — 剧本分镜拆解

## 核心任务

将格式化的短剧剧本拆解为详细的分镜序列，每个分镜都应包含完整的镜头语言描述和生成提示词。

## 分镜设计原则

### 镜头数量
- 每集控制在 **6-12 个镜头**
- 情绪密集段落用更多镜头，过渡段落压缩

### 景别（shot_type）
- `extreme_close`：极特写（眼睛、手部细节）
- `close`：近景（肩部以上）
- `medium`：中景（腰部以上）
- `full`：全景（全身）
- `long`：远景（人物在环境中）

### 机位（angle）
- `eye`：平视（正常视角）
- `low`：仰视（强调力量/崇高）
- `high`：俯视（渺小/俯瞰）
- `bird`：鸟瞰（上帝视角）
- `worm`：极低角（戏剧性）

### 运动（movement）
- `static`：固定镜头
- `pan`：水平摇镜
- `tilt`：垂直摇镜
- `dolly`：推拉移动
- `zoom`：变焦
- `handheld`：手持晃动（情绪不稳定时）

## 提示词写作规范

### imagePrompt（静态画面，适合图片生成）
格式：`[主体描述], [环境/背景], [光线], [构图], [风格], [色调]`
示例：`a middle-aged woman standing in a small kitchen, warm afternoon light through window, medium shot, cinematic, warm amber tones, film photography style`

### videoPrompt（动态视频，适合视频生成）
格式：`[摄影机运动描述], [主体动作], [时间/速度描述]`
示例：`slow dolly push in on the woman's hands washing dishes, gentle steam rising, 5 seconds, emotional, quiet`

## 声音元素

- `dialogue`：写出角色实际说的台词
- `narration`：旁白/独白文字（无需说明"旁白"前缀，直接写内容）
- `bgmNote`：背景音乐情绪描述（轻柔钢琴/老旧磁带质感/无声等）
- `soundEffect`：特定音效（雨声/锅铲声/门铃等）
