import type { RecordEntry, StoryProject } from "./types"
import { createStoryEpisode } from "./workflow"

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
    summary: "一个人在傍晚车站告别家人，走向新生活的第一季。",
    seriesTheme: "离家、成长与第一次独自面对世界",
    targetEpisodeCount: 3,
    episodes: [
      createStoryEpisode({
        projectId: "project-boarding-school",
        episodeNumber: 1,
        title: "检票口",
        summary: "傍晚车站里，孩子拖着箱子准备离开家，母亲反复叮嘱路上小心。",
        keywords: ["车站", "离家", "母亲", "沉默"],
        emotionalTone: "克制、酸涩、真实",
        scriptDraft:
          "傍晚的车站广播声不断响起。母亲站在检票口外，反复说着路上小心。孩子点头，手握着行李箱拉杆，却不敢回头看。",
        payoffMoments: ["不敢回头的一瞬间", "母亲仍站在原地", "广播声盖过了告别"],
        plotBranches: ["真实克制版", "强化母子对话版", "加入多年后回望的旁白版"],
      }),
      createStoryEpisode({
        projectId: "project-boarding-school",
        episodeNumber: 2,
        title: "新宿舍的灯",
        summary: "第一次住进陌生宿舍，夜里灯光很白，所有人都装作已经适应。",
        keywords: ["宿舍", "陌生", "夜晚", "适应"],
        emotionalTone: "安静、孤独、微弱期待",
        scriptDraft:
          "宿舍的白灯亮到很晚。大家一边整理床铺，一边小心翼翼地聊天。主角把家里带来的小物件放在枕边，终于意识到今晚不会有人来关灯。",
        payoffMoments: ["枕边的小物件", "无人关灯的夜晚", "第一次承认自己已经离家"],
        plotBranches: ["孤独内心版", "室友破冰版", "深夜给家里打电话版"],
      }),
      createStoryEpisode({
        projectId: "project-boarding-school",
        episodeNumber: 3,
        title: "周末电话",
        summary: "第一次周末打电话回家，说一切都好，却在挂断后沉默很久。",
        keywords: ["电话", "周末", "报平安", "成长"],
        emotionalTone: "温柔、隐忍、成长感",
        scriptDraft:
          "周末傍晚，主角站在走廊尽头给家里打电话。电话里说饭菜还行、同学很好、自己一点也不想家。挂断以后，走廊忽然安静下来。",
        payoffMoments: ["一句“一切都好”", "挂断后的安静", "第一次把想家藏起来"],
        plotBranches: ["温柔写实版", "旁白独白版", "以母亲视角收尾版"],
      }),
    ],
    status: "draft",
    createdAt: "2026-05-26T19:35:00.000Z",
  },
  {
    id: "project-rain-walk",
    title: "雨里的便利店",
    sourceRecordId: "record-rain-walk",
    summary: "两个朋友在雨夜便利店里意识到青春正在结束。",
    seriesTheme: "雨夜、朋友和青春结束前的沉默",
    targetEpisodeCount: 1,
    episodes: [
      createStoryEpisode({
        projectId: "project-rain-walk",
        episodeNumber: 1,
        title: "雨里的便利店",
        summary: "两个朋友躲进雨夜便利店，在窗边说起以后可能很少见面。",
        keywords: ["雨夜", "便利店", "朋友", "告别"],
        emotionalTone: "怀旧、安静、电影感",
        scriptDraft:
          "雨突然下大，两个人冲进便利店。窗外车灯拖成长长的影子。朋友说以后可能很少这样见面了，主角没有立刻接话，只看着玻璃上的雨水往下滑。",
        payoffMoments: ["车灯拖成长影", "朋友说以后很少见面", "沉默比回答更重"],
        plotBranches: ["青春告别版", "重逢倒叙版", "轻喜剧开场后转安静版"],
      }),
    ],
    status: "draft",
    createdAt: "2026-05-28T22:16:00.000Z",
  },
  {
    id: "project-family-dinner",
    title: "老房子的晚饭",
    sourceRecordId: "record-family-dinner",
    summary: "一次普通晚饭，被记忆里的灯光和家人的声音保存下来。",
    seriesTheme: "家人、老房子和被灯光保存的日常",
    targetEpisodeCount: 1,
    episodes: [
      createStoryEpisode({
        projectId: "project-family-dinner",
        episodeNumber: 1,
        title: "老房子的晚饭",
        summary: "外婆端菜上桌，电视新闻在响，厨房灯让普通晚饭变得很暖。",
        keywords: ["外婆", "晚饭", "老房子", "灯光"],
        emotionalTone: "温暖、日常、怀念",
        scriptDraft:
          "外婆把最后一道菜端上桌，电视里还在放新闻。厨房灯有点暗，热气从碗沿升起来。主角低头夹菜，忽然觉得这一刻应该被记住。",
        payoffMoments: ["外婆端菜上桌", "电视新闻的背景声", "突然想记住这一刻"],
        plotBranches: ["日常怀念版", "多年后回忆版", "以一道菜串起家族记忆版"],
      }),
    ],
    status: "draft",
    createdAt: "2026-05-31T18:12:00.000Z",
  },
]
