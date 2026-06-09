export type CanvasV2NodeType = "media" | "prompt" | "loop" | "video";
export type CanvasV2EdgeKind = "media" | "prompt" | "loop";
export type CanvasV2RuntimeStatus = "idle" | "queued" | "running" | "success" | "error" | "stopped";
export type CanvasV2FileType = "image" | "video" | "audio";
export type CanvasV2MediaSourceType = "upload" | "assets" | "storyboard" | "videoResult";
export type CanvasV2WorkflowAction = "generatePrompt" | "generateVideo";
export type CanvasV2DrawerSectionKey = "assets" | "prompts" | "workflows" | "storyboards";
export type CanvasV2SourceKind = "upload" | "asset" | "storyboard" | "trackPrompt" | "assetPrompt" | "storyboardPrompt" | "trackVideo" | "trackWorkflow";
export type DrawerAssetCategoryKey = "role" | "tool" | "scene" | "clip" | "audio" | "uncategorized";
export type DrawerPromptCategoryKey = "character" | "composition" | "camera" | "style" | "lighting" | "other";
export type DrawerPromptSourceType = "track" | "asset" | "storyboard";
export type DrawerWorkflowSecondaryKey = "overview" | "references" | "history";
export type DrawerStoryboardSecondaryKey = "frames" | "copy";

export interface CanvasV2Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasV2Runtime {
  status: CanvasV2RuntimeStatus;
  jobType?: "prompt" | "video" | null;
  jobId?: number | string | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  elapsedMs?: number | null;
  errorMessage?: string;
  resultUrl?: string;
}

export interface CanvasSourceRef {
  sourceKind: CanvasV2SourceKind;
  sourceId: number | string;
  projectId: number;
  episodeId: number;
  trackId?: number | null;
  videoId?: number | null;
  snapshotAt: number;
}

export interface CanvasV2MediaItem {
  id: string;
  fileType: CanvasV2FileType;
  url: string;
  label: string;
  sourceType: CanvasV2MediaSourceType;
  sourceId?: number | null;
  prompt?: string;
  createdAt?: number;
  sourceRef?: CanvasSourceRef | null;
  width?: number | null;
  height?: number | null;
}

export interface CanvasV2VideoResult {
  id: string;
  url: string;
  state: CanvasV2RuntimeStatus;
  createdAt: number;
  prompt?: string;
  errorMessage?: string;
  sourceRef?: CanvasSourceRef | null;
}

export interface MediaNodeDataV2 {
  title: string;
  items: CanvasV2MediaItem[];
  note: string;
  sourceRef?: CanvasSourceRef | null;
}

export interface PromptNodeDataV2 {
  title: string;
  rawPrompt: string;
  resolvedPrompt: string;
  rewriteEnabled: boolean;
  llmProvider: string;
  llmModel: string;
  systemPrompt: string;
  rewriteInstruction: string;
  runtime: CanvasV2Runtime;
  sourceRef?: CanvasSourceRef | null;
}

export interface LoopNodeDataV2 {
  title: string;
  enableImageInput: boolean;
  enablePromptInput: boolean;
  count: number;
  startIndex: number;
  executionMode: "serial" | "parallel";
  takeCount: number;
  prompts: string[];
}

export interface VideoNodeDataV2 {
  title: string;
  model: string;
  mode: string;
  resolution: string;
  duration: number;
  audio: boolean;
  prompt: string;
  referenceItems: CanvasV2MediaItem[];
  runtime: CanvasV2Runtime;
  videoResults: CanvasV2VideoResult[];
  selectedResultId: string;
  sourceRef?: CanvasSourceRef | null;
  workflowSnapshot?: WorkflowBundleSnapshot | null;
}

export type VideoWorkflowNodeDataV2 = VideoNodeDataV2;

export type CanvasV2NodeData = MediaNodeDataV2 | PromptNodeDataV2 | LoopNodeDataV2 | VideoNodeDataV2;

