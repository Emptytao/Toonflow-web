<template>
  <CanvasNodeShell
    v-if="dialogMode"
    :title="data.title || 'Media'"
    badge="Media"
    :selected="selected"
    :dialog-mode="dialogMode"
    @expand="$emit('expand')"
    @delete="$emit('delete')">
    <div class="media-node dialog-media-node">
      <t-textarea
        :value="data.note"
        :autosize="{ minRows: 4, maxRows: 8 }"
        placeholder="记录该素材节点的说明、标签或用途"
        @update:modelValue="(value) => store.updateNodeData(node.id, { note: value })" />
      <div class="media-grid">
        <div v-for="item in data.items" :key="item.id" class="media-item">
          <img v-if="item.fileType === 'image'" :src="item.url" :alt="item.label" />
          <video v-else-if="item.fileType === 'video'" :src="item.url" muted playsinline controls />
          <div v-else class="audio-card">AUDIO</div>
          <div class="media-meta">
            <span class="media-name">{{ item.label }}</span>
            <span class="media-type">{{ item.fileType.toUpperCase() }}</span>
          </div>
        </div>
        <div v-if="!data.items.length" class="empty-card">拖入本地图片/视频/音频，或从左侧引用资料创建素材节点</div>
      </div>
    </div>
  </CanvasNodeShell>

  <div v-else class="media-node canvas-media-node" :class="{ selected }">
    <div v-if="primaryItem" class="canvas-media-stage">
      <div class="canvas-media-frame">
        <div class="canvas-media-kind-label">{{ displayKindLabel }}</div>
        <div class="canvas-media-file-label" :title="displayFileLabel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5a2 2 0 0 1 2-2h8.6a2 2 0 0 1 1.4.58l2.42 2.42A2 2 0 0 1 19 7.42V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm2 0v14h11V8h-3a2 2 0 0 1-2-2V5H6Zm8 .4V6h.6l-.6-.6ZM8 15l1.9-2.29a1 1 0 0 1 1.54 0L13 14.57l1.1-1.33a1 1 0 0 1 1.54 0L17 15H8Z" />
          </svg>
          <span>{{ displayFileLabel }}</span>
        </div>
        <div v-if="displayResolution" class="canvas-media-resolution">{{ displayResolution }}</div>
        <div class="media-preview-trigger" @dragstart.prevent>
          <img v-if="primaryItem.fileType === 'image'" :src="primaryItem.url" :alt="primaryItem.label" class="canvas-media-image" draggable="false" />
          <video v-else-if="primaryItem.fileType === 'video'" :src="primaryItem.url" class="canvas-media-video" muted playsinline draggable="false" />
          <div v-else class="canvas-audio-card">AUDIO</div>
        </div>
      </div>
    </div>
    <div v-else class="empty-card canvas-empty-card">拖入本地图片/视频/音频，或从左侧引用资料创建素材节点</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CanvasNodeShell from "./CanvasNodeShell.vue";
import storeFactory from "@/stores/productionCanvasV2";
import { DEFAULT_VISUAL_NODE_SIZE, getVisualNodeSizeFromSource } from "../core/layout";
import type { CanvasV2Node, MediaNodeDataV2 } from "../types";

defineEmits<{
  expand: [];
  delete: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<MediaNodeDataV2>;
  data: MediaNodeDataV2;
  selected?: boolean;
  dialogMode?: boolean;
}>();

const store = storeFactory();

const primaryItem = computed(() => props.data.items[0] || null);
const displayFileLabel = computed(() => primaryItem.value?.label || props.data.title || "Media");
const displayKindLabel = computed(() => {
  if (primaryItem.value?.fileType === "video") return "视频节点";
  if (primaryItem.value?.fileType === "audio") return "音频节点";
  return "图片节点";
});
const displayResolution = ref("");

function syncNodeSize(width?: number, height?: number) {
  const nextSize = getVisualNodeSizeFromSource(width, height);
  if (Math.abs(props.node.size.width - nextSize.width) < 2 && Math.abs(props.node.size.height - nextSize.height) < 2) return;
  store.updateNodeSize(props.node.id, nextSize);
}

watch(
  primaryItem,
  (item) => {
    displayResolution.value = "";
    if (!item?.url) {
      syncNodeSize(DEFAULT_VISUAL_NODE_SIZE.width, DEFAULT_VISUAL_NODE_SIZE.height);
      return;
    }
    if (item.fileType === "audio") {
      syncNodeSize(DEFAULT_VISUAL_NODE_SIZE.width, DEFAULT_VISUAL_NODE_SIZE.height);
      return;
    }
    if (item.fileType === "image") {
      const image = new Image();
      image.onload = () => {
        displayResolution.value = `${image.naturalWidth} × ${image.naturalHeight}`;
        syncNodeSize(image.naturalWidth, image.naturalHeight);
      };
      image.src = item.url;
      return;
    }
    if (item.fileType === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        displayResolution.value = `${video.videoWidth} × ${video.videoHeight}`;
        syncNodeSize(video.videoWidth, video.videoHeight);
      };
      video.src = item.url;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.media-node {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dialog-media-node {
  gap: 10px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 10px;
}

.media-item {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.media-item img,
.media-item video {
  width: 100%;
  height: 92px;
  object-fit: cover;
  display: block;
}

.audio-card {
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e2e8f0, #f8fafc);
  color: #334155;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.media-meta {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.media-name {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  word-break: break-all;
}

.media-type {
  font-size: 11px;
  color: #64748b;
}

.empty-card {
  min-height: 92px;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  color: #64748b;
  background: rgba(248, 250, 252, 0.82);
}

.canvas-media-node {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.canvas-media-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.canvas-media-frame {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.media-preview-trigger {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: default;
  overflow: visible;
}

.canvas-media-image,
.canvas-media-video,
.canvas-audio-card {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  border: 0;
}

.canvas-media-image,
.canvas-media-video {
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.08));
}

.canvas-audio-card {
  min-width: 120px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.88), rgba(248, 250, 252, 0.96));
  color: #334155;
  font-weight: 800;
  letter-spacing: 0.16em;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.12);
}

.canvas-media-kind-label,
.canvas-media-file-label,
.canvas-media-resolution {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.78);
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.canvas-media-kind-label {
  top: -36px;
  left: 0;
  letter-spacing: 0.04em;
}

.canvas-media-file-label {
  bottom: -36px;
  left: 0;
  max-width: min(320px, 100%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-media-file-label svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: currentColor;
}

.canvas-media-file-label span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-media-resolution {
  top: -36px;
  position: absolute;
  right: 0;
  justify-content: center;
}

.canvas-empty-card {
  width: 100%;
  min-height: 140px;
  background: rgba(255, 255, 255, 0.82);
}
</style>
