<template>
  <div class="workflow-panel-shell" :style="panelStyle">
    <div class="workflow-panel" @mousedown.stop @click.stop>
      <div class="workflow-panel-head">
        <div class="workflow-mode-list">
          <button
            v-for="item in modeOptions"
            :key="item.value"
            class="workflow-mode-chip"
            :class="{ active: item.value === data.mode }"
            @click.stop="store.updateNodeData(node.id, { mode: item.value })">
            {{ item.label }}
          </button>
        </div>
        <button class="workflow-head-icon" title="放大查看" @click.stop="$emit('expand')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 5h5v5h-1.8V8.07l-5.06 5.06-1.28-1.27 5.07-5.06H14V5Zm-4.86 7.87 1.28 1.27-5.07 5.06H10V21H5v-5h1.8v1.93l5.34-5.06Z" />
          </svg>
        </button>
      </div>

      <div class="workflow-panel-body">
        <div class="workflow-reference-row">
          <div class="workflow-tool-list">
            <button class="workflow-tool-card" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a6 6 0 0 1 6 6c0 2.43-1.2 3.9-2.96 6.03l-1.7 2.04a1.74 1.74 0 0 1-2.68 0l-1.7-2.04C7.2 12.9 6 11.43 6 9a6 6 0 0 1 6-6Zm0 2a4 4 0 0 0-4 4c0 1.6.74 2.61 2.49 4.72l1.51 1.82 1.51-1.82C15.26 11.61 16 10.6 16 9a4 4 0 0 0-4-4Zm0 2.5A1.5 1.5 0 1 1 12 10.5a1.5 1.5 0 0 1 0-3Z" />
              </svg>
              <span>标记</span>
            </button>
            <button class="workflow-tool-card" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4h8l1 3h2v2h-1l-1 9H7L6 9H5V7h2l1-3Zm1.44 3h5.12l-.34-1H9.78l-.34 1ZM8.9 10l.54 6h1.6l-.28-6H8.9Zm4.34 0 .28 6h1.6l.54-6h-2.42Z" />
              </svg>
              <span>运镜</span>
            </button>
            <button class="workflow-tool-card" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 13a3.5 3.5 0 1 0-2.77-5.63A4.5 4.5 0 1 0 8.5 16H16a3 3 0 1 0 0-3Zm-8.5 1a2.5 2.5 0 1 1 1.8-4.24l.93.97.84-1.04A1.5 1.5 0 1 1 13.5 11h2.65a1 1 0 1 1 0 2H8.5Z" />
              </svg>
              <span>角色库</span>
            </button>
          </div>

          <div v-if="displayReferenceItems.length" class="workflow-ref-strip">
            <button
              v-for="item in displayReferenceItems"
              :key="item.id"
              class="workflow-ref-card"
              type="button"
              :title="item.label">
              <img v-if="item.fileType === 'image'" :src="item.url" :alt="item.label" />
              <video v-else-if="item.fileType === 'video'" :src="item.url" muted playsinline />
              <div v-else class="workflow-ref-audio">AUDIO</div>
            </button>
          </div>
        </div>

        <div class="workflow-prompt-wrap">
          <t-textarea
            :value="data.prompt"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="描述你想要生成的画面内容，@引用素材"
            @update:modelValue="(value) => store.updateNodeData(node.id, { prompt: value })" />
        </div>

        <div class="workflow-footbar">
          <div class="workflow-controls">
            <t-select
              :value="data.model"
              class="workflow-model-select"
              :options="videoModelSelectOptions"
              placeholder="选择模型"
              filterable
              @change="handleModelChange" />
            <t-select
              :value="data.resolution"
              class="workflow-select"
              :options="resolutionOptions"
              placeholder="分辨率"
              @change="(value) => store.updateNodeData(node.id, { resolution: String(value || '720p') })" />
            <t-select
              :value="data.promptStyle"
              class="workflow-select workflow-style-select"
              :options="promptStyleOptions"
              placeholder="风格"
              @change="(value) => store.updateNodeData(node.id, { promptStyle: String(value || 'general') })" />
            <t-input-number
              :value="data.duration"
              class="workflow-number"
              :min="1"
              :max="60"
              theme="normal"
              placeholder="时长"
              @change="(value) => store.updateNodeData(node.id, { duration: Number(value || 5) })" />
            <button
              class="workflow-icon-button"
              :class="{ active: data.audio }"
              type="button"
              :title="data.audio ? '关闭音频' : '开启音频'"
              @click.stop="store.updateNodeData(node.id, { audio: !data.audio })">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 7.5 13.6 4a1 1 0 0 1 1.7.72V19.3a1 1 0 0 1-1.7.71L10 16.5H6.5A2.5 2.5 0 0 1 4 14V10a2.5 2.5 0 0 1 2.5-2.5H10Zm8.24.34 1.42 1.42A6.48 6.48 0 0 1 21.5 14a6.48 6.48 0 0 1-1.84 4.74l-1.42-1.42A4.5 4.5 0 0 0 19.5 14a4.5 4.5 0 0 0-1.26-3.16Zm-2.83 2.83 1.42 1.42c.3.5.47 1.08.47 1.91s-.17 1.41-.47 1.91l-1.42 1.42c.59-.82.89-1.72.89-3.33s-.3-2.51-.89-3.33Z" />
              </svg>
            </button>
          </div>

          <div class="workflow-actions">
            <span class="workflow-runtime" :class="data.runtime?.status || 'idle'">{{ runtimeLabel }}</span>
            <button class="workflow-icon-button" type="button" title="生成提示词" @click.stop="store.runNode(node.id, 'generatePrompt')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 1.95 4.55L18.5 9.5l-4.55 1.95L12 16l-1.95-4.55L5.5 9.5l4.55-1.95L12 3Zm6.5 11 1.08 2.42L22 17.5l-2.42 1.08L18.5 21l-1.08-2.42L15 17.5l2.42-1.08L18.5 14ZM6 14l1.3 2.2L9.5 17.5l-2.2 1.3L6 21l-1.3-2.2L2.5 17.5l2.2-1.3L6 14Z" />
              </svg>
            </button>
            <button class="workflow-icon-button" type="button" title="运行当前节点" @click.stop="store.runNode(node.id, 'generateVideo')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6.5a1 1 0 0 1 1.54-.84l8 5.5a1 1 0 0 1 0 1.68l-8 5.5A1 1 0 0 1 8 17.5v-11Z" />
              </svg>
            </button>
            <span class="workflow-counter">{{ resultSummary }}</span>
            <button class="workflow-run-button" type="button" title="运行当前链路" @click.stop="store.runChain(node.id, 'generateVideo')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v10.17l3.59-3.58L17 12l-6 6-6-6 1.41-1.41L10 14.17V4h2Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import storeFactory from "@/stores/productionCanvasV2";
