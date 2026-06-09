<template>
  <CanvasNodeShell
    v-if="dialogMode"
    :title="displayLabel"
    badge="Video"
    :status="data.runtime?.status"
    :selected="selected"
    :dialog-mode="dialogMode"
    @expand="$emit('expand')"
    @delete="$emit('delete')">
    <div class="video-node-dialog">
      <div class="video-preview-card">
        <video
          v-if="previewKind === 'video' && previewUrl"
          :src="previewUrl"
          :poster="posterUrl"
          controls
          playsinline
          preload="metadata"
          @loadedmetadata="handleLoadedMetadata" />
        <div
          v-else
          class="video-placeholder dialog-placeholder"
          :style="posterStyle">
          <span>VIDEO</span>
        </div>
      </div>
      <div v-if="data.videoResults.length" class="result-list">
        <button
          v-for="result in data.videoResults"
          :key="result.id"
          class="result-item"
          :class="{ active: result.id === selectedResult?.id }"
          @click.stop="selectResult(result.id)">
          <span>{{ formatDate(result.createdAt) }}</span>
          <span>{{ result.state }}</span>
        </button>
      </div>
    </div>
  </CanvasNodeShell>

  <div
    v-else
    class="video-node-canvas"
    :class="{ selected }"
    @click.stop="$emit('openWorkflow')">
    <div class="video-node-kind-label">视频节点</div>
    <div class="video-node-floating-label" :title="displayLabel">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7Zm3 2.7 5.3 3.3a1 1 0 0 1 0 1.7L10 17a1 1 0 0 1-1.53-.85V9.55A1 1 0 0 1 10 8.7Z" />
      </svg>
      <span>{{ displayLabel }}</span>
    </div>
    <div v-if="displayResolution" class="video-node-resolution">{{ displayResolution }}</div>
    <div class="video-node-stage">
      <video
        v-if="previewKind === 'video' && previewUrl"
        ref="videoRef"
        :src="previewUrl"
        :poster="posterUrl"
        class="video-node-player"
        muted
        playsinline
        preload="metadata"
        @loadedmetadata="handleLoadedMetadata"
        @timeupdate="handleTimeUpdate"
        @ended="handleEnded" />
      <div
        v-else
        class="video-placeholder"
        :style="posterStyle">
        <span>视频节点</span>
      </div>

      <button
        v-if="previewKind === 'video' && previewUrl"
        class="video-play-button"
        @mousedown.stop
        @click.stop="togglePlayback">
        <svg v-if="!isPlaying" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 6.5a1 1 0 0 1 1.54-.84l8 5.5a1 1 0 0 1 0 1.68l-8 5.5A1 1 0 0 1 8 17.5v-11Z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 6h3v12H8V6Zm5 0h3v12h-3V6Z" />
        </svg>
      </button>

      <div v-if="previewKind === 'video' && previewUrl" class="video-progress">
        <div class="video-progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CanvasNodeShell from "./CanvasNodeShell.vue";
import storeFactory from "@/stores/productionCanvasV2";
import { DEFAULT_VISUAL_NODE_SIZE, getVisualNodeSizeFromSource } from "../core/layout";
import type { CanvasV2Node, VideoNodeDataV2 } from "../types";

defineEmits<{
  expand: [];
  delete: [];
  openWorkflow: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<VideoNodeDataV2>;
  data: VideoNodeDataV2;
  selected?: boolean;
  dialogMode?: boolean;
}>();

const store = storeFactory();
const videoRef = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const displayResolution = ref("");

