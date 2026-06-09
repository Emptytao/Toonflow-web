import type { Edge, Node, XYPosition } from "@vue-flow/core";
import { v4 as uuidv4 } from "uuid";

export type GraphNodeType =
  | "script"
  | "scriptPlan"
  | "assets"
  | "storyboardTable"
  | "storyboard"
  | "workbench"
  | "media"
  | "prompt"
  | "loop"
  | "imageGroup";

export type GraphEdgeChannel = "legacy" | "image" | "prompt" | "loop";
export type GraphRuntimeStatus = "idle" | "queued" | "running" | "success" | "error" | "stopped";

export interface NodeRuntime {
  status: GraphRuntimeStatus;
  jobId?: string | number | null;
  jobType?: "image" | "video" | "prompt" | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  elapsedMs?: number | null;
  errorMessage?: string;
  resultUrl?: string;
}

export interface LegacyProductionNodeData {
  label: string;
  handleIds: Record<string, string>;
  runtime: NodeRuntime;
}

export interface GraphMediaItem {
  id: string;
  fileType: "image" | "video" | "audio";
  url: string;
  label?: string;
  prompt?: string;
  sourceNodeId?: string;
  createdAt?: number;
}

export interface GraphMediaGroup {
  id: string;
  label: string;
  items: GraphMediaItem[];
  createdAt: number;
}

export interface MediaNodeData extends LegacyProductionNodeData {
  mode: "image" | "video";
  prompt: string;
  draftPrompt: string;
  items: GraphMediaItem[];
  historyGroups: GraphMediaGroup[];
  selectedGroupId: string;
  selectedItemId: string;
  params: {
    model: string;
    ratio: string;
    quality: string;
    resolution: string;
    duration: number;
    count: number;
    audio: boolean;
    mode: string | string[];
  };
  composer: {
    upstreamImageOrder: string[];
    draftSavedAt: number | null;
  };
}

export interface PromptNodeData extends LegacyProductionNodeData {
  rawPrompt: string;
  resolvedPrompt: string;
  systemPrompt: string;
  rewriteInstruction: string;
  rewriteEnabled: boolean;
  llmProvider: string;
  llmModel: string;
}

export interface LoopNodeData extends LegacyProductionNodeData {
  enableImageInput: boolean;
  enablePromptInput: boolean;
  count: number;
  startIndex: number;
  mode: "serial" | "parallel";
  takeCount: number;
  prompts: string[];
}

export interface ImageGroupNodeData extends LegacyProductionNodeData {
  items: GraphMediaItem[];
}

export type ProductionGraphNodeData =
  | LegacyProductionNodeData
  | MediaNodeData
  | PromptNodeData
  | LoopNodeData
  | ImageGroupNodeData;

export type ProductionNode = Node<ProductionGraphNodeData, any, GraphNodeType> & {
  selected?: boolean;
};
export type ProductionEdge = Edge<{ channel?: GraphEdgeChannel }, any, string> & {
  selected?: boolean;
};

export interface GraphDocument {
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  nodes: ProductionNode[];
  edges: ProductionEdge[];
  meta: Record<string, any>;
}