import type { CanvasV2Node, VideoNodeDataV2 } from "../types";

defineEmits<{
  close: [];
  expand: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<VideoNodeDataV2>;
  panelStyle?: Record<string, string | undefined>;
}>();

const store = storeFactory();

const data = computed(() => props.node.data);
const videoModelSelectOptions = computed(() =>
  store.videoModelOptions.map((item) => ({
    label: `${item.name} / ${item.label}`,
    value: `${item.id}:${item.value}`,
  })),
);
const modelDetail = computed(() => store.modelDetailMap[data.value.model] || null);
const resolutionOptions = computed(() =>
  (modelDetail.value?.durationResolutionMap?.[0]?.resolution ?? ["720p"]).map((item) => ({
    label: item,
    value: item,
  })),
);
const promptStyleOptions = [
  { label: "通用润色", value: "general" },
  { label: "高能戏剧化", value: "high_energy" },
  { label: "慢节奏细腻质感", value: "lyrical" },
];
function formatModeLabel(item: string | string[]) {
  if (Array.isArray(item)) return "多素材参考";
  const map: Record<string, string> = {
    text: "文生视频",
    singleImage: "图生视频",
    startEndRequired: "首尾帧",
    endFrameOptional: "尾帧参考",
    startFrameOptional: "首帧参考",
  };
  return map[item] || item;
}
const modeOptions = computed(() =>
  (modelDetail.value?.mode ?? ["text"]).map((item) => {
    const value = Array.isArray(item) ? JSON.stringify(item) : String(item);
    return {
      label: formatModeLabel(item),
      value,
    };
  }),
);
const workflowInputs = computed(() => store.getWorkflowInputs(props.node.id));
const manualReferenceItems = computed(() => data.value.referenceItems || []);
const displayReferenceItems = computed(() => {
  if (manualReferenceItems.value.length) return manualReferenceItems.value.slice(0, 4);
  return workflowInputs.value.mediaItems.slice(0, 4);
});
const resultSummary = computed(() => `${data.value.videoResults.length} 结果`);
const runtimeLabel = computed(() => {
  const map: Record<string, string> = {
    idle: "待机",
    queued: "排队中",
    running: "运行中",
    success: "已完成",
    error: "失败",
    stopped: "已停止",
  };
  return map[data.value.runtime?.status || "idle"] || "待机";
});

