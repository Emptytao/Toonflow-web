import type { CanvasV2Node, CanvasV2Viewport } from "../types";

export function clampZoom(zoom: number) {
  return Math.min(2.4, Math.max(0.18, zoom));
}

export function worldToScreen(point: { x: number; y: number }, viewport: CanvasV2Viewport) {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

export function screenToWorld(point: { x: number; y: number }, viewport: CanvasV2Viewport) {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

export function zoomAtPoint(
  viewport: CanvasV2Viewport,
  point: { x: number; y: number },
  nextZoom: number,
) {
  const clampedZoom = clampZoom(nextZoom);
  const worldPoint = screenToWorld(point, viewport);
  return {
    x: point.x - worldPoint.x * clampedZoom,
    y: point.y - worldPoint.y * clampedZoom,
    zoom: clampedZoom,
  };
}

export function getNodeRect(node: CanvasV2Node) {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.size.width,
    height: node.size.height,
  };
}

export function rectsIntersect(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function getPortWorldPoint(node: CanvasV2Node, port: string) {
  const { x, y } = node.position;
  const { width, height } = node.size;
  if (port === "out" || port === "mediaOut" || port === "promptOut" || port === "loopOut") {
    return { x: x + width, y: y + height / 2 };
  }
  if (port === "promptIn") {
    return { x, y: y + Math.max(32, height * 0.38) };
  }
  if (port === "mediaIn") {
    return { x, y: y + Math.max(48, height * 0.62) };
  }
  if (port === "loopIn") {
    return { x, y: y + Math.max(height - 74, height * 0.72) };
  }
  return { x, y: y + height / 2 };
}

export function buildBezierPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = Math.max(56, Math.abs(end.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
}

export function getBezierPoint(start: { x: number; y: number }, end: { x: number; y: number }, t = 0.5) {
  const dx = Math.max(56, Math.abs(end.x - start.x) * 0.45);
  const cp1 = { x: start.x + dx, y: start.y };
  const cp2 = { x: end.x - dx, y: end.y };
  const mt = 1 - t;
  return {
    x: mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x,
    y: mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y,
  };
}
