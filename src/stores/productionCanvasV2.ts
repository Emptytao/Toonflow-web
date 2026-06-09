import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { MessagePlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import { createNode, getDefaultNodeSize } from "@/views/productionV2/core/nodeRegistry";
import { getNormalizedNonMediaNodeSize, getVisualNodeSizeFromSource, isVisualNodeType } from "@/views/productionV2/core/layout";
import type {
  CanvasSourceRef,
  CanvasV2Clipboard,
  CanvasV2Document,
  CanvasV2Edge,
  CanvasV2FileType,
  CanvasV2MediaItem,
  CanvasV2ModelDetail,
  CanvasV2ModelOption,
  CanvasV2Node,
  CanvasV2NodeType,
  CanvasV2ReferenceDrawerData,
  CanvasV2ReferencePaletteItem,
  CanvasV2RuntimeStatus,
  CanvasV2WorkflowAction,
  DrawerAssetCategoryKey,
  DrawerAssetItem,
  DrawerPromptCategoryKey,
  DrawerPromptItem,
  DrawerPromptSourceType,
  DrawerWorkflowHistoryItem,
  DrawerWorkflowItem,
  LoopNodeDataV2,
  MediaNodeDataV2,
  PromptNodeDataV2,
  VideoNodeDataV2,
} from "@/views/productionV2/types";

const MOCK_FORCE_KEY = "production-v2-force-mock";
const MOCK_GRAPH_KEY_PREFIX = "production-v2-mock-graph";
const MOCK_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const MOCK_VIDEO_ALT_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

function createEmptyDocument(projectId = 0, episodeId = 0): CanvasV2Document {
  return {
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    nodes: [],
    edges: [],
    meta: {
      graphId: `${projectId}-${episodeId}`,
      projectId,
      episodeId,
    },
  };
}

function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createSvgDataUrl(title: string, palette: [string, string], accent = "#ffffff") {
  const safeTitle = String(title || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" rx="40" fill="url(#g)"/>
      <circle cx="1060" cy="140" r="120" fill="rgba(255,255,255,0.14)"/>
      <circle cx="180" cy="560" r="150" fill="rgba(255,255,255,0.10)"/>
      <text x="96" y="150" font-size="42" font-family="Arial, sans-serif" fill="${accent}" opacity="0.78">Production V2 Mock</text>
      <text x="96" y="360" font-size="86" font-family="Arial, sans-serif" font-weight="700" fill="${accent}">${safeTitle}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n/g, "").replace(/\s{2,}/g, " "))}`;
}

function createEmptyReferenceDrawer(): CanvasV2ReferenceDrawerData {
  return {
    assets: {
      image: [],
      video: [],
      audio: [],
    },
    prompts: [],
    workflows: [],
    storyboards: [],
  };
}

const ASSET_CATEGORY_QUERY_MAP: Array<{ queryType: string; category: DrawerAssetCategoryKey }> = [
  { queryType: "role", category: "role" },
  { queryType: "tool", category: "tool" },
  { queryType: "scene", category: "scene" },
  { queryType: "clip", category: "clip" },
  { queryType: "audio", category: "audio" },
];

const PROMPT_CATEGORY_KEYWORDS: Record<DrawerPromptCategoryKey, string[]> = {
  character: ["角色", "人物", "发丝", "面部", "表情", "服饰", "轮廓", "角色设定", "五官", "姿态", "character"],
  composition: ["构图", "全景", "中景", "近景", "特写", "俯拍", "仰拍", "景别", "主体", "留白", "前景", "背景", "胸像"],
  camera: ["镜头", "运镜", "推进", "推近", "拉远", "平移", "横移", "摇镜", "转身", "跟拍", "移动", "机位", "tracking", "pan"],
  style: ["风格", "质感", "写实", "动漫", "电影感", "胶片", "颗粒", "色调", "氛围", "材质", "纹理", "style"],
  lighting: ["光", "光影", "逆光", "侧光", "高光", "阴影", "反光", "暖光", "冷光", "霓虹", "曝光", "灯轨", "夜色"],
  other: [],
};

function normalizeAssetLibraryCategory(value: unknown, fallback: DrawerAssetCategoryKey = "uncategorized"): DrawerAssetCategoryKey {
  if (value === "role" || value === "角色") return "role";
  if (value === "tool" || value === "道具") return "tool";
  if (value === "scene" || value === "场景") return "scene";
  if (value === "clip" || value === "素材") return "clip";
  if (value === "audio" || value === "音频") return "audio";
  return fallback;
}

function inferPromptSourceType(sourceKind: unknown): DrawerPromptSourceType {
  if (sourceKind === "assetPrompt") return "asset";
  if (sourceKind === "storyboardPrompt") return "storyboard";
  return "track";
}

function classifyPromptCategory(input: {
  label?: string;
  subtitle?: string;
  text?: string;
  sourceType: DrawerPromptSourceType;
}): DrawerPromptCategoryKey {
  const content = [input.label, input.subtitle, input.text]
    .map((item) => String(item || "").toLowerCase())
    .join("\n");

  if (input.sourceType === "asset") {
    if (/(角色|人物|character|发丝|服饰|五官|表情)/.test(content)) return "character";
    if (/(场景|背景|材质|纹理|风格|style)/.test(content)) return "style";
    if (/(光|光影|高光|阴影|反光|霓虹|暖光|冷光)/.test(content)) return "lighting";
  }

  for (const [category, keywords] of Object.entries(PROMPT_CATEGORY_KEYWORDS) as Array<[DrawerPromptCategoryKey, string[]]>) {
    if (keywords.some((keyword) => content.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  return "other";
}

function flattenAssetRecords(records: any[]): Array<{ id: number; type?: unknown; sonAssets?: any[] }> {
  const result: Array<{ id: number; type?: unknown; sonAssets?: any[] }> = [];
  const walk = (items: any[]) => {
    items.forEach((item) => {
      if (!item || typeof item !== "object") return;
      result.push(item);
      if (Array.isArray(item.sonAssets) && item.sonAssets.length) {
        walk(item.sonAssets);
      }
    });
  };
  walk(records);
  return result;
}

function createMockGraphStorageKey(projectId: number, episodeId: number) {
  return `${MOCK_GRAPH_KEY_PREFIX}:${projectId}:${episodeId}`;
}

function ensureArrayMode(mode: unknown) {
  if (Array.isArray(mode)) return JSON.stringify(mode);
  if (typeof mode === "string") return mode;
  return "text";
}

function normalizeLegacyRuntimeStatus(state: unknown): CanvasV2RuntimeStatus {
  const normalized = String(state || "");
  if (normalized === "生成中") return "running";
  if (normalized === "已完成") return "success";
  if (normalized === "生成失败") return "error";
  if (normalized === "已停止") return "stopped";
  if (normalized === "排队中") return "queued";
  return "idle";
}

function normalizeFileType(value: unknown): CanvasV2FileType {
  if (value === "video" || value === "audio") return value;
  return "image";
}

function toTimestamp(value: unknown) {
  const nextValue = Number(value);
  if (Number.isFinite(nextValue) && nextValue > 0) return nextValue;
  return Date.now();
}

function isMockPreferenceEnabled() {
  return false;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 24,
) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

type WorkflowInputMediaItem = CanvasV2MediaItem & {
  nodeId: string;
  nodeTitle: string;
};

type WorkflowInputPrompt = {
  nodeId: string;
  title: string;
  text: string;
  resolved: boolean;
};

type WorkflowLoopSummary = {
  nodeId: string;
  title: string;
  count: number;
  startIndex: number;
  executionMode: "serial" | "parallel";
  takeCount: number;
  enableImageInput: boolean;
  enablePromptInput: boolean;
  prompts: string[];
};

type MockVideoJob = {
  jobId: number;
  nodeId: string;
  prompt: string;
  createdAt: number;
  durationMs: number;
  variant: 1 | 2;
};

export default defineStore("productionCanvasV2", () => {
  const projectId = ref<number>(0);
  const episodeId = ref<number>(0);
  const graph = ref<CanvasV2Document>(createEmptyDocument());
  const loading = ref(false);
  const saving = ref(false);
  const selectedNodeIds = ref<string[]>([]);
  const selectedEdgeIds = ref<string[]>([]);
  const clipboard = ref<CanvasV2Clipboard | null>(null);
  const historyPast = ref<CanvasV2Document[]>([]);
  const historyFuture = ref<CanvasV2Document[]>([]);
  const referencePalette = ref<CanvasV2ReferencePaletteItem[]>([]);
  const referenceDrawer = ref<CanvasV2ReferenceDrawerData>(createEmptyReferenceDrawer());
  const videoModelOptions = ref<CanvasV2ModelOption[]>([]);
  const textModelOptions = ref<CanvasV2ModelOption[]>([]);
  const modelDetailMap = ref<Record<string, CanvasV2ModelDetail>>({});
  const expandedNodeId = ref("");
  const projectVideoModel = ref("");
  const projectVideoMode = ref("text");
  const mockMode = ref(false);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let mockJobSeed = Date.now();
  const mockJobs = new Map<number, MockVideoJob>();

  const nodes = computed(() => graph.value.nodes);
  const edges = computed(() => graph.value.edges);
  const canUndo = computed(() => historyPast.value.length > 0);
  const canRedo = computed(() => historyFuture.value.length > 0);
  const hasClipboard = computed(() => Boolean(clipboard.value?.nodes?.length));
  const hasSelection = computed(() => selectedNodeIds.value.length > 0 || selectedEdgeIds.value.length > 0);
  const activeNode = computed(() => nodes.value.find((node) => node.id === selectedNodeIds.value[0]) || null);
  const selectedNodes = computed(() => nodes.value.filter((node) => selectedNodeIds.value.includes(node.id)));
  const selectedEdges = computed(() => edges.value.filter((edge) => selectedEdgeIds.value.includes(edge.id)));
  const activeJobs = computed(() =>
    nodes.value
      .filter((node) => {
        const runtime = (node.data as any)?.runtime;
        return node.type === "video" && runtime?.jobType === "video" && runtime?.jobId && ["queued", "running"].includes(runtime?.status);
      })
      .map((node) => ({
        nodeId: node.id,
        jobId: Number((node.data as any).runtime.jobId),
        jobType: "video" as const,
      })),
  );

  function setMockMode(enabled: boolean, persistPreference = true) {
    mockMode.value = enabled;
    if (!persistPreference) return;
    try {
      if (enabled) {
        localStorage.setItem(MOCK_FORCE_KEY, "1");
      } else {
        localStorage.removeItem(MOCK_FORCE_KEY);
      }
    } catch {}
  }

  function saveMockGraphSnapshot() {
    if (!projectId.value || !episodeId.value) return;
    try {
      localStorage.setItem(createMockGraphStorageKey(projectId.value, episodeId.value), JSON.stringify(graph.value));
    } catch {}
  }

  function loadMockGraphSnapshot(nextProjectId: number, nextEpisodeId: number) {
    try {
      const raw = localStorage.getItem(createMockGraphStorageKey(nextProjectId, nextEpisodeId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as CanvasV2Document;
    } catch {
      return null;
    }
  }

  function createSourceRef(
    sourceKind: CanvasSourceRef["sourceKind"],
    sourceId: number | string,
    extra?: Partial<Omit<CanvasSourceRef, "sourceKind" | "sourceId" | "projectId" | "episodeId" | "snapshotAt">>,
  ): CanvasSourceRef {
    return {
      sourceKind,
      sourceId,
      projectId: projectId.value,
      episodeId: episodeId.value,
      snapshotAt: Date.now(),
      ...extra,
    };
  }

  function createMediaSnapshotFromReference(item: CanvasV2ReferencePaletteItem): CanvasV2MediaItem {
    return {
      id: crypto.randomUUID(),
      fileType: item.fileType,
      url: item.url,
      label: item.label,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      prompt: item.prompt,
      createdAt: Date.now(),
      sourceRef: item.sourceRef ? cloneDocument(item.sourceRef) : null,
    };
  }

  function createMockReferenceItem(options: {
    id: string;
    sourceType: "assets" | "storyboard";
    sourceId: number;
    fileType: CanvasV2FileType;
    label: string;
    subtitle: string;
    url: string;
    prompt?: string;
    trackId?: number;
  }): CanvasV2ReferencePaletteItem {
    return {
      id: options.id,
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      fileType: options.fileType,
      label: options.label,
      subtitle: options.subtitle,
      url: options.url,
      prompt: options.prompt,
      sourceRef: createSourceRef(options.sourceType === "assets" ? "asset" : "storyboard", options.sourceId, {
        trackId: options.trackId ?? null,
      }),
    };
  }

  function createMockReferenceDrawerData(): CanvasV2ReferenceDrawerData {
    const storyboard1 = createMockReferenceItem({
      id: "storyboard-7001",
      sourceType: "storyboard",
      sourceId: 7001,
      fileType: "image",
      label: "分镜 #1",
      subtitle: "夜色街道 · 主角回头",
      url: createSvgDataUrl("Storyboard 01", ["#4f46e5", "#0ea5e9"]),
      prompt: "夜色街道里，人物回头看向镜头，霓虹反光清晰。",
    });
    const storyboard2 = createMockReferenceItem({
      id: "storyboard-7002",
      sourceType: "storyboard",
      sourceId: 7002,
      fileType: "image",
      label: "分镜 #2",
      subtitle: "室内特写 · 情绪推进",
      url: createSvgDataUrl("Storyboard 02", ["#f97316", "#ef4444"]),
      prompt: "室内暖光下的近景特写，人物情绪逐渐抬升。",
    });
    const assetImage1 = createMockReferenceItem({
      id: "assets-8101-image",
      sourceType: "assets",
      sourceId: 8101,
      fileType: "image",
      label: "角色立绘 A",
      subtitle: "人物正面图 · 可作为首帧参考",
      url: createSvgDataUrl("Character A", ["#10b981", "#14b8a6"]),
      prompt: "保持角色面部特征稳定，服饰细节完整。",
      trackId: 9001,
    });
    const assetImage2 = createMockReferenceItem({
      id: "assets-8102-image",
      sourceType: "assets",
      sourceId: 8102,
      fileType: "image",
      label: "场景背景 B",
      subtitle: "城市高架桥 · 夜景背景",
      url: createSvgDataUrl("Background B", ["#0f172a", "#334155"]),
      prompt: "夜景城市高架桥，车流灯轨与远处高楼层次清晰。",
      trackId: 9001,
    });
    const assetVideo = createMockReferenceItem({
      id: "assets-8103-video",
      sourceType: "assets",
      sourceId: 8103,
      fileType: "video",
      label: "镜头参考视频",
      subtitle: "运镜节奏参考 · 横向推进",
      url: MOCK_VIDEO_ALT_URL,
      prompt: "参考镜头缓慢推进的节奏与运动轨迹。",
      trackId: 9002,
    });
    const assetAudio = createMockReferenceItem({
      id: "assets-8104-audio",
      sourceType: "assets",
      sourceId: 8104,
      fileType: "audio",
      label: "环境音素材",
      subtitle: "城市夜景底噪",
      url: "",
      prompt: "城市夜晚的环境底噪，轻微车流与风声。",
      trackId: 9002,
    });

    const workflow1History: DrawerWorkflowHistoryItem[] = [
      {
        id: "workflow-9001-video-1",
        videoId: 95001,
        url: `${MOCK_VIDEO_URL}?mock=95001`,
        state: "已完成",
        createdAt: Date.now() - 1000 * 60 * 18,
        errorReason: "",
        selected: true,
      },
      {
        id: "workflow-9001-video-2",
        videoId: 95002,
        url: `${MOCK_VIDEO_ALT_URL}?mock=95002`,
        state: "已完成",
        createdAt: Date.now() - 1000 * 60 * 42,
        errorReason: "",
        selected: false,
      },
    ];
    const workflow2History: DrawerWorkflowHistoryItem[] = [
      {
        id: "workflow-9002-video-1",
        videoId: 96001,
        url: "",
        state: "生成中",
        createdAt: Date.now() - 1000 * 60 * 3,
        errorReason: "",
        selected: true,
      },
    ];

    const prompts: DrawerPromptItem[] = [
      {
        id: "track-prompt-9001",
        label: "视频工作流 #9001 提示词",
        subtitle: "视频工作流提示词",
        text: "夜色街道中，角色从高架桥边缘缓慢转身，镜头推进到胸像特写，保留雨后路面的反光质感。",
        previewUrl: assetImage1.url,
        sourceType: "track",
        libraryCategory: "camera",
        sourceRef: createSourceRef("trackPrompt", 9001, { trackId: 9001 }),
      },
      {
        id: "asset-prompt-8101",
        label: "角色立绘 A",
        subtitle: "资产提示词",
        text: "强调发丝层次、面部轮廓和服装反光，保持角色辨识度。",
        previewUrl: assetImage1.url,
        sourceType: "asset",
        libraryCategory: "character",
        sourceRef: createSourceRef("assetPrompt", 8101, { trackId: 9001 }),
      },
      {
        id: "storyboard-prompt-7002",
        label: "分镜 #2 文案",
        subtitle: "分镜参考提示词",
        text: "室内暖光近景，人物眼神微颤，情绪渐强，背景虚化。",
        previewUrl: storyboard2.url,
        sourceType: "storyboard",
        libraryCategory: "lighting",
        sourceRef: createSourceRef("storyboardPrompt", 7002),
      },
    ];

    return {
      assets: {
        image: [
          { ...(assetImage1 as DrawerAssetItem), assetGroup: "image", libraryCategory: "role" },
          { ...(assetImage2 as DrawerAssetItem), assetGroup: "image", libraryCategory: "scene" },
        ],
        video: [{ ...assetVideo, assetGroup: "video", libraryCategory: "clip" }],
        audio: [{ ...assetAudio, assetGroup: "audio", libraryCategory: "audio" }],
      },
      prompts,
      workflows: [
        {
          id: "workflow-9001",
          trackId: 9001,
          title: "视频工作流 #9001",
          subtitle: "已完成 · 2 条结果",
          prompt: prompts[0].text,
          state: "已完成",
          selectedVideo: workflow1History[0],
          history: workflow1History,
          imageReferences: [assetImage1, assetImage2],
          mediaReferences: [assetImage1, assetImage2],
          imageCount: 2,
          sourceRef: createSourceRef("trackWorkflow", 9001, { trackId: 9001, videoId: 95001 }),
        },
        {
          id: "workflow-9002",
          trackId: 9002,
          title: "视频工作流 #9002",
          subtitle: "生成中 · 1 条结果",
          prompt: "从室内窗边缓慢推近人物侧脸，保留前景虚化与环境氛围声的节奏感。",
          state: "生成中",
          selectedVideo: workflow2History[0],
          history: workflow2History,
          imageReferences: [storyboard2],
          mediaReferences: [storyboard2, assetVideo, assetAudio],
          imageCount: 1,
          sourceRef: createSourceRef("trackWorkflow", 9002, { trackId: 9002, videoId: 96001 }),
        },
      ],
      storyboards: [
        {
          id: storyboard1.id,
          label: storyboard1.label,
          subtitle: storyboard1.subtitle,
          imageItem: storyboard1,
          promptText: storyboard1.prompt,
          promptSourceRef: createSourceRef("storyboardPrompt", 7001),
        },
        {
          id: storyboard2.id,
          label: storyboard2.label,
          subtitle: storyboard2.subtitle,
          imageItem: storyboard2,
          promptText: storyboard2.prompt,
          promptSourceRef: createSourceRef("storyboardPrompt", 7002),
        },
      ],
    };
  }

  function getMockModelOptionsData() {
    const videoOptions: CanvasV2ModelOption[] = [
      { id: "mock-video-flash", label: "Flash", value: "mock-video-flash", name: "Mock Video", type: "video" },
      { id: "mock-video-pro", label: "Pro", value: "mock-video-pro", name: "Mock Video", type: "video" },
    ];
    const textOptions: CanvasV2ModelOption[] = [
      { id: "mock-text-rewrite", label: "Rewrite", value: "mock-text-rewrite", name: "Mock Text", type: "text" },
    ];
    const detailMap: Record<string, CanvasV2ModelDetail> = {
      "mock-video-flash": {
        modelName: "mock-video-flash",
        name: "Mock Video Flash",
        audio: "optional",
        mode: ["text", "singleImage"],
        durationResolutionMap: [{ duration: [5, 8], resolution: ["720p", "1080p"] }],
        type: "video",
      },
      "mock-video-pro": {
        modelName: "mock-video-pro",
        name: "Mock Video Pro",
        audio: true,
        mode: ["text", "singleImage", ["imageReference", "videoReference"]],
        durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
        type: "video",
      },
      "mock-text-rewrite": {
        modelName: "mock-text-rewrite",
        name: "Mock Text Rewrite",
        type: "text",
      },
    };
    return { videoOptions, textOptions, detailMap };
  }

  function useMockReferenceDrawerData() {
    const drawerData = createMockReferenceDrawerData();
    referenceDrawer.value = drawerData;
    referencePalette.value = [
      ...drawerData.storyboards.map((item) => item.imageItem),
      ...drawerData.assets.image,
      ...drawerData.assets.video,
      ...drawerData.assets.audio,
    ];
  }

  function createPromptNodeDataFromDrawerItem(item: DrawerPromptItem) {
    return {
      title: item.label || "文本节点",
      rawPrompt: item.text,
      resolvedPrompt: item.text,
      sourceRef: cloneDocument(item.sourceRef),
    };
  }

  function resetHistory() {
    historyPast.value = [];
    historyFuture.value = [];
  }

  function captureHistory() {
    historyPast.value.push(cloneDocument(graph.value));
    if (historyPast.value.length > 60) {
      historyPast.value.shift();
    }
    historyFuture.value = [];
  }

  function replaceGraph(nextGraph: CanvasV2Document, reset = false) {
    graph.value = cloneDocument(nextGraph);
    if (reset) {
      resetHistory();
    }
    selectedEdgeIds.value = selectedEdgeIds.value.filter((id) => graph.value.edges.some((edge) => edge.id === id));
    selectedNodeIds.value = selectedNodeIds.value.filter((id) => graph.value.nodes.some((node) => node.id === id));
    ensurePolling();
  }

  function queueSave(immediate = false) {
    if (!projectId.value || !episodeId.value) return;
    if (saveTimer) clearTimeout(saveTimer);
    const run = async () => {
      if (mockMode.value) {
        saveMockGraphSnapshot();
        return;
      }
      saving.value = true;
      try {
        await axios.post("/production/v2/save", {
          projectId: projectId.value,
          episodeId: episodeId.value,
          graphData: graph.value,
        });
      } catch (err: any) {
        MessagePlugin.error(err?.message || "V2 画布保存失败");
      } finally {
        saving.value = false;
      }
    };
    if (immediate) {
      void run();
      return;
    }
    saveTimer = setTimeout(() => void run(), 360);
  }

  function setSelection(nodeIds: string[], edgeIds: string[] = []) {
    selectedNodeIds.value = [...new Set(nodeIds)];
    selectedEdgeIds.value = [...new Set(edgeIds)];
  }

  function clearSelection() {
    setSelection([], []);
  }

  function selectAllNodes() {
    if (!graph.value.nodes.length) {
      clearSelection();
      return;
    }
    setSelection(
      graph.value.nodes.map((node) => node.id),
      [],
    );
  }

  function toggleNodeSelection(nodeId: string, additive = false) {
    if (additive) {
      if (selectedNodeIds.value.includes(nodeId)) {
        selectedNodeIds.value = selectedNodeIds.value.filter((id) => id !== nodeId);
      } else {
        selectedNodeIds.value = [...selectedNodeIds.value, nodeId];
      }
      return;
    }
    setSelection([nodeId], []);
  }

  function selectEdge(edgeId: string, additive = false) {
    if (additive) {
      if (selectedEdgeIds.value.includes(edgeId)) {
        selectedEdgeIds.value = selectedEdgeIds.value.filter((id) => id !== edgeId);
      } else {
        selectedEdgeIds.value = [...selectedEdgeIds.value, edgeId];
      }
      return;
    }
    setSelection([], [edgeId]);
  }

  function setViewport(viewport: CanvasV2Document["viewport"], persist = false) {
    graph.value.viewport = { ...viewport };
    if (persist) {
      queueSave();
    }
  }

  function addNode(type: CanvasV2NodeType, position: { x: number; y: number }, options?: { exactPosition?: boolean }) {
    captureHistory();
    const node = createNode(type, options?.exactPosition ? position : findAvailablePosition(position, getDefaultNodeSize(type)));
    if (type === "video") {
      const data = node.data as VideoNodeDataV2;
      data.model = projectVideoModel.value || data.model;
      data.mode = ensureArrayMode(projectVideoMode.value || data.mode);
    }
    graph.value.nodes.push(node);
    setSelection([node.id], []);
    queueSave();
    return node;
  }

  function updateNodeData<T extends Record<string, any>>(nodeId: string, patch: Partial<T>, withHistory = false) {
    const node = graph.value.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (withHistory) {
      captureHistory();
    }
    node.data = {
      ...(node.data as any),
      ...patch,
    };
    queueSave();
  }

  function updateNodeSize(nodeId: string, size: { width: number; height: number }) {
    const node = graph.value.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    node.size = isVisualNodeType(node.type)
      ? getVisualNodeSizeFromSource(size.width, size.height)
      : getNormalizedNonMediaNodeSize();
    queueSave();
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    const node = graph.value.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    node.position = {
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
  }

  function moveNodes(nodeIds: string[], delta: { x: number; y: number }) {
    nodeIds.forEach((nodeId) => {
      const node = graph.value.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      node.position = {
        x: Math.round(node.position.x + delta.x),
        y: Math.round(node.position.y + delta.y),
      };
    });
  }

  function validateConnection(sourceNode?: CanvasV2Node, targetNode?: CanvasV2Node) {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return null;
    if (sourceNode.type === "prompt" && ["prompt", "media", "video"].includes(targetNode.type)) {
      return { kind: "prompt" as const, sourcePort: "promptOut", targetPort: "promptIn" };
    }
    if (sourceNode.type === "media" && ["prompt", "media", "video"].includes(targetNode.type)) {
      return { kind: "media" as const, sourcePort: "mediaOut", targetPort: "mediaIn" };
    }
    return null;
  }

  function getIncomingEdges(nodeId: string, kind?: CanvasV2Edge["kind"]) {
    return graph.value.edges.filter((edge) => edge.target === nodeId && (!kind || edge.kind === kind));
  }

  function getIncomingNodes(nodeId: string, kind?: CanvasV2Edge["kind"]) {
    return getIncomingEdges(nodeId, kind)
      .map((edge) => graph.value.nodes.find((node) => node.id === edge.source))
      .filter((node): node is CanvasV2Node => Boolean(node));
  }

  function getWorkflowInputs(nodeId: string) {
    const mediaNodes = getIncomingNodes(nodeId, "media").filter(
      (node): node is CanvasV2Node<MediaNodeDataV2> => node.type === "media",
    );
    const promptNodes = getIncomingNodes(nodeId, "prompt").filter(
      (node): node is CanvasV2Node<PromptNodeDataV2> => node.type === "prompt",
    );
    const loopNodes = getIncomingNodes(nodeId, "loop").filter(
      (node): node is CanvasV2Node<LoopNodeDataV2> => node.type === "loop",
    );

    const mediaItems: WorkflowInputMediaItem[] = mediaNodes.flatMap((node) =>
      (node.data.items || []).map((item) => ({
        ...item,
        nodeId: node.id,
        nodeTitle: node.data.title || "Media",
      })),
    );
    const promptTexts = promptNodes
      .map((node) => {
        const resolvedText = String(node.data.resolvedPrompt || "").trim();
        const rawText = String(node.data.rawPrompt || "").trim();
        const text = resolvedText || rawText;
        if (!text) return null;
        return {
          nodeId: node.id,
          title: node.data.title || "Prompt",
          text,
          resolved: Boolean(resolvedText),
        } satisfies WorkflowInputPrompt;
      })
      .filter((item): item is WorkflowInputPrompt => Boolean(item));
    const loopSummaries: WorkflowLoopSummary[] = loopNodes.map((node) => ({
      nodeId: node.id,
      title: node.data.title || "Loop",
      count: Number(node.data.count || 1),
      startIndex: Number(node.data.startIndex || 1),
      executionMode: node.data.executionMode || "serial",
      takeCount: Number(node.data.takeCount || 1),
      enableImageInput: Boolean(node.data.enableImageInput),
      enablePromptInput: Boolean(node.data.enablePromptInput),
      prompts: (node.data.prompts || []).map((item) => String(item || "").trim()).filter(Boolean),
    }));

    return {
      mediaNodes,
      mediaItems,
      promptNodes,
      promptTexts,
      loopNodes,
      loopSummaries,
    };
  }

  function connectNodes(sourceId: string, targetId: string) {
    const sourceNode = graph.value.nodes.find((node) => node.id === sourceId);
    const targetNode = graph.value.nodes.find((node) => node.id === targetId);
    const connection = validateConnection(sourceNode, targetNode);
    if (!connection) {
      MessagePlugin.warning("当前节点组合不支持连接");
      return false;
    }
    const exists = graph.value.edges.some(
      (edge) => edge.source === sourceId && edge.target === targetId && edge.kind === connection.kind,
    );
    if (exists) return true;
    captureHistory();
    graph.value.edges.push({
      id: `${sourceId}-${targetId}-${connection.kind}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      sourcePort: connection.sourcePort,
      targetPort: connection.targetPort,
      kind: connection.kind,
    });
    queueSave();
    return true;
  }

  function removeEdge(edgeId: string) {
    const index = graph.value.edges.findIndex((edge) => edge.id === edgeId);
    if (index < 0) return;
    captureHistory();
    graph.value.edges.splice(index, 1);
    selectedEdgeIds.value = selectedEdgeIds.value.filter((id) => id !== edgeId);
    queueSave();
  }

  function deleteSelection() {
    if (!selectedNodeIds.value.length && !selectedEdgeIds.value.length) return;
    captureHistory();
    if (selectedNodeIds.value.length) {
      const deleteSet = new Set(selectedNodeIds.value);
      graph.value.nodes = graph.value.nodes.filter((node) => !deleteSet.has(node.id));
      graph.value.edges = graph.value.edges.filter((edge) => !deleteSet.has(edge.source) && !deleteSet.has(edge.target));
    }
    if (selectedEdgeIds.value.length) {
      const deleteSet = new Set(selectedEdgeIds.value);
      graph.value.edges = graph.value.edges.filter((edge) => !deleteSet.has(edge.id));
    }
    clearSelection();
    queueSave();
  }

  function copySelection() {
    if (!selectedNodeIds.value.length) return;
    const nodeSet = new Set(selectedNodeIds.value);
    clipboard.value = {
      nodes: cloneDocument(graph.value.nodes.filter((node) => nodeSet.has(node.id))),
      edges: cloneDocument(graph.value.edges.filter((edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target))),
    };
    MessagePlugin.success("已复制节点");
  }

  function pasteClipboard(targetPosition: { x: number; y: number }) {
    if (!clipboard.value?.nodes?.length) return;
    captureHistory();
    const minX = Math.min(...clipboard.value.nodes.map((node) => node.position.x));
    const minY = Math.min(...clipboard.value.nodes.map((node) => node.position.y));
    const idMap = new Map<string, string>();
    const pastedNodes = clipboard.value.nodes.map((node) => {
      const copy = cloneDocument(node);
      copy.id = crypto.randomUUID();
      copy.position.x = Math.round(targetPosition.x + (node.position.x - minX) + 24);
      copy.position.y = Math.round(targetPosition.y + (node.position.y - minY) + 24);
      if ((copy.data as any)?.runtime) {
        (copy.data as any).runtime = {
          status: "idle",
          jobType: null,
          jobId: null,
          startedAt: null,
          finishedAt: null,
          elapsedMs: null,
          errorMessage: "",
          resultUrl: "",
        };
      }
      idMap.set(node.id, copy.id);
      return copy;
    });
    const pastedEdges = clipboard.value.edges.map((edge) => ({
      ...cloneDocument(edge),
      id: crypto.randomUUID(),
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));
    graph.value.nodes.push(...pastedNodes);
    graph.value.edges.push(...pastedEdges);
    setSelection(
      pastedNodes.map((node) => node.id),
      [],
    );
    queueSave();
  }

  function duplicateNodes(nodeIds: string[], offset = { x: 30, y: 30 }) {
    const prevSelection = [...selectedNodeIds.value];
    setSelection(nodeIds, []);
    copySelection();
    pasteClipboard({
      x: Math.min(...graph.value.nodes.filter((node) => prevSelection.includes(node.id) || nodeIds.includes(node.id)).map((node) => node.position.x)) + offset.x,
      y: Math.min(...graph.value.nodes.filter((node) => prevSelection.includes(node.id) || nodeIds.includes(node.id)).map((node) => node.position.y)) + offset.y,
    });
  }

  function duplicateSelection() {
    if (!selectedNodeIds.value.length) return;
    duplicateNodes([...selectedNodeIds.value]);
  }

  function undo() {
    const prev = historyPast.value.pop();
    if (!prev) return;
    historyFuture.value.push(cloneDocument(graph.value));
    replaceGraph(prev);
  }

  function redo() {
    const next = historyFuture.value.pop();
    if (!next) return;
    historyPast.value.push(cloneDocument(graph.value));
    replaceGraph(next);
  }

  function openExpandedNode(nodeId: string) {
    expandedNodeId.value = nodeId;
  }

  function closeExpandedNode() {
    expandedNodeId.value = "";
  }

  async function uploadMedia(base64Data: string) {
    try {
      const { data } = await axios.post("/production/v2/uploadMedia", {
        projectId: projectId.value,
        episodeId: episodeId.value,
        base64Data,
      });
      return data as { url: string; fileType: "image" | "video" | "audio" };
    } catch {
      const mime = String(base64Data.split(";")[0] || "");
      const fileType = mime.includes("video/") ? "video" : mime.includes("audio/") ? "audio" : "image";
      return { url: base64Data, fileType };
    }
  }

  function createMediaNodeFromPaletteItem(item: CanvasV2ReferencePaletteItem, position: { x: number; y: number }, options?: { exactPosition?: boolean }) {
    captureHistory();
    const nodeType = item.fileType === "video" ? "video" : "media";
    const node = createNode(nodeType, options?.exactPosition ? position : findAvailablePosition(position, getDefaultNodeSize(nodeType)));
    const nextItem = createMediaSnapshotFromReference(item);
    if (nodeType === "video") {
      const data = node.data as VideoNodeDataV2;
      data.title = item.label;
      data.prompt = item.prompt || data.prompt;
      data.referenceItems = [nextItem];
      data.sourceRef = item.sourceRef ? cloneDocument(item.sourceRef) : null;
    } else {
      const data = node.data as MediaNodeDataV2;
      data.title = item.label;
      data.items = [nextItem];
      data.sourceRef = item.sourceRef ? cloneDocument(item.sourceRef) : null;
    }
    graph.value.nodes.push(node);
    setSelection([node.id], []);
    queueSave();
    return node;
  }

  function createPromptNodeFromDrawerItem(item: DrawerPromptItem, position: { x: number; y: number }, options?: { exactPosition?: boolean }) {
    captureHistory();
    const node = createNode("prompt", options?.exactPosition ? position : findAvailablePosition(position, getDefaultNodeSize("prompt")));
    const data = node.data as PromptNodeDataV2;
    Object.assign(data, createPromptNodeDataFromDrawerItem(item));
    graph.value.nodes.push(node);
    setSelection([node.id], []);
    queueSave();
    return node;
  }

  function applyWorkflowSnapshotToVideoNode(
    node: CanvasV2Node<VideoNodeDataV2>,
    workflow: DrawerWorkflowItem,
    historyItem?: DrawerWorkflowHistoryItem | null,
  ) {
    const data = node.data;
    const selectedHistory = historyItem ?? workflow.selectedVideo ?? null;
    const nextSourceRef = selectedHistory
      ? createSourceRef("trackVideo", selectedHistory.videoId, {
          trackId: workflow.trackId,
          videoId: selectedHistory.videoId,
        })
      : cloneDocument(workflow.sourceRef);

    data.title = workflow.title;
    data.prompt = workflow.prompt;
    data.referenceItems = workflow.mediaReferences.map((item) => createMediaSnapshotFromReference(item));
    data.sourceRef = nextSourceRef;
    data.workflowSnapshot = {
      trackId: workflow.trackId,
      title: workflow.title,
      prompt: workflow.prompt,
      state: workflow.state,
      selectedVideoId: selectedHistory?.videoId ?? null,
      selectedVideoUrl: selectedHistory?.url || "",
      imageReferences: workflow.imageReferences.map((item) => ({
        sourceId: item.sourceId,
        sourceType: item.sourceType,
        label: item.label,
        url: item.url,
      })),
    };
    data.runtime = {
      ...(data.runtime || {}),
      status: normalizeLegacyRuntimeStatus(selectedHistory?.state || workflow.state),
      errorMessage: selectedHistory?.errorReason || "",
    };
    data.videoResults = [];
    data.selectedResultId = "";
    if (!selectedHistory?.url) return;
    const resultId = crypto.randomUUID();
    data.videoResults = [
      {
        id: resultId,
        url: selectedHistory.url,
        state: normalizeLegacyRuntimeStatus(selectedHistory.state),
        createdAt: selectedHistory.createdAt || Date.now(),
        prompt: workflow.prompt,
        errorMessage: selectedHistory.errorReason || "",
        sourceRef: createSourceRef("trackVideo", selectedHistory.videoId, {
          trackId: workflow.trackId,
          videoId: selectedHistory.videoId,
        }),
      },
    ];
    data.selectedResultId = resultId;
  }

  function createVideoNodeFromWorkflowItem(
    workflow: DrawerWorkflowItem,
    position: { x: number; y: number },
    options?: { exactPosition?: boolean; historyItem?: DrawerWorkflowHistoryItem | null },
  ) {
    captureHistory();
    const node = createNode("video", options?.exactPosition ? position : findAvailablePosition(position, getDefaultNodeSize("video")));
    applyWorkflowSnapshotToVideoNode(node as CanvasV2Node<VideoNodeDataV2>, workflow, options?.historyItem);
    graph.value.nodes.push(node);
    setSelection([node.id], []);
    queueSave();
    return node;
  }

  function createWorkflowBundleFromDrawerItem(workflow: DrawerWorkflowItem, position: { x: number; y: number }, options?: { exactPosition?: boolean }) {
    captureHistory();
    const videoNode = createNode("video", options?.exactPosition ? position : findAvailablePosition(position, getDefaultNodeSize("video")));
    applyWorkflowSnapshotToVideoNode(videoNode as CanvasV2Node<VideoNodeDataV2>, workflow);
    graph.value.nodes.push(videoNode);

    const imageReferences = workflow.imageReferences.filter((item) => item.fileType === "image" && item.url);
    const totalRows = Math.max(1, Math.ceil(imageReferences.length / 2));
    const baseY = videoNode.position.y - ((totalRows - 1) * 108) / 2;
    imageReferences.forEach((item, index) => {
      const column = Math.floor(index / totalRows);
      const row = index % totalRows;
      const node = createNode(
        "media",
        findAvailablePosition(
          {
            x: videoNode.position.x - 260 - column * 180,
            y: baseY + row * 108,
          },
          getDefaultNodeSize("media"),
        ),
      );
      const data = node.data as MediaNodeDataV2;
      data.title = item.label;
      data.items = [createMediaSnapshotFromReference(item)];
      data.sourceRef = item.sourceRef ? cloneDocument(item.sourceRef) : null;
      graph.value.nodes.push(node);
      graph.value.edges.push({
        id: `${node.id}-${videoNode.id}-media-${Date.now()}-${index}`,
        source: node.id,
        target: videoNode.id,
        sourcePort: "mediaOut",
        targetPort: "mediaIn",
        kind: "media",
      });
    });
    setSelection([videoNode.id], []);
    queueSave();
    return videoNode;
  }

  function addReferenceToWorkflow(nodeId: string, item: CanvasV2ReferencePaletteItem) {
    const node = graph.value.nodes.find((entry) => entry.id === nodeId && entry.type === "video");
    if (!node) return;
    const data = node.data as VideoNodeDataV2;
    const nextItem = createMediaSnapshotFromReference(item);
    data.referenceItems = [...(data.referenceItems || []), nextItem];
    queueSave();
  }

  async function loadReferencedAssetCategoryMap(assetIds: number[]) {
    const uniqueIds = Array.from(new Set(assetIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)));
    const categoryMap = new Map<number, DrawerAssetCategoryKey>();
    if (!projectId.value || !uniqueIds.length) return categoryMap;
    const unresolvedIds = new Set(uniqueIds);

    for (const entry of ASSET_CATEGORY_QUERY_MAP) {
      let page = 1;
      const limit = 200;
      while (page <= 20 && unresolvedIds.size) {
        const { data } = await axios.post("/assets/getAssetsApi", {
          projectId: projectId.value,
          type: entry.queryType,
          name: "",
          page,
          limit,
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        if (!rows.length) break;
        flattenAssetRecords(rows).forEach((item) => {
          const assetId = Number(item?.id || 0);
          if (!assetId || !unresolvedIds.has(assetId)) return;
          categoryMap.set(assetId, normalizeAssetLibraryCategory(item?.type, entry.category));
          unresolvedIds.delete(assetId);
        });
        const total = Number(data?.total || 0);
        if (rows.length < limit || (total > 0 && page * limit >= total)) break;
        page += 1;
      }
      if (!unresolvedIds.size) break;
    }

    uniqueIds.forEach((id) => {
      if (!categoryMap.has(id)) {
        categoryMap.set(id, "uncategorized");
      }
    });
    return categoryMap;
  }

  async function loadReferenceDrawerData() {
    if (!projectId.value || !episodeId.value) {
      referenceDrawer.value = createEmptyReferenceDrawer();
      referencePalette.value = [];
      return;
    }
    try {
      const { data } = await axios.post("/production/workbench/getGenerateData", {
        projectId: projectId.value,
        scriptId: episodeId.value,
      });
      const trackList = cloneDocument(data?.trackList ?? []);
      const runningVideoIds = trackList
        .flatMap((track: any) => (track?.videoList ?? []).filter((item: any) => item?.state === "生成中").map((item: any) => item.id))
        .filter((id: any) => Number.isFinite(Number(id)));
      if (runningVideoIds.length) {
        try {
          const { data: videoStateData } = await axios.post("/production/workbench/checkVideoStateList", {
            projectId: projectId.value,
            scriptId: episodeId.value,
            videoIds: runningVideoIds,
          });
          (videoStateData ?? []).forEach((item: any) => {
            trackList.forEach((track: any) => {
              const found = (track?.videoList ?? []).find((entry: any) => Number(entry?.id) === Number(item?.id));
              if (!found) return;
              found.state = item?.state ?? found.state;
              found.src = item?.src ?? found.src;
              found.errorReason = item?.errorReason ?? found.errorReason;
            });
          });
        } catch {}
      }

      const referencedAssetIds = trackList
        .flatMap((track: any) =>
          (track?.medias ?? [])
            .filter((item: any) => item?.sources === "assets" && Number(item?.id))
            .map((item: any) => Number(item.id)),
        )
        .filter((item: number) => Number.isFinite(item) && item > 0);
      const assetCategoryMap = await loadReferencedAssetCategoryMap(referencedAssetIds);

      const assetBuckets = {
        image: [] as CanvasV2ReferenceDrawerData["assets"]["image"],
        video: [] as CanvasV2ReferenceDrawerData["assets"]["video"],
        audio: [] as CanvasV2ReferenceDrawerData["assets"]["audio"],
      };
      const prompts: DrawerPromptItem[] = [];
      const workflows: DrawerWorkflowItem[] = [];
      const storyboards: CanvasV2ReferenceDrawerData["storyboards"] = [];
      const assetMap = new Map<string, CanvasV2ReferenceDrawerData["assets"]["image"][number] | CanvasV2ReferenceDrawerData["assets"]["video"][number] | CanvasV2ReferenceDrawerData["assets"]["audio"][number]>();
      const promptMap = new Map<string, DrawerPromptItem>();

      (data?.storyboardList ?? []).forEach((item: any) => {
        if (!item?.id || !item?.src) return;
        const promptText = String(item?.prompt || item?.videoDesc || "").trim();
        const imageItem: CanvasV2ReferencePaletteItem = {
          id: `storyboard-${item.id}`,
          sourceType: "storyboard",
          sourceId: Number(item.id),
          fileType: "image",
          label: `分镜 #${item.index ?? item.id}`,
          subtitle: item.videoDesc || item.prompt || "Storyboard",
          url: item.src,
          prompt: promptText,
          sourceRef: createSourceRef("storyboard", Number(item.id)),
        };
        storyboards.push({
          id: imageItem.id,
          label: imageItem.label,
          subtitle: imageItem.subtitle,
          imageItem,
          promptText: promptText || undefined,
          promptSourceRef: promptText ? createSourceRef("storyboardPrompt", Number(item.id)) : null,
        });
        if (promptText) {
          promptMap.set(`storyboard-prompt-${item.id}`, {
            id: `storyboard-prompt-${item.id}`,
            label: `${imageItem.label} 文案`,
            subtitle: "分镜参考提示词",
            text: promptText,
            previewUrl: item.src,
            sourceType: "storyboard",
            libraryCategory: classifyPromptCategory({
              label: `${imageItem.label} 文案`,
              subtitle: "分镜参考提示词",
              text: promptText,
              sourceType: "storyboard",
            }),
            sourceRef: createSourceRef("storyboardPrompt", Number(item.id)),
          });
        }
      });

      trackList.forEach((track: any) => {
        const trackId = Number(track?.id || 0);
        if (!trackId) return;
        const mediaReferences: CanvasV2ReferencePaletteItem[] = [];
        const imageReferences: CanvasV2ReferencePaletteItem[] = [];
        const trackPrompt = String(track?.prompt || "").trim();
        const trackTitle = `视频工作流 #${trackId}`;

        (track?.medias ?? []).forEach((item: any) => {
          const fileType = normalizeFileType(item?.fileType);
          const sourceType = item?.sources === "storyboard" ? "storyboard" : item?.sources === "assets" ? "assets" : null;
          const sourceId = Number(item?.id || 0);
          if (!sourceType || !sourceId || !item?.src) return;
          const referenceItem: CanvasV2ReferencePaletteItem = {
            id: `${sourceType}-${sourceId}-${fileType}`,
            sourceType,
            sourceId,
            fileType,
            label: item?.name || item?.label || (sourceType === "assets" ? `资产 ${sourceId}` : `分镜 #${item?.index ?? sourceId}`),
            subtitle: item?.prompt || item?.describe || item?.videoDesc || (sourceType === "assets" ? "Asset" : "Storyboard"),
            url: item.src,
            prompt: item?.prompt || item?.videoDesc || "",
            sourceRef: createSourceRef(sourceType === "assets" ? "asset" : "storyboard", sourceId, { trackId }),
          };
          mediaReferences.push(referenceItem);
          if (fileType === "image") {
            imageReferences.push(referenceItem);
          }
          if (sourceType === "assets") {
            const assetKey = `${sourceType}-${sourceId}-${fileType}`;
            if (!assetMap.has(assetKey)) {
              const libraryCategory = fileType === "audio" ? "audio" : (assetCategoryMap.get(sourceId) ?? "uncategorized");
              const assetItem: DrawerAssetItem = {
                ...referenceItem,
                assetGroup: fileType,
                libraryCategory,
              };
              assetMap.set(assetKey, assetItem);
              assetBuckets[fileType].push(assetItem);
            }
            const assetPrompt = String(item?.prompt || "").trim();
            if (assetPrompt) {
              promptMap.set(`asset-prompt-${sourceId}`, {
                id: `asset-prompt-${sourceId}`,
                label: referenceItem.label,
                subtitle: "资产提示词",
                text: assetPrompt,
                previewUrl: referenceItem.url,
                sourceType: "asset",
                libraryCategory: classifyPromptCategory({
                  label: referenceItem.label,
                  subtitle: "资产提示词",
                  text: assetPrompt,
                  sourceType: "asset",
                }),
                sourceRef: createSourceRef("assetPrompt", sourceId, { trackId }),
              });
            }
          }
        });

        if (trackPrompt) {
          const previewUrl =
            (track?.videoList ?? []).find((item: any) => Number(item?.id) === Number(track?.selectVideoId))?.src ||
            mediaReferences.find((item) => item.fileType === "image")?.url ||
            "";
          promptMap.set(`track-prompt-${trackId}`, {
            id: `track-prompt-${trackId}`,
            label: `${trackTitle} 提示词`,
            subtitle: "视频工作流提示词",
            text: trackPrompt,
            previewUrl,
            sourceType: "track",
            libraryCategory: classifyPromptCategory({
              label: `${trackTitle} 提示词`,
              subtitle: "视频工作流提示词",
              text: trackPrompt,
              sourceType: "track",
            }),
            sourceRef: createSourceRef("trackPrompt", trackId, { trackId }),
          });
        }

        const history: DrawerWorkflowHistoryItem[] = (track?.videoList ?? []).map((item: any) => ({
          id: `track-${trackId}-video-${item?.id}`,
          videoId: Number(item?.id),
          url: item?.src || "",
          state: String(item?.state || "未生成"),
          errorReason: item?.errorReason || "",
          createdAt: item?.time ? toTimestamp(item.time) : null,
          selected: Number(track?.selectVideoId) === Number(item?.id),
        }));
        const selectedVideo = history.find((item) => item.selected) || null;
        workflows.push({
          id: `workflow-${trackId}`,
          trackId,
          title: trackTitle,
          subtitle: selectedVideo ? `${selectedVideo.state} · ${history.length} 条结果` : `${String(track?.state || "未生成")} · ${history.length} 条结果`,
          prompt: trackPrompt,
          state: String(track?.state || "未生成"),
          selectedVideo,
          history,
          imageReferences,
          mediaReferences,
          imageCount: imageReferences.length,
          sourceRef: createSourceRef("trackWorkflow", trackId, {
            trackId,
            videoId: selectedVideo?.videoId ?? null,
          }),
        });
      });

      prompts.push(...Array.from(promptMap.values()));
      referenceDrawer.value = {
        assets: assetBuckets,
        prompts,
        workflows,
        storyboards,
      };
      referencePalette.value = [
        ...storyboards.map((item) => item.imageItem),
        ...assetBuckets.image,
        ...assetBuckets.video,
        ...assetBuckets.audio,
      ];
    } catch {
      referenceDrawer.value = createEmptyReferenceDrawer();
      referencePalette.value = [];
    }
  }

  async function loadReferencePalette() {
    await loadReferenceDrawerData();
  }

  async function loadModelOptions() {
    try {
      const [{ data: videoData }, { data: textData }] = await Promise.all([
        axios.post("/modelSelect/getModelList", { type: "video" }),
        axios.post("/modelSelect/getModelList", { type: "text" }),
      ]);
      videoModelOptions.value = videoData ?? [];
      textModelOptions.value = textData ?? [];
    } catch {
      videoModelOptions.value = [];
      textModelOptions.value = [];
    }
  }

  async function getModelDetail(modelId: string) {
    if (!modelId) return null;
    if (modelDetailMap.value[modelId]) return modelDetailMap.value[modelId];
    const { data } = await axios.post("/modelSelect/getModelDetail", { modelId });
    modelDetailMap.value = {
      ...modelDetailMap.value,
      [modelId]: data,
    };
    return data as CanvasV2ModelDetail;
  }

  async function applyWorkflowModel(nodeId: string, modelId: string) {
    const node = graph.value.nodes.find((item) => item.id === nodeId && item.type === "video");
    if (!node) return;
    const detail = await getModelDetail(modelId);
    const data = node.data as VideoNodeDataV2;
    data.model = modelId;
    if (detail?.durationResolutionMap?.[0]?.resolution?.length) {
      data.resolution = detail.durationResolutionMap[0].resolution[0];
    }
    if (detail?.durationResolutionMap?.[0]?.duration?.length) {
      data.duration = detail.durationResolutionMap[0].duration[0];
    }
    if (detail?.mode?.length) {
      data.mode = ensureArrayMode(detail.mode[0]);
    }
    data.audio = detail?.audio === true || detail?.audio === "true" || detail?.audio === "optional";
    queueSave();
  }

  function mergeReturnedGraph(nextGraph: CanvasV2Document) {
    replaceGraph(nextGraph);
    queueSave();
  }

  function createMockPromptText(nodeId: string) {
    const node = graph.value.nodes.find((item) => item.id === nodeId && item.type === "video") as CanvasV2Node<VideoNodeDataV2> | undefined;
    if (!node) return "Mock 提示词";
    const inputs = getWorkflowInputs(nodeId);
    const promptChunks = [
      String(node.data.prompt || "").trim(),
      ...inputs.promptTexts.map((item) => item.text),
      ...inputs.mediaItems.slice(0, 3).map((item) => `${item.label}${item.prompt ? `：${item.prompt}` : ""}`),
    ].filter(Boolean);
    return `【Mock 视频提示词】${promptChunks.join("；")}。镜头节奏稳定，画面层次清晰，适合短视频生成。`;
  }

  function startMockVideoJob(nodeId: string) {
    const node = graph.value.nodes.find((item) => item.id === nodeId && item.type === "video") as CanvasV2Node<VideoNodeDataV2> | undefined;
    if (!node) return null;
    const jobId = ++mockJobSeed;
    const job: MockVideoJob = {
      jobId,
      nodeId,
      prompt: String(node.data.prompt || "").trim(),
      createdAt: Date.now(),
      durationMs: 3600,
      variant: jobId % 2 === 0 ? 1 : 2,
    };
    mockJobs.set(jobId, job);
    node.data.runtime = {
      ...(node.data.runtime || {}),
      status: "queued",
      jobType: "video",
      jobId,
      startedAt: Date.now(),
      finishedAt: null,
      errorMessage: "",
      resultUrl: "",
    };
    queueSave();
    ensurePolling();
    return jobId;
  }

  function runMockNode(nodeId: string, action: CanvasV2WorkflowAction = "generateVideo") {
    const node = graph.value.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (node.type !== "video") return;
    if (action === "generatePrompt") {
      const promptText = createMockPromptText(nodeId);
      updateNodeData(nodeId, {
        prompt: promptText,
        runtime: {
          ...(node.data as VideoNodeDataV2).runtime,
          status: "success",
          jobType: "prompt",
          jobId: null,
          startedAt: Date.now(),
          finishedAt: Date.now(),
          errorMessage: "",
          resultUrl: "",
        },
      } as Partial<VideoNodeDataV2>);
      MessagePlugin.success("Mock 提示词已生成");
      return;
    }
    const currentData = node.data as VideoNodeDataV2;
    if (!String(currentData.prompt || "").trim()) {
      currentData.prompt = createMockPromptText(nodeId);
    }
    startMockVideoJob(nodeId);
    setSelection([nodeId], []);
    MessagePlugin.success("Mock 视频任务已发起");
  }

  function runMockChain(nodeId: string, action: CanvasV2WorkflowAction = "generateVideo") {
    const node = graph.value.nodes.find((item) => item.id === nodeId && item.type === "video") as CanvasV2Node<VideoNodeDataV2> | undefined;
    if (!node) return;
    const inputs = getWorkflowInputs(nodeId);
    if (!node.data.referenceItems.length && inputs.mediaItems.length) {
      node.data.referenceItems = inputs.mediaItems.map((item) => ({
        id: crypto.randomUUID(),
        fileType: item.fileType,
        url: item.url,
        label: item.label,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        prompt: item.prompt,
        createdAt: Date.now(),
        sourceRef: item.sourceRef ? cloneDocument(item.sourceRef) : null,
      }));
    }
    if (!String(node.data.prompt || "").trim() && inputs.promptTexts.length) {
      node.data.prompt = inputs.promptTexts.map((item) => item.text).join("\n");
    }
    runMockNode(nodeId, action);
  }

  async function runNode(nodeId: string, action: CanvasV2WorkflowAction = "generateVideo") {
    const node = graph.value.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    try {
      const { data } = await axios.post("/production/v2/runNode", {
        projectId: projectId.value,
        episodeId: episodeId.value,
        nodeId,
        graphData: graph.value,
        action,
      });
      mergeReturnedGraph(data.graphData);
      if (data.jobId) ensurePolling();
      setSelection([nodeId], []);
      MessagePlugin.success(action === "generatePrompt" ? "提示词已生成" : "任务已发起");
    } catch (err: any) {
      MessagePlugin.error(err?.message || "节点运行失败");
    }
  }

  async function runChain(nodeId: string, action: CanvasV2WorkflowAction = "generateVideo") {
    try {
      const { data } = await axios.post("/production/v2/runChain", {
        projectId: projectId.value,
        episodeId: episodeId.value,
        nodeId,
        graphData: graph.value,
        action,
      });
      mergeReturnedGraph(data.graphData);
      if ((data.executed ?? []).some((item: any) => item.jobId)) {
        ensurePolling();
      }
      setSelection([nodeId], []);
      MessagePlugin.success(action === "generatePrompt" ? "链路提示词已生成" : "链路运行已发起");
    } catch (err: any) {
      MessagePlugin.error(err?.message || "链路运行失败");
    }
  }

  function syncJobStatus(jobs: Array<any>) {
    let changed = false;
    jobs.forEach((job) => {
      const node = graph.value.nodes.find((entry) => entry.id === job.nodeId && entry.type === "video");
      if (!node) return;
      const data = node.data as VideoNodeDataV2;
      data.runtime = {
        ...(data.runtime || {}),
        status: job.status,
        jobType: "video",
        jobId: job.jobId,
        resultUrl: job.resultUrl || "",
        errorMessage: job.errorMessage || "",
        finishedAt: job.finishedAt ?? null,
      };
      if ((job.status === "success" || job.status === "error") && job.resultUrl) {
        const exists = data.videoResults.some((item) => item.url === job.resultUrl);
        if (!exists) {
          const resultId = crypto.randomUUID();
          data.videoResults = [
            {
              id: resultId,
              url: job.resultUrl,
              state: job.status,
              createdAt: Date.now(),
              prompt: data.prompt,
              errorMessage: job.errorMessage || "",
            },
            ...(data.videoResults || []),
          ];
          data.selectedResultId = resultId;
          changed = true;
        }
      }
      if (job.status === "error") {
        changed = true;
      }
    });
    if (changed) {
      queueSave(true);
    }
    ensurePolling();
  }

  async function queryJobs() {
    if (!activeJobs.value.length) {
      stopPolling();
      return;
    }
    if (mockMode.value || isMockPreferenceEnabled()) {
      const now = Date.now();
      const jobs = activeJobs.value.map((job) => {
        const mockJob = mockJobs.get(Number(job.jobId));
        if (!mockJob) {
          return {
            nodeId: job.nodeId,
            jobId: job.jobId,
            status: "error",
            errorMessage: "Mock 任务不存在",
            resultUrl: "",
            finishedAt: now,
          };
        }
        const elapsed = now - mockJob.createdAt;
        const runningThreshold = Math.max(800, Math.round(mockJob.durationMs * 0.35));
        if (elapsed < runningThreshold) {
          return {
            nodeId: job.nodeId,
            jobId: mockJob.jobId,
            status: elapsed < 500 ? "queued" : "running",
            resultUrl: "",
            errorMessage: "",
            finishedAt: null,
          };
        }
        const resultUrl = `${mockJob.variant === 1 ? MOCK_VIDEO_URL : MOCK_VIDEO_ALT_URL}?mockJob=${mockJob.jobId}&t=${mockJob.createdAt}`;
        mockJobs.delete(mockJob.jobId);
        return {
          nodeId: job.nodeId,
          jobId: mockJob.jobId,
          status: "success",
          resultUrl,
          errorMessage: "",
          finishedAt: mockJob.createdAt + mockJob.durationMs,
        };
      });
      syncJobStatus(jobs);
      return;
    }
    try {
      const { data } = await axios.post("/production/v2/queryJob", {
        jobs: activeJobs.value,
      });
      syncJobStatus(data.jobs ?? []);
    } catch {}
  }

  function ensurePolling() {
    if (!activeJobs.value.length) {
      stopPolling();
      return;
    }
    if (pollTimer) return;
    pollTimer = setInterval(() => void queryJobs(), 3000);
  }

  function stopPolling() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  async function hydrate(nextProjectId: number, nextEpisodeId: number, defaults?: { videoModel?: string; videoMode?: string }) {
    projectId.value = nextProjectId;
    episodeId.value = nextEpisodeId;
    projectVideoModel.value = defaults?.videoModel || "";
    projectVideoMode.value = defaults?.videoMode || "text";
    loading.value = true;
    try {
      let nextGraph: CanvasV2Document | null = null;
      try {
        const { data } = await axios.post("/production/v2/get", {
          projectId: nextProjectId,
          episodeId: nextEpisodeId,
        });
        nextGraph = data.graphData;
      } catch (err: any) {
        nextGraph = createEmptyDocument(nextProjectId, nextEpisodeId);
        MessagePlugin.error(err?.message || "V2 画布加载失败");
      }
      await Promise.all([loadReferencePalette(), loadModelOptions()]);
      replaceGraph(nextGraph || createEmptyDocument(nextProjectId, nextEpisodeId), true);
      const nodeSizeAdjusted = normalizeStoredNonMediaNodeSizes();
      const layoutAdjusted = resolveNodeOverlaps();
      if (!graph.value.nodes.length) {
        graph.value.viewport = { x: 120, y: 90, zoom: 1 };
      }
      if (nodeSizeAdjusted || layoutAdjusted) {
        queueSave();
      }
      ensurePolling();
    } finally {
      loading.value = false;
    }
  }

  function findAvailablePosition(position: { x: number; y: number }, size = { width: 320, height: 220 }) {
    let nextX = position.x;
    let nextY = position.y;
    let guard = 0;
    const stepX = Math.max(72, Math.round(size.width * 0.42));
    const stepY = Math.max(72, Math.round(size.height * 0.42));
    while (
      graph.value.nodes.some(
        (node) =>
          rectsOverlap(
            { x: nextX, y: nextY, width: size.width, height: size.height },
            { x: node.position.x, y: node.position.y, width: node.size.width, height: node.size.height },
          ),
      ) &&
      guard < 60
    ) {
      nextX += stepX;
      nextY += stepY;
      guard += 1;
    }
    return { x: nextX, y: nextY };
  }

  function resolveNodeOverlaps() {
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
    let changed = false;
    graph.value.nodes.forEach((node) => {
      let nextX = node.position.x;
      let nextY = node.position.y;
      let guard = 0;
      const stepX = Math.max(72, Math.round(node.size.width * 0.42));
      const stepY = Math.max(72, Math.round(node.size.height * 0.42));
      while (
        occupied.some((point) =>
          rectsOverlap(
            { x: nextX, y: nextY, width: node.size.width, height: node.size.height },
            point,
          ),
        ) &&
        guard < 80
      ) {
        nextX += stepX;
        nextY += stepY;
        guard += 1;
      }
      if (nextX !== node.position.x || nextY !== node.position.y) {
        node.position = {
          x: Math.round(nextX),
          y: Math.round(nextY),
        };
        changed = true;
      }
      occupied.push({
        x: node.position.x,
        y: node.position.y,
        width: node.size.width,
        height: node.size.height,
      });
    });
    return changed;
  }

  function normalizeStoredNonMediaNodeSizes() {
    let changed = false;
    graph.value.nodes.forEach((node) => {
      if (isVisualNodeType(node.type)) return;
      const nextSize = getNormalizedNonMediaNodeSize();
      if (node.size.width === nextSize.width && node.size.height === nextSize.height) return;
      node.size = { ...nextSize };
      changed = true;
    });
    return changed;
  }

  return {
    projectId,
    episodeId,
    graph,
    nodes,
    edges,
    canUndo,
    canRedo,
    hasClipboard,
    hasSelection,
    loading,
    saving,
    selectedNodeIds,
    selectedEdgeIds,
    selectedNodes,
    selectedEdges,
    activeNode,
    activeJobs,
    referencePalette,
    referenceDrawer,
    videoModelOptions,
    textModelOptions,
    modelDetailMap,
    expandedNodeId,
    hydrate,
    captureHistory,
    setViewport,
    addNode,
    updateNodeData,
    updateNodeSize,
    updateNodePosition,
    moveNodes,
    setSelection,
    clearSelection,
    selectAllNodes,
    toggleNodeSelection,
    selectEdge,
    getIncomingEdges,
    getIncomingNodes,
    getWorkflowInputs,
    connectNodes,
    removeEdge,
    deleteSelection,
    copySelection,
    pasteClipboard,
    duplicateNodes,
    duplicateSelection,
    undo,
    redo,
    queueSave,
    uploadMedia,
    loadReferenceDrawerData,
    createMediaNodeFromPaletteItem,
    createPromptNodeFromDrawerItem,
    createVideoNodeFromWorkflowItem,
    createWorkflowBundleFromDrawerItem,
    addReferenceToWorkflow,
    getModelDetail,
    applyWorkflowModel,
    runNode,
    runChain,
    queryJobs,
    ensurePolling,
    stopPolling,
    openExpandedNode,
    closeExpandedNode,
  };
});
