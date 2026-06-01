export type RecordCategory = "日记" | "随感" | "回忆" | "旅行" | "家人" | "成长"

export type RecordEntry = {
  id: string
  title: string
  body: string
  category: RecordCategory
  createdAt: string
}

export type StoryProject = {
  id: string
  title: string
  sourceRecordId: string
  summary: string
  status: "draft"
  createdAt: string
}

export type ActiveView =
  | "new-record"
  | "record-list"
  | "record-detail"
  | "project-detail"
  | "search"