export interface PromptResource {
  id: string;
  projectId: number;
  name: string;
  category?: string;
  content: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

export const LEGACY_NODE_LAYOUT = [
  { id: "script", type: "script", position: { x: 0, y: 0 }, width: 520, height: 360 },
  { id: "scriptPlan", type: "scriptPlan", position: { x: 920, y: 0 }, width: 420, height: 320 },
  { id: "assets", type: "assets", position: { x: 1180, y: 860 }, width: 560, height: 520 },
  { id: "storyboardTable", type: "storyboardTable", position: { x: 1760, y: 0 }, width: 520, height: 360 },
  { id: "storyboard", type: "storyboard", position: { x: 2580, y: 0 }, width: 760, height: 520 },
  { id: "workbench", type: "workbench", position: { x: 3480, y: 0 }, width: 720, height: 420 },
] as const;

export const DEFAULT_VIEWPORT = {
  x: 80,
  y: 80,
  zoom: 0.85,
};

export function createRuntime(runtime?: Partial<NodeRuntime>): NodeRuntime {
  return {
    status: runtime?.status ?? "idle",
    jobId: runtime?.jobId ?? null,
    jobType: runtime?.jobType ?? null,
    startedAt: runtime?.startedAt ?? null,
    finishedAt: runtime?.finishedAt ?? null,
    elapsedMs: runtime?.elapsedMs ?? null,
    errorMessage: runtime?.errorMessage ?? "",
    resultUrl: runtime?.resultUrl ?? "",
  };
}

export function createHandleIds(nodeId: string, nodeType: GraphNodeType): Record<string, string> {
  switch (nodeType) {
    case "script":
      return {
        assets: `${nodeId}-assets`,
        source: `${nodeId}-source`,
      };
    case "scriptPlan":
    case "storyboardTable":
    case "storyboard":
    case "workbench":
      return {
        target: `${nodeId}-target`,
        source: `${nodeId}-source`,
      };
    case "assets":
      return {
        target: `${nodeId}-target`,
      };
    case "prompt":
      return {
        source: `${nodeId}-prompt-source`,
      };
    case "loop":
      return {
        source: `${nodeId}-loop-source`,
      };
    case "imageGroup":
      return {
        target: `${nodeId}-target`,
        source: `${nodeId}-image-source`,
      };
    case "media":
      return {
        prompt: `${nodeId}-prompt-target`,
        image: `${nodeId}-image-target`,
        loop: `${nodeId}-loop-target`,
        source: `${nodeId}-image-source`,
      };
    default:
      return {};
  }
}

function createLegacyData(nodeId: string, nodeType: GraphNodeType, label?: string): LegacyProductionNodeData {
  return {
    label: label ?? nodeType,
    handleIds: createHandleIds(nodeId, nodeType),
    runtime: createRuntime(),
  };
}

export function createDefaultNodeData(nodeId: string, nodeType: GraphNodeType): ProductionGraphNodeData {
  switch (nodeType) {
    case "media":
      return {
        ...createLegacyData(nodeId, nodeType, "媒体节点"),
        mode: "image",
        prompt: "",
        draftPrompt: "",
        items: [],
        historyGroups: [],
        selectedGroupId: "",
        selectedItemId: "",
        params: {
          model: "",
          ratio: "16:9",
          quality: "1K",
          resolution: "720p",
          duration: 5,
          count: 1,
          audio: false,
          mode: "text",
        },
        composer: {
          upstreamImageOrder: [],
          draftSavedAt: null,
        },
      };
    case "prompt":
      return {
        ...createLegacyData(nodeId, nodeType, "提示词节点"),
        rawPrompt: "",
        resolvedPrompt: "",
        systemPrompt: "",
        rewriteInstruction: "",
        rewriteEnabled: false,
        llmProvider: "",
        llmModel: "",
      };
    case "loop":
      return {
        ...createLegacyData(nodeId, nodeType, "循环节点"),
        enableImageInput: true,
        enablePromptInput: true,
        count: 1,
        startIndex: 1,
        mode: "serial",
        takeCount: 1,
        prompts: [""],
      };
    case "imageGroup":
      return {
        ...createLegacyData(nodeId, nodeType, "图片组"),
        items: [],
      };
    default:
      return createLegacyData(nodeId, nodeType);
  }
}

export function createGraphNode(nodeType: GraphNodeType, position: XYPosition, overrides: Partial<ProductionNode> = {}): ProductionNode {
  const id = overrides.id ?? uuidv4();
  const baseNode: ProductionNode = {
    id,
    type: nodeType,
    position,
    width: overrides.width,
    height: overrides.height,
    dragHandle: ".dragHandle",
    data: createDefaultNodeData(id, nodeType),
  };
  return {
    ...baseNode,
    ...overrides,
    data: {
      ...(baseNode.data as Record<string, any>),
      ...((overrides.data as Record<string, any>) ?? {}),
      handleIds: createHandleIds(id, nodeType),
    } as ProductionGraphNodeData,
  };
}

export function inferEdgeChannel(sourceType?: GraphNodeType): GraphEdgeChannel {
  if (sourceType === "prompt") return "prompt";
  if (sourceType === "loop") return "loop";
  if (sourceType === "media" || sourceType === "imageGroup" || sourceType === "assets" || sourceType === "storyboard") return "image";
  return "legacy";
}

export function createGraphEdge(source: ProductionNode, target: ProductionNode, partial: Partial<ProductionEdge> = {}): ProductionEdge {
  const channel = inferEdgeChannel(source.type);
  const sourceHandle =
    partial.sourceHandle ??
    (channel === "prompt"
      ? (source.data as PromptNodeData).handleIds.source
      : channel === "loop"
        ? (source.data as LoopNodeData).handleIds.source
        : (source.data as LegacyProductionNodeData).handleIds.source);
  const targetHandle =
    partial.targetHandle ??
    (target.type === "media"
      ? channel === "prompt"
        ? (target.data as MediaNodeData).handleIds.prompt
        : channel === "loop"
          ? (target.data as MediaNodeData).handleIds.loop
          : (target.data as MediaNodeData).handleIds.image
      : (target.data as LegacyProductionNodeData).handleIds.target);

  return {
    id: partial.id ?? `${source.id}-${target.id}-${channel}-${uuidv4()}`,
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    data: {
      channel,
      ...(partial.data ?? {}),
    },
    ...partial,
  };
}

export function createDefaultGraphDocument(projectId: number, episodeId: number): GraphDocument {
  return {
    viewport: { ...DEFAULT_VIEWPORT },
    nodes: LEGACY_NODE_LAYOUT.map((item) =>
      createGraphNode(item.type, item.position, {
        id: item.id,
        width: item.width,
        height: item.height,
      }),
    ),
    edges: [],
    meta: {
      graphId: `${projectId}-${episodeId}`,
      projectId,
      episodeId,
    },
  };
}

export function cloneGraphDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function sanitizeGraphDocumentForSave(document: GraphDocument): GraphDocument {
  return {
    viewport: { ...document.viewport },
    meta: { ...document.meta },
    nodes: document.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      width: typeof node.width === "number" ? node.width : undefined,
      height: typeof node.height === "number" ? node.height : undefined,
      dragHandle: node.dragHandle,
      data: cloneGraphDocument(node.data),
      sourcePosition: node.sourcePosition,
      targetPosition: node.targetPosition,
      hidden: node.hidden,
      zIndex: node.zIndex,
    })),
    edges: document.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      data: cloneGraphDocument(edge.data ?? {}),
      label: edge.label,
      animated: edge.animated,
      style: edge.style,
      markerEnd: edge.markerEnd,
      markerStart: edge.markerStart,
    })),
  };
}

export function getNodeOutputItems(node?: ProductionNode): GraphMediaItem[] {
  if (!node) return [];
  if (node.type === "imageGroup") {
    return ((node.data as ImageGroupNodeData).items ?? []).filter((item) => item.url);
  }
  if (node.type !== "media") return [];
  const mediaData = node.data as MediaNodeData;
  const currentGroup = mediaData.historyGroups.find((group) => group.id === mediaData.selectedGroupId);
  if (currentGroup?.items?.length) {
    return currentGroup.items.filter((item) => item.url);
  }
  return (mediaData.items ?? []).filter((item) => item.url);
}
