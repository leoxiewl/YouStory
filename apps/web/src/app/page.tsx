"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import {
  Archive,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  ImagePlus,
  List,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from "lucide-react"
import { EpisodeWorkflowView } from "./episode-workflow-view"
import { sampleProjects, sampleRecords } from "@/lib/sample-data"
import {
  PROJECTS_KEY,
  RECORDS_KEY,
  readCollection,
  writeProjects,
  writeRecords,
} from "@/lib/storage"
import {
  createStoryEpisode,
  normalizeStoryProject,
} from "@/lib/workflow"
import type {
  ActiveView,
  RecordCategory,
  RecordEntry,
  StoryEpisode,
  StoryProject,
} from "@/lib/types"

const categories: RecordCategory[] = ["日记", "随感", "回忆", "旅行", "家人", "成长"]

const categoryStyles: Record<RecordCategory, string> = {
  日记: "bg-story/10 text-story",
  随感: "bg-amber-100 text-amber-700",
  回忆: "bg-rose-100 text-rose-700",
  旅行: "bg-emerald-100 text-emerald-700",
  家人: "bg-orange-100 text-orange-700",
  成长: "bg-sky-100 text-sky-700",
}

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false)
  const [records, setRecords] = useState<RecordEntry[]>([])
  const [projects, setProjects] = useState<StoryProject[]>([])
  const [activeView, setActiveView] = useState<ActiveView>("new-record")
  const [selectedRecordId, setSelectedRecordId] = useState<string>()
  const [selectedProjectId, setSelectedProjectId] = useState<string>()
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>()
  const [draftBody, setDraftBody] = useState("")
  const [draftCategory, setDraftCategory] = useState<RecordCategory>("日记")
  const [searchTerm, setSearchTerm] = useState("")
  const [notice, setNotice] = useState("记录会先保存在本地。点击开始故事时，才会创建剧集项目。")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const hasRecords = window.localStorage.getItem(RECORDS_KEY)
    const hasProjects = window.localStorage.getItem(PROJECTS_KEY)
    const initialRecords = readCollection<RecordEntry>(
      RECORDS_KEY,
      hasRecords === null ? sampleRecords : [],
    )
    const initialProjects = readCollection<Partial<StoryProject>>(
      PROJECTS_KEY,
      hasProjects === null ? sampleProjects : [],
    ).map(normalizeStoryProject)

    setRecords(initialRecords)
    setProjects(initialProjects)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      writeRecords(records)
    }
  }, [hydrated, records])

  useEffect(() => {
    if (hydrated) {
      writeProjects(projects)
    }
  }, [hydrated, projects])

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [records],
  )

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [projects],
  )

  const selectedRecord = records.find((record) => record.id === selectedRecordId)
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const selectedEpisode = selectedProject?.episodes.find(
    (episode) => episode.id === selectedEpisodeId,
  )
  const selectedProjectRecord = selectedProject
    ? records.find((record) => record.id === selectedProject.sourceRecordId)
    : undefined
  const isWorkflowView = activeView === "episode-workflow"

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return { records: sortedRecords, projects: sortedProjects }
    }

    return {
      records: sortedRecords.filter((record) =>
        [record.title, record.body, record.category].some((item) =>
          item.toLowerCase().includes(normalizedSearch),
        ),
      ),
      projects: sortedProjects.filter((project) =>
        [
          project.title,
          project.summary,
          project.seriesTheme,
          ...project.episodes.flatMap((episode) => [
            episode.title,
            episode.summary,
            episode.keywords.join(" "),
          ]),
        ].some((item) => item.toLowerCase().includes(normalizedSearch)),
      ),
    }
  }, [normalizedSearch, sortedProjects, sortedRecords])

  function openNewRecord() {
    setActiveView("new-record")
    setSelectedRecordId(undefined)
    setSelectedProjectId(undefined)
    setSelectedEpisodeId(undefined)
    setSidebarOpen(false)
    setNotice("写下今天想留下的片段。保存记录不会创建项目。")
  }

  function openRecord(recordId: string) {
    setSelectedRecordId(recordId)
    setSelectedProjectId(undefined)
    setSelectedEpisodeId(undefined)
    setSidebarOpen(false)
    setActiveView("record-detail")
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId)
    setSelectedRecordId(undefined)
    setSelectedEpisodeId(undefined)
    setSidebarOpen(false)
    setActiveView("project-detail")
  }

  function openEpisode(projectId: string, episodeId: string) {
    setSelectedProjectId(projectId)
    setSelectedEpisodeId(episodeId)
    setSelectedRecordId(undefined)
    setSidebarOpen(false)
    setActiveView("episode-workflow")
  }

  function openRecordList() {
    setActiveView("record-list")
    setSelectedRecordId(undefined)
    setSelectedProjectId(undefined)
    setSelectedEpisodeId(undefined)
    setSidebarOpen(false)
  }

  function openSearch() {
    setActiveView("search")
    setSelectedRecordId(undefined)
    setSelectedProjectId(undefined)
    setSelectedEpisodeId(undefined)
    setSidebarOpen(false)
  }

  function saveDraftRecord() {
    const record = buildRecord(draftBody, draftCategory)
    if (!record) {
      setNotice("先写下一段记录，再保存。")
      return
    }

    setRecords((current) => [record, ...current])
    setDraftBody("")
    setSelectedRecordId(record.id)
    setActiveView("record-detail")
    setNotice("记录已保存。还没有创建项目。")
  }

  function startStoryFromDraft() {
    const record = buildRecord(draftBody, draftCategory)
    if (!record) {
      setNotice("先写下一段记录，再开始故事。")
      return
    }

    const project = buildProject(record)
    setRecords((current) => [record, ...current])
    setProjects((current) => [project, ...current])
    setDraftBody("")
    setSelectedProjectId(project.id)
    setActiveView("project-detail")
    setNotice("已从这条记录开始一个单集剧集项目。")
  }

  function startStoryFromRecord(record: RecordEntry) {
    const existingProject = sortedProjects.find((project) => project.sourceRecordId === record.id)

    if (existingProject) {
      setSelectedProjectId(existingProject.id)
      setActiveView("project-detail")
      setNotice("这条记录已经有一个故事项目，已为你打开。")
      return
    }

    const project = buildProject(record)
    setProjects((current) => [project, ...current])
    setSelectedProjectId(project.id)
    setActiveView("project-detail")
    setNotice("已从这条记录开始一个单集剧集项目。")
  }

  function addEpisodeToProject(projectId: string) {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) {
          return project
        }

        const episodeNumber = project.episodes.length + 1
        const episode = createStoryEpisode({
          projectId: project.id,
          episodeNumber,
          title: `第 ${episodeNumber} 集`,
          summary: `围绕「${project.title}」继续展开的新一集。`,
          keywords: deriveKeywords(project.seriesTheme || project.summary),
          emotionalTone: "待补充",
          scriptDraft: "",
        })

        return {
          ...project,
          targetEpisodeCount: Math.max(project.targetEpisodeCount ?? 0, episodeNumber),
          episodes: [...project.episodes, episode],
        }
      }),
    )
    setSelectedProjectId(projectId)
  }

  function updateEpisode(updatedEpisode: StoryEpisode) {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== updatedEpisode.projectId) {
          return project
        }

        return {
          ...project,
          episodes: project.episodes.map((episode) =>
            episode.id === updatedEpisode.id ? updatedEpisode : episode,
          ),
        }
      }),
    )
  }

  return (
    <main
      className={clsx(
        "min-h-screen bg-paper text-ink",
        !isWorkflowView && "md:grid",
        !isWorkflowView &&
          (sidebarCollapsed ? "md:grid-cols-[68px_1fr]" : "md:grid-cols-[232px_1fr]"),
      )}
    >
      {!isWorkflowView ? (
        <Sidebar
          activeView={activeView}
          className="hidden md:flex"
          collapsed={sidebarCollapsed}
          projects={sortedProjects}
          selectedProjectId={selectedProjectId}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onNewRecord={openNewRecord}
          onRecordList={openRecordList}
          onSearch={openSearch}
          onOpenProject={openProject}
        />
      ) : null}

      {!isWorkflowView ? (
        <MobileSidebarDrawer
          activeView={activeView}
          open={sidebarOpen}
          collapsed={false}
          projects={sortedProjects}
          selectedProjectId={selectedProjectId}
          onClose={() => setSidebarOpen(false)}
          onNewRecord={openNewRecord}
          onRecordList={openRecordList}
          onSearch={openSearch}
          onOpenProject={openProject}
        />
      ) : null}

      <section
        className={clsx(
          "min-h-screen bg-[#fdfdfc]",
          !isWorkflowView && "shadow-panel md:rounded-l-[28px]",
        )}
      >
        {!isWorkflowView ? (
          <TopBar
            activeView={activeView}
            selectedProject={selectedProject}
            selectedRecord={selectedRecord}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        ) : null}

        <div
          className={clsx(
            "mx-auto flex w-full flex-col px-4 pb-10 pt-6 sm:px-8",
            isWorkflowView
              ? "min-h-screen max-w-none lg:px-8"
              : "max-w-6xl md:min-h-[calc(100vh-84px)] lg:px-12",
          )}
        >
          {activeView === "new-record" && (
            <NewRecordView
              category={draftCategory}
              draftBody={draftBody}
              notice={notice}
              onCategoryChange={setDraftCategory}
              onDraftChange={setDraftBody}
              onSaveRecord={saveDraftRecord}
              onStartStory={startStoryFromDraft}
            />
          )}

          {activeView === "record-list" && (
            <RecordListView records={sortedRecords} onOpenRecord={openRecord} />
          )}

          {activeView === "record-detail" && selectedRecord && (
            <RecordDetailView
              record={selectedRecord}
              project={sortedProjects.find((project) => project.sourceRecordId === selectedRecord.id)}
              onStartStory={startStoryFromRecord}
              onOpenProject={openProject}
            />
          )}

          {activeView === "project-detail" && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              onAddEpisode={() => addEpisodeToProject(selectedProject.id)}
              onOpenEpisode={(episodeId) => openEpisode(selectedProject.id, episodeId)}
            />
          )}

          {activeView === "episode-workflow" && selectedProject && selectedEpisode && (
            <EpisodeWorkflowView
              episode={selectedEpisode}
              project={selectedProject}
              sourceRecord={selectedProjectRecord}
              onBackToProject={() => openProject(selectedProject.id)}
              onUpdateEpisode={updateEpisode}
            />
          )}

          {activeView === "search" && (
            <SearchView
              records={searchResults.records}
              projects={searchResults.projects}
              searchTerm={searchTerm}
              onOpenProject={openProject}
              onOpenRecord={openRecord}
              onSearchTermChange={setSearchTerm}
            />
          )}
        </div>
      </section>
    </main>
  )
}

