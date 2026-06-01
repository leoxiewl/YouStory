import type { RecordEntry, StoryProject } from "./types"

export const sampleRecords: RecordEntry[] = [
  {
    id: "record-boarding-school",
    title: "第一次离家",
    body: "傍晚的车站很吵，我拎着箱子站在检票口。妈妈一直说路上小心，我点头，却不敢回头看她。",
    category: "回忆",
    createdAt: "2026-05-26T19:30:00.000Z",
  },
  {
    id: "record-rain-walk",
    title: "雨里的便利店",
    body: "那天雨下得突然，我们躲进便利店，窗外的车灯拖成很长的影子。朋友说以后可能很少这样见面了。",
    category: "随感",
    createdAt: "2026-05-28T22:10:00.000Z",
  },
  {
    id: "record-family-dinner",
    title: "老房子的晚饭",
    body: "外婆把菜端上桌时，电视里还在放新闻。厨房的灯有点暗，但那一刻我觉得整个屋子都很暖。",
    category: "家人",
    createdAt: "2026-05-31T18:05:00.000Z",
  },
]

export const sampleProjects: StoryProject[] = [
  {
    id: "project-boarding-school",
    title: "第一次离家",
    sourceRecordId: "record-boarding-school",
    summary: "一个人在傍晚车站告别家人，走向新生活的第一幕。",
    status: "draft",
    createdAt: "2026-05-26T19:35:00.000Z",
  },
  {
    id: "project-rain-walk",
    title: "雨里的便利店",
    sourceRecordId: "record-rain-walk",
    summary: "两个朋友在雨夜便利店里意识到青春正在结束。",
    status: "draft",
    createdAt: "2026-05-28T22:16:00.000Z",
  },
  {
    id: "project-family-dinner",
    title: "老房子的晚饭",
    sourceRecordId: "record-family-dinner",
    summary: "一次普通晚饭，被记忆里的灯光和家人的声音保存下来。",
    status: "draft",
    createdAt: "2026-05-31T18:12:00.000Z",
  },
]