async function handleModelChange(value: any) {
  const modelId = Array.isArray(value) ? String(value[0] || "") : String(value || "");
  await store.applyWorkflowModel(props.node.id, modelId);
}

onMounted(async () => {
  if (data.value.model) {
    await store.getModelDetail(data.value.model);
  }
});
</script>

<style scoped lang="scss">
.workflow-panel-shell {
  position: fixed;
  z-index: 36;
  pointer-events: none;
}

.workflow-panel {
  pointer-events: auto;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(34, 34, 34, 0.96);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.workflow-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 8px;
}

.workflow-mode-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.workflow-mode-chip {
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.74);
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.workflow-mode-chip.active {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.36);
  color: #ffffff;
}

.workflow-head-icon,
.workflow-icon-button,
.workflow-run-button {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.workflow-head-icon,
.workflow-icon-button {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.workflow-head-icon:hover,
.workflow-icon-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.workflow-head-icon svg,
.workflow-icon-button svg,
.workflow-run-button svg,
.workflow-tool-card svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.workflow-panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100% - 50px);
  padding: 0 14px 14px;
}

.workflow-reference-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 46px;
  flex-shrink: 0;
}

.workflow-tool-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.workflow-tool-card {
  width: 42px;
  min-height: 42px;
  padding: 5px 3px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.72);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  cursor: pointer;
}

.workflow-ref-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.workflow-ref-card {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  padding: 0;
  cursor: pointer;
}

.workflow-ref-card img,
.workflow-ref-card video,
.workflow-ref-audio {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.workflow-ref-audio {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.52);
}

.workflow-prompt-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
}

.workflow-prompt-wrap :deep(.t-textarea__inner) {
  min-height: 56px;
  height: 100%;
  padding: 4px 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: none;
  font-size: 14px;
  line-height: 1.7;
}

.workflow-prompt-wrap :deep(.t-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.42);
}

.workflow-prompt-wrap :deep(.t-textarea__limit) {
  display: none;
}

.workflow-footbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  margin-top: auto;
}

.workflow-controls,
.workflow-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.workflow-model-select {
  width: 188px;
}

.workflow-select {
  width: 96px;
}

.workflow-style-select {
  width: 132px;
}

.workflow-number {
  width: 74px;
}

.workflow-runtime {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
}

.workflow-runtime.success {
  color: #9ae6b4;
}

.workflow-runtime.running,
.workflow-runtime.queued {
  color: #93c5fd;
}

.workflow-runtime.error {
  color: #fca5a5;
}

.workflow-icon-button.active {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.workflow-counter {
  color: rgba(255, 255, 255, 0.34);
  font-size: 12px;
  white-space: nowrap;
}

.workflow-run-button {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #202020;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.workflow-run-button:hover {
  transform: translateY(-1px);
}

.workflow-controls :deep(.t-input__wrap),
.workflow-controls :deep(.t-input),
.workflow-controls :deep(.t-select),
.workflow-controls :deep(.t-input-number),
.workflow-controls :deep(.t-input-number__decrease),
.workflow-controls :deep(.t-input-number__increase) {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.86);
}

.workflow-controls :deep(.t-input__wrap) {
  border-radius: 10px;
  box-shadow: none;
}

.workflow-controls :deep(.t-input__inner),
.workflow-controls :deep(.t-input__inner::placeholder),
.workflow-controls :deep(.t-input-number__input),
.workflow-controls :deep(.t-input__suffix),
.workflow-controls :deep(.t-input__prefix),
.workflow-controls :deep(.t-input-number__decrease),
.workflow-controls :deep(.t-input-number__increase),
.workflow-controls :deep(.t-input__suffix-icon),
.workflow-controls :deep(.t-input-number__decrease svg),
.workflow-controls :deep(.t-input-number__increase svg) {
  color: rgba(255, 255, 255, 0.86);
}

.workflow-controls :deep(.t-input--focused .t-input__wrap),
.workflow-controls :deep(.t-is-focused .t-input__wrap) {
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
}

@media (max-width: 900px) {
  .workflow-panel-shell {
    max-width: calc(100vw - 24px);
  }

  .workflow-panel-body {
    height: calc(100% - 50px);
    overflow: auto;
  }

  .workflow-reference-row,
  .workflow-footbar {
    flex-direction: column;
    align-items: stretch;
  }

  .workflow-controls,
  .workflow-actions {
    width: 100%;
    justify-content: space-between;
  }

  .workflow-model-select {
    width: 100%;
  }
}
</style>