const selectedResult = computed(() => props.data.videoResults.find((item) => item.id === props.data.selectedResultId) || props.data.videoResults[0] || null);
const videoReference = computed(
  () => props.data.referenceItems.find((item) => item.fileType === "video") || null,
);
const imageReference = computed(
  () => props.data.referenceItems.find((item) => item.fileType === "image") || null,
);
const previewUrl = computed(() => selectedResult.value?.url || videoReference.value?.url || "");
const previewKind = computed<"video" | "poster" | "empty">(() => {
  if (previewUrl.value) return "video";
  if (imageReference.value?.url) return "poster";
  return "empty";
});
const posterUrl = computed(() => imageReference.value?.url || "");
const posterStyle = computed(() => (posterUrl.value ? { backgroundImage: `url(${posterUrl.value})` } : {}));
const displayLabel = computed(() => {
  const title = String(props.data.title || "").trim();
  if (title) return title;
  return videoReference.value?.label || imageReference.value?.label || "视频节点";
});
const progressPercent = computed(() => {
  if (!duration.value) return 0;
  return Math.max(0, Math.min(100, (currentTime.value / duration.value) * 100));
});

function syncNodeSize(width: number, height: number) {
  const nextSize = getVisualNodeSizeFromSource(width, height);
  if (Math.abs(props.node.size.width - nextSize.width) < 2 && Math.abs(props.node.size.height - nextSize.height) < 2) return;
  store.updateNodeSize(props.node.id, nextSize);
}

function handleLoadedMetadata(event: Event) {
  const element = event.target as HTMLVideoElement;
  duration.value = Number.isFinite(element.duration) ? element.duration : 0;
  if (element.videoWidth && element.videoHeight) {
    displayResolution.value = `${element.videoWidth} × ${element.videoHeight}`;
    syncNodeSize(element.videoWidth, element.videoHeight);
  }
}

function handleTimeUpdate(event: Event) {
  const element = event.target as HTMLVideoElement;
  currentTime.value = element.currentTime || 0;
}

function handleEnded() {
  isPlaying.value = false;
}

async function togglePlayback() {
  const element = videoRef.value;
  if (!element) return;
  if (element.paused) {
    await element.play().catch(() => undefined);
    isPlaying.value = !element.paused;
    return;
  }
  element.pause();
  isPlaying.value = false;
}

function selectResult(resultId: string) {
  store.updateNodeData(props.node.id, { selectedResultId: resultId });
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

watch(
  () => posterUrl.value,
  (url) => {
    if (!url || previewKind.value !== "poster") return;
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      syncNodeSize(image.naturalWidth, image.naturalHeight);
    };
    image.src = url;
  },
  { immediate: true },
);

watch(
  () => previewKind.value,
  (kind) => {
    if (kind !== "empty") return;
    syncNodeSize(DEFAULT_VISUAL_NODE_SIZE.width, DEFAULT_VISUAL_NODE_SIZE.height);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.video-node-canvas {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.video-node-kind-label,
.video-node-floating-label,
.video-node-resolution {
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

.video-node-kind-label {
  left: 0;
  top: -36px;
  letter-spacing: 0.04em;
}

.video-node-floating-label {
  left: 0;
  bottom: -36px;
  max-width: min(320px, 100%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-node-floating-label svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: currentColor;
}

.video-node-resolution {
  right: 0;
  top: -36px;
}

.video-node-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.video-node-player,
.video-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border: 0;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.08));
}

.video-placeholder {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(229, 231, 235, 0.34)),
    linear-gradient(135deg, rgba(243, 244, 246, 0.92), rgba(255, 255, 255, 0.96));
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.dialog-placeholder {
  width: 100%;
  min-height: 280px;
}

.video-play-button {
  position: absolute;
  right: 12px;
  bottom: 18px;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.video-play-button svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.video-progress {
  position: absolute;
  left: 12px;
  right: 60px;
  bottom: 16px;
  height: 5px;
  border-radius: 999px;
  background: rgba(209, 213, 219, 0.72);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(229, 231, 235, 0.86);
}

.video-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #9ca3af;
}

.video-node-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-preview-card {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(243, 244, 246, 0.94);
}

.video-preview-card video {
  width: 100%;
  max-height: 56vh;
  display: block;
}

.result-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-item {
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.84);
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.result-item.active {
  border-color: #9ca3af;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.12);
}
</style>
