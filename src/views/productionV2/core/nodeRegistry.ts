import { v4 as uuidv4 } from "uuid";
import type {
  CanvasV2Node,
  CanvasV2NodeType,
  CanvasV2Runtime,
  LoopNodeDataV2,
  MediaNodeDataV2,
  PromptNodeDataV2,
  VideoNodeDataV2,
} from "../types";
import { getCanvasNodeDefaultSize } from "./layout";

const IDLE_RUNTIME: CanvasV2Runtime = {
  status: "idle",
  jobType: null,
  jobId: null,
  startedAt: null,
  finishedAt: null,
  elapsedMs: null,
  errorMessage: "",
  resultUrl: "",
};

export function createNodeData(type: CanvasV2NodeType) {
  if (type === "media") {
    const data: MediaNodeDataV2 = {
      title: "图片节点",
      items: [],
      note: "",
    };
    return data;
  }
  if (type === "prompt") {
    const data: PromptNodeDataV2 = {
      title: "文本节点",
      rawPrompt: "",
      resolvedPrompt: "",
      rewriteEnabled: false,
      llmProvider: "",
      llmModel: "",
      systemPrompt: "",
      rewriteInstruction: "",
      runtime: { ...IDLE_RUNTIME },
    };
    return data;
  }
  if (type === "loop") {
    const data: LoopNodeDataV2 = {
      title: "Loop",
      enableImageInput: true,
      enablePromptInput: true,
      count: 3,
      startIndex: 1,
      executionMode: "serial",
      takeCount: 1,
      prompts: [""],
    };
    return data;
  }
  const data: VideoNodeDataV2 = {
    title: "视频节点",
    model: "",
    mode: "text",
    resolution: "720p",
    duration: 5,
    audio: false,
    prompt: "",
    referenceItems: [],
    runtime: { ...IDLE_RUNTIME },
    videoResults: [],
    selectedResultId: "",
  };
  return data;
}

export function getDefaultNodeSize(type: CanvasV2NodeType) {
  return getCanvasNodeDefaultSize(type);
}

export function createNode(type: CanvasV2NodeType, position: { x: number; y: number }): CanvasV2Node {
  return {
    id: uuidv4(),
    type,
    position: { x: position.x, y: position.y },
    size: getDefaultNodeSize(type),
    data: createNodeData(type) as any,
  };
}

export function getNodeTypeLabel(type: CanvasV2NodeType) {
  if (type === "media") return "图片节点";
  if (type === "prompt") return "文本节点";
  if (type === "loop") return "Loop";
  return "视频节点";
}