export interface CanvasV2Node<T = CanvasV2NodeData> {
  id: string;
  type: CanvasV2NodeType;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  data: T;
}

export interface CanvasV2Edge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  kind: CanvasV2EdgeKind;
}

export interface CanvasV2Document {
  viewport: CanvasV2Viewport;
  nodes: CanvasV2Node[];
  edges: CanvasV2Edge[];
  meta: Record<string, any>;
}

export interface CanvasV2SelectionState {
  nodeIds: string[];
  edgeIds: string[];
}

export interface CanvasV2Clipboard {
  nodes: CanvasV2Node[];
  edges: CanvasV2Edge[];
}

export interface CanvasV2ReferencePaletteItem {
  id: string;
  sourceType: "assets" | "storyboard";
  sourceId: number;
  fileType: CanvasV2FileType;
  label: string;
  subtitle: string;
  url: string;
  prompt?: string;
  sourceRef?: CanvasSourceRef | null;
}

export interface DrawerSection {
  key: CanvasV2DrawerSectionKey;
  label: string;
  count: number;
}

export interface DrawerAssetItem extends CanvasV2ReferencePaletteItem {
  assetGroup: CanvasV2FileType;
  libraryCategory: DrawerAssetCategoryKey;
}

export interface DrawerPromptItem {
  id: string;
  label: string;
  subtitle: string;
  text: string;
  previewUrl?: string;
  sourceType: DrawerPromptSourceType;
  libraryCategory: DrawerPromptCategoryKey;
  sourceRef: CanvasSourceRef;
}

export interface DrawerWorkflowHistoryItem {
  id: string;
  videoId: number;
  url: string;
  label?: string;
  state: string;
  errorReason?: string | null;
  createdAt?: number | null;
  selected: boolean;
}

export interface WorkflowBundleSnapshot {
  trackId: number;
  title: string;
  prompt: string;
  state: string;
  selectedVideoId?: number | null;
  selectedVideoUrl?: string;
  imageReferences: Array<{
    sourceId: number;
    sourceType: "assets" | "storyboard";
    label: string;
    url: string;
  }>;
}

export interface DrawerWorkflowItem {
  id: string;
  trackId: number;
  title: string;
  subtitle: string;
  prompt: string;
  state: string;
  selectedVideo: DrawerWorkflowHistoryItem | null;
  history: DrawerWorkflowHistoryItem[];
  imageReferences: CanvasV2ReferencePaletteItem[];
  mediaReferences: CanvasV2ReferencePaletteItem[];
  imageCount: number;
  sourceRef: CanvasSourceRef;
}

export interface DrawerStoryboardItem {
  id: string;
  label: string;
  subtitle: string;
  imageItem: CanvasV2ReferencePaletteItem;
  promptText?: string;
  promptSourceRef?: CanvasSourceRef | null;
}

export interface CanvasV2ReferenceDrawerData {
  assets: {
    image: DrawerAssetItem[];
    video: DrawerAssetItem[];
    audio: DrawerAssetItem[];
  };
  prompts: DrawerPromptItem[];
  workflows: DrawerWorkflowItem[];
  storyboards: DrawerStoryboardItem[];
}

export interface DrawerSecondaryTab {
  key: string;
  label: string;
  count: number;
}

export interface DrawerLibraryState {
  keyword: string;
  secondaryKey: string;
  selectedItemId: string;
}

export interface DrawerListItemViewModel {
  id: string;
  title: string;
  subtitle: string;
  summary?: string;
  badge?: string;
  previewUrl?: string;
  previewKind?: CanvasV2FileType | "text";
  meta?: string[];
  tags?: string[];
}

export interface CanvasV2ModelOption {
  id: string;
  label: string;
  value: string;
  name: string;
  type: string;
}

export interface CanvasV2ModelDetail {
  name?: string;
  modelName?: string;
  durationResolutionMap?: Array<{
    duration?: number[];
    resolution?: string[];
  }>;
  audio?: boolean | "true" | "false" | "optional";
  mode?: Array<string | string[]>;
  type?: string;
}