function Sidebar({
  activeView,
  className,
  collapsed,
  onClose,
  projects,
  selectedProjectId,
  onToggleCollapsed,
  onNewRecord,
  onRecordList,
  onSearch,
  onOpenProject,
}: {
  activeView: ActiveView
  className?: string
  collapsed: boolean
  onClose?: () => void
  projects: StoryProject[]
  selectedProjectId?: string
  onToggleCollapsed?: () => void
  onNewRecord: () => void
  onRecordList: () => void
  onSearch: () => void
  onOpenProject: (projectId: string) => void
}) {
  return (
    <aside
      className={clsx(
        "h-full min-h-screen flex-col gap-5 bg-paper px-4 py-4 transition-[width]",
        collapsed && "items-center px-2",
        className,
      )}
    >
      <div className="flex items-center justify-between px-1">
        <div className={clsx("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-white">
            Y
          </div>
          {!collapsed ? <span className="text-xl font-semibold tracking-normal">YouStory</span> : null}
        </div>
        {onClose ? (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-quiet transition hover:bg-mist hover:text-ink"
            onClick={onClose}
            type="button"
            aria-label="关闭侧边栏"
          >
            <X size={19} />
          </button>
        ) : onToggleCollapsed ? (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-quiet transition hover:bg-mist hover:text-ink"
            onClick={onToggleCollapsed}
            type="button"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        ) : null}
      </div>

      <nav className="space-y-1">
        {!collapsed ? <p className="px-3 pb-1 text-sm font-medium text-quiet">记录</p> : null}
        <NavButton
          active={activeView === "new-record"}
          icon={<Plus size={20} />}
          label="新记录"
          collapsed={collapsed}
          onClick={onNewRecord}
        />
        <NavButton
          active={activeView === "record-list" || activeView === "record-detail"}
          icon={<List size={20} />}
          label="记录列表"
          collapsed={collapsed}
          onClick={onRecordList}
        />
        <NavButton
          active={activeView === "search"}
          icon={<Search size={20} />}
          label="搜索"
          collapsed={collapsed}
          onClick={onSearch}
        />
      </nav>

      <div className={clsx("min-h-0 flex-1 space-y-2", collapsed && "w-full")}>
        <div className="flex items-center justify-between px-3">
          {!collapsed ? <p className="text-sm font-medium text-quiet">项目</p> : null}
          <span className={clsx("rounded-full bg-white px-2 py-0.5 text-xs text-quiet shadow-sm", collapsed && "mx-auto")}>
            {projects.length}
          </span>
        </div>
        <div className="story-scrollbar max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto pr-1">
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white/55 px-3 py-4 text-sm text-quiet">
              点击开始故事后，这里会出现剧集项目。
            </div>
          ) : (
            projects.map((project) => (
              <button
                className={clsx(
                  "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  selectedProjectId === project.id
                    ? "bg-white shadow-soft"
                    : "hover:bg-white/70 hover:shadow-sm",
                )}
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                type="button"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                  <Clapperboard size={15} />
                </span>
                {!collapsed ? <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{project.title}</span>
                  <span className="mt-1 block truncate text-xs text-quiet">
                    {project.episodes.length} 集 · 草稿
                  </span>
                </span> : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 text-sm text-quiet">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-story text-sm font-semibold text-white">
          L
        </div>
        {!collapsed ? <>
          <span className="min-w-0 truncate">leoxiewl</span>
          <span className="rounded-full bg-mist px-2 py-0.5 text-xs">Free</span>
        </> : null}
      </div>
    </aside>
  )
}

function MobileSidebarDrawer({
  activeView,
  open,
  collapsed,
  projects,
  selectedProjectId,
  onClose,
  onNewRecord,
  onRecordList,
  onSearch,
  onOpenProject,
}: {
  activeView: ActiveView
  open: boolean
  collapsed: boolean
  projects: StoryProject[]
  selectedProjectId?: string
  onClose: () => void
  onNewRecord: () => void
  onRecordList: () => void
  onSearch: () => void
  onOpenProject: (projectId: string) => void
}) {
  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        className={clsx(
          "absolute inset-0 bg-ink/28 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        type="button"
        aria-label="关闭侧边栏遮罩"
      />
      <div
        className={clsx(
          "relative h-full w-[min(86vw,324px)] transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          activeView={activeView}
          className="flex shadow-panel"
          collapsed={collapsed}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onClose={onClose}
          onNewRecord={onNewRecord}
          onRecordList={onRecordList}
          onSearch={onSearch}
          onOpenProject={onOpenProject}
        />
      </div>
    </div>
  )
}

function TopBar({
  activeView,
  selectedProject,
  selectedRecord,
  onOpenSidebar,
}: {
  activeView: ActiveView
  selectedProject?: StoryProject
  selectedRecord?: RecordEntry
  onOpenSidebar: () => void
}) {
  const title =
    (activeView === "project-detail" || activeView === "episode-workflow") && selectedProject
      ? selectedProject.title
      : activeView === "record-detail" && selectedRecord
        ? selectedRecord.title
        : activeView === "record-list"
          ? "记录列表"
          : activeView === "search"
            ? "搜索"
            : "新记录"
  const titleIcon =
    (activeView === "project-detail" || activeView === "episode-workflow") && selectedProject ? (
      <Clapperboard size={18} />
    ) : (
      <Archive size={18} />
    )

  return (
    <header className="flex h-[84px] items-center justify-between px-4 sm:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper shadow-sm transition hover:bg-mist md:hidden"
          onClick={onOpenSidebar}
          type="button"
          aria-label="打开侧边栏"
        >
          <Menu size={20} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper shadow-sm">
          {titleIcon}
        </div>
        <button className="flex min-w-0 items-center gap-2 text-left" type="button">
          <span className="truncate text-xl font-semibold">{title}</span>
          <ChevronDown className="shrink-0 text-quiet" size={17} />
        </button>
      </div>
    </header>
  )
}

function NewRecordView({
  category,
  draftBody,
  notice,
  onCategoryChange,
  onDraftChange,
  onSaveRecord,
  onStartStory,
}: {
  category: RecordCategory
  draftBody: string
  notice: string
  onCategoryChange: (category: RecordCategory) => void
  onDraftChange: (value: string) => void
  onSaveRecord: () => void
  onStartStory: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-14 pt-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm text-quiet">
        <BookOpen size={16} />
        <span>记录是故事的素材</span>
      </div>

      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
          今天想记录什么？
        </h1>
        <p className="mt-4 text-base leading-7 text-quiet">
          写下日记、随感或一段突然想起的回忆。保存记录不会创建项目，开始故事才进入剧集创作。
        </p>
      </div>

      <section className="w-full max-w-4xl rounded-[28px] border border-line bg-white p-4 shadow-soft">
        <textarea
          className="min-h-36 w-full resize-none rounded-2xl border-0 bg-transparent px-2 py-2 text-lg leading-8 text-ink outline-none placeholder:text-[#b8b8b2]"
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="写下一段记录：一个场景、一句话、一次告别，或某个普通但重要的下午..."
          value={draftBody}
        />
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon={<Plus size={18} />} label="添加素材" />
            <IconButton icon={<ImagePlus size={18} />} label="人物参考" />
            <div className="ml-0 flex flex-wrap gap-2 md:ml-2">
              {categories.map((item) => (
                <button
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    category === item
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-quiet hover:border-ink hover:text-ink",
                  )}
                  key={item}
                  onClick={() => onCategoryChange(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <IconButton icon={<Mic size={18} />} label="语音记录" />
            <button
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink"
              onClick={onSaveRecord}
              type="button"
            >
              保存记录
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              onClick={onStartStory}
              type="button"
            >
              开始故事
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </section>

      <p className="max-w-2xl text-center text-sm text-quiet">{notice}</p>
    </div>
  )
}

function RecordListView({
  records,
  onOpenRecord,
}: {
  records: RecordEntry[]
  onOpenRecord: (recordId: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SectionIntro
        eyebrow="记录"
        title="记录列表"
        description="这里保存日常文字素材。它们可以只是记录，也可以在之后被拿来开始一个故事项目。"
      />
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} onClick={() => onOpenRecord(record.id)} />
        ))}
      </div>
    </div>
  )
}

function RecordDetailView({
  record,
  project,
  onStartStory,
  onOpenProject,
}: {
  record: RecordEntry
  project?: StoryProject
  onStartStory: (record: RecordEntry) => void
  onOpenProject: (projectId: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className={clsx(
                "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                categoryStyles[record.category],
              )}
            >
              {record.category}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal">{record.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-quiet">
              <CalendarDays size={16} />
              {formatDate(record.createdAt)}
            </p>
          </div>
          {project ? (
            <button
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
              onClick={() => onOpenProject(project.id)}
              type="button"
            >
              查看故事项目
            </button>
          ) : (
            <button
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
              onClick={() => onStartStory(record)}
              type="button"
            >
              开始故事
            </button>
          )}
        </div>

        <article className="mt-8 whitespace-pre-wrap rounded-2xl bg-paper p-5 text-lg leading-9">
          {record.body}
        </article>
      </div>
    </div>
  )
}

function ProjectDetailView({
  project,
  onAddEpisode,
  onOpenEpisode,
}: {
  project: StoryProject
  onAddEpisode: () => void
  onOpenEpisode: (episodeId: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">
              <Clapperboard size={15} />
              剧集项目 · {project.episodes.length} 集
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal">{project.title}</h1>
            <p className="mt-4 text-lg leading-8 text-quiet">{project.summary}</p>
            <p className="mt-3 text-sm leading-6 text-quiet">主题：{project.seriesTheme}</p>
          </div>
          <div className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-quiet">
            目标集数：{project.targetEpisodeCount ?? project.episodes.length}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">全部剧集</h2>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:border-ink"
              onClick={onAddEpisode}
              type="button"
            >
              <Plus size={16} />
              添加剧集
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {project.episodes.map((episode) => (
              <button
                className="rounded-2xl border border-line bg-[#fbfbfa] p-5 text-left transition hover:border-ink hover:bg-white hover:shadow-soft"
                key={episode.id}
                onClick={() => onOpenEpisode(episode.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-story">第 {episode.episodeNumber} 集</span>
                    <h3 className="mt-2 text-xl font-semibold">{episode.title}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-quiet shadow-sm">
                    {getEpisodeProgress(episode)} / {episode.workflow.length}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-quiet">{episode.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {episode.keywords.map((keyword) => (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-quiet" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SearchView({
  records,
  projects,
  searchTerm,
  onOpenRecord,
  onOpenProject,
  onSearchTermChange,
}: {
  records: RecordEntry[]
  projects: StoryProject[]
  searchTerm: string
  onOpenRecord: (recordId: string) => void
  onOpenProject: (projectId: string) => void
  onSearchTermChange: (value: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <SectionIntro
        eyebrow="搜索"
        title="搜索记录和项目"
        description="输入关键词，快速找到记录正文、记录标题、项目标题或项目摘要。"
      />
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
        <Search className="text-quiet" size={20} />
        <input
          className="w-full border-0 bg-transparent text-lg outline-none placeholder:text-[#b8b8b2]"
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="搜索某个地点、人物、情绪或片段..."
          value={searchTerm}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">记录 · {records.length}</h2>
          <div className="space-y-3">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} onClick={() => onOpenRecord(record.id)} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">项目 · {projects.length}</h2>
          <div className="space-y-3">
            {projects.map((project) => (
              <button
                className="w-full rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-ink"
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                type="button"
              >
                <p className="font-semibold">{project.title}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-quiet">{project.summary}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-sm font-medium text-story">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-quiet">{description}</p>
    </div>
  )
}

function NavButton({
  active,
  collapsed,
  icon,
  label,
  onClick,
}: {
  active: boolean
  collapsed?: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[16px] font-medium transition",
        collapsed && "justify-center px-0",
        active ? "bg-mist text-ink" : "text-ink hover:bg-white/70",
      )}
      onClick={onClick}
      type="button"
      title={label}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed ? <span>{label}</span> : null}
    </button>
  )
}

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
      title={label}
      type="button"
      aria-label={label}
    >
      {icon}
    </button>
  )
}

function RecordCard({ record, onClick }: { record: RecordEntry; onClick: () => void }) {
  return (
    <button
      className="w-full rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-ink hover:shadow-soft"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{record.title}</p>
          <p className="mt-1 text-xs text-quiet">{formatDate(record.createdAt)}</p>
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            categoryStyles[record.category],
          )}
        >
          {record.category}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-quiet">{record.body}</p>
    </button>
  )
}

function buildRecord(body: string, category: RecordCategory): RecordEntry | undefined {
  const cleanedBody = body.trim()

  if (!cleanedBody) {
    return undefined
  }

  return {
    id: createId("record"),
    title: deriveTitle(cleanedBody),
    body: cleanedBody,
    category,
    createdAt: new Date().toISOString(),
  }
}

function buildProject(record: RecordEntry): StoryProject {
  const projectId = createId("project")
  const summary = deriveSummary(record.body)

  return {
    id: projectId,
    title: record.title,
    sourceRecordId: record.id,
    summary,
    seriesTheme: summary,
    targetEpisodeCount: 1,
    episodes: [
      createStoryEpisode({
        projectId,
        episodeNumber: 1,
        title: record.title,
        summary,
        keywords: deriveKeywords(record.body),
        emotionalTone: "真实、私人、带有回忆感",
        scriptDraft: summary,
        payoffMoments: ["来自原始记录的情绪高点"],
        plotBranches: ["真实记录版", "电影感增强版", "旁白回望版"],
      }),
    ],
    status: "draft",
    createdAt: new Date().toISOString(),
  }
}

function deriveTitle(body: string) {
  const firstLine = body
    .split(/\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) {
    return "未命名记录"
  }

  return firstLine.length > 18 ? `${firstLine.slice(0, 18)}...` : firstLine
}

function deriveSummary(body: string) {
  const compact = body.replace(/\s+/g, " ").trim()
  return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact
}

function deriveKeywords(body: string) {
  return body
    .replace(/[，。！？、,.!?]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getEpisodeProgress(episode: StoryEpisode) {
  return episode.workflow.filter((stage) => stage.status !== "not_started").length
}
