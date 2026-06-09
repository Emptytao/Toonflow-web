import type { CanvasV2NodeType } from "../types";

export const NON_MEDIA_NODE_RATIO = 16 / 9;
export const SMALL_POPUP_RATIO = 21 / 9;
export const EXPANDED_DIALOG_RATIO = 16 / 9;

export const DEFAULT_NON_MEDIA_NODE_SIZE = {
  width: 320,
  height: 180,
};

export const DEFAULT_VISUAL_NODE_SIZE = {
  width: 320,
  height: 180,
};

const VISUAL_NODE_BOUNDS = {
  minWidth: 120,
  minHeight: 96,
  maxWidth: 360,
  maxHeight: 320,
};

export function isVisualNodeType(type: CanvasV2NodeType) {
  return type === "media" || type === "video";
}

export function getCanvasNodeDefaultSize(type: CanvasV2NodeType) {
  if (isVisualNodeType(type)) {
    return { ...DEFAULT_VISUAL_NODE_SIZE };
  }
  return { ...DEFAULT_NON_MEDIA_NODE_SIZE };
}

export function getNormalizedNonMediaNodeSize() {
  return { ...DEFAULT_NON_MEDIA_NODE_SIZE };
}

export function getVisualNodeSizeFromSource(width?: number, height?: number) {
  const safeWidth = Number(width || 0);
  const safeHeight = Number(height || 0);
  if (!safeWidth || !safeHeight) {
    return { ...DEFAULT_VISUAL_NODE_SIZE };
  }

  const aspect = safeWidth / safeHeight;
  let nextWidth = safeWidth;
  let nextHeight = safeHeight;

  const shrinkScale = Math.min(
    VISUAL_NODE_BOUNDS.maxWidth / nextWidth,
    VISUAL_NODE_BOUNDS.maxHeight / nextHeight,
    1,
  );
  nextWidth *= shrinkScale;
  nextHeight *= shrinkScale;

  if (nextWidth < VISUAL_NODE_BOUNDS.minWidth) {
    nextWidth = VISUAL_NODE_BOUNDS.minWidth;
    nextHeight = nextWidth / aspect;
  }
  if (nextHeight < VISUAL_NODE_BOUNDS.minHeight) {
    nextHeight = VISUAL_NODE_BOUNDS.minHeight;
    nextWidth = nextHeight * aspect;
  }
  if (nextWidth > VISUAL_NODE_BOUNDS.maxWidth) {
    nextWidth = VISUAL_NODE_BOUNDS.maxWidth;
    nextHeight = nextWidth / aspect;
  }
  if (nextHeight > VISUAL_NODE_BOUNDS.maxHeight) {
    nextHeight = VISUAL_NODE_BOUNDS.maxHeight;
    nextWidth = nextHeight * aspect;
  }

  return {
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
  };
}

export function fitAspectRatioToBounds(
  aspectRatio: number,
  maxWidth: number,
  maxHeight: number,
  minWidth = 0,
  minHeight = 0,
) {
  const safeRatio = aspectRatio > 0 ? aspectRatio : 1;
  const safeMaxWidth = Math.max(1, maxWidth);
  const safeMaxHeight = Math.max(1, maxHeight);

  let width = safeMaxWidth;
  let height = width / safeRatio;

  if (height > safeMaxHeight) {
    height = safeMaxHeight;
    width = height * safeRatio;
  }

  if (width < minWidth) {
    width = minWidth;
    height = width / safeRatio;
  }

  if (height < minHeight) {
    height = minHeight;
    width = height * safeRatio;
  }

  if (width > safeMaxWidth) {
    width = safeMaxWidth;
    height = width / safeRatio;
  }

  if (height > safeMaxHeight) {
    height = safeMaxHeight;
    width = height * safeRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
