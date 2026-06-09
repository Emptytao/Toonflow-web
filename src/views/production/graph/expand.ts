import type { GraphNodeType } from "./types";

const NODE_TITLE_MAP: Record<GraphNodeType, string> = {
  script: "剧本节点",
  scriptPlan: "导演计划节点",
  assets: "素材节点",
  storyboardTable: "分镜表节点",
  storyboard: "分镜节点",
  workbench: "工作台节点",
  media: "媒体节点",
  prompt: "提示词节点",
  loop: "循环节点",
  imageGroup: "图片组节点",
};

const NODE_DIALOG_WIDTH_MAP: Record<GraphNodeType, string> = {
  script: "92vw",
  scriptPlan: "92vw",
  assets: "88vw",
  storyboardTable: "92vw",
  storyboard: "92vw",
  workbench: "88vw",
  media: "78vw",
  prompt: "72vw",
  loop: "72vw",
  imageGroup: "78vw",
};

export function getExpandedNodeTitle(nodeType: GraphNodeType): string {
  return NODE_TITLE_MAP[nodeType];
}

export function getExpandedNodeDialogWidth(nodeType: GraphNodeType): string {
  return NODE_DIALOG_WIDTH_MAP[nodeType];
}
