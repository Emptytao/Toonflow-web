<template>
  <CanvasNodeShell
    :title="data.title || 'Video Workflow'"
    badge="Workflow"
    :status="data.runtime?.status"
    :selected="selected"
    :dialog-mode="dialogMode"
    @expand="$emit('expand')"
    @delete="$emit('delete')">
    <template #headActions>
      <t-button size="small" variant="text" @click.stop="store.runNode(node.id, 'generatePrompt')">生成词</t-button>
      <t-button size="small" variant="text" @click.stop="store.runNode(node.id, 'generateVideo')">运行</t-button>
      <t-button size="small" variant="text" @click.stop="store.runChain(node.id, 'generateVideo')">链路</t-button>
    </template>
    <div class="workflow-node">
      <div class="field-row">
        <t-select
          :value="data.model"
          :options="videoModelSelectOptions"
          placeholder="视频模型"
          filterable
          @change="handleModelChange" />
        <t-select
          :value="data.mode"
          :options="modeOptions"
          placeholder="模式"
          @change="(value) => store.updateNodeData(node.id, { mode: String(value || 'text') })" />
      </div>
      <div class="field-row">
        <t-select
          :value="data.resolution"
          :options="resolutionOptions"
          placeholder="分辨率"
          @change="(value) => store.updateNodeData(node.id, { resolution: String(value || '720p') })" />
        <t-input-number
          :value="data.duration"
          :min="1"
          :max="60"
          theme="normal"
          placeholder="时长"
          @change="(value) => store.updateNodeData(node.id, { duration: Number(value || 5) })" />
      </div>
      <div class="audio-row">
        <span>生成音频</span>
        <t-switch :value="data.audio" @update:value="(value) => store.updateNodeData(node.id, { audio: value })" />
      </div>
      <t-textarea
        :value="data.prompt"
        :autosize="{ minRows: dialogMode ? 10 : 5, maxRows: dialogMode ? 18 : 8 }"
        placeholder="当前工作流提示词"
        @update:modelValue="(value) => store.updateNodeData(node.id, { prompt: value })" />
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">素材节点</span>
          <strong>{{ upstreamMediaCount }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">提示词节点</span>
          <strong>{{ upstreamPromptCount }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">循环节点</span>
          <strong>{{ upstreamLoopCount }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">节点挂载</span>
          <strong>{{ data.referenceItems.length }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">结果历史</span>
          <strong>{{ data.videoResults.length }}</strong>
        </div>
      </div>
      <div class="linked-section">
        <div class="section-head">
          <span>连线传入的提示词</span>
          <span class="section-count">{{ upstreamPromptCount }}</span>
        </div>
        <div v-if="workflowInputs.promptTexts.length" class="prompt-stack">
          <div v-for="item in workflowInputs.promptTexts" :key="item.nodeId" class="prompt-card">
            <div class="prompt-card-head">
              <strong>{{ item.title }}</strong>
              <span>{{ item.resolved ? "Resolved" : "Raw" }}</span>
            </div>
            <div class="prompt-card-text">{{ item.text }}</div>
          </div>
        </div>
        <div v-else-if="workflowInputs.promptNodes.length" class="section-empty">
          已连接 {{ workflowInputs.promptNodes.length }} 个提示词节点，但这些节点还没有可传递的文本。
        </div>
        <div v-else class="section-empty">暂无上游提示词输入</div>
      </div>
      <div class="linked-section">
        <div class="section-head">
          <span>连线传入的素材</span>
          <span class="section-count">{{ upstreamMediaCount }}</span>
        </div>
        <div v-if="workflowInputs.mediaItems.length" class="linked-media-list">
          <div v-for="item in workflowInputs.mediaItems" :key="`${item.nodeId}-${item.id}`" class="linked-media-item">
            <img v-if="item.fileType === 'image'" :src="item.url" :alt="item.label" />
            <video v-else-if="item.fileType === 'video'" :src="item.url" muted playsinline />
            <div v-else class="linked-audio">AUDIO</div>
            <div class="linked-media-meta">
              <strong>{{ item.label }}</strong>
              <span>{{ item.nodeTitle }} · {{ item.fileType.toUpperCase() }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="workflowInputs.mediaNodes.length" class="section-empty">
          已连接 {{ workflowInputs.mediaNodes.length }} 个素材节点，但当前还没有可传递的媒体条目。
        </div>
        <div v-else class="section-empty">暂无上游素材输入</div>
      </div>
      <div class="linked-section">
        <div class="section-head">
          <span>连线传入的循环配置</span>
          <span class="section-count">{{ upstreamLoopCount }}</span>
        </div>
        <div v-if="workflowInputs.loopSummaries.length" class="loop-stack">
          <div v-for="loop in workflowInputs.loopSummaries" :key="loop.nodeId" class="loop-card">
            <div class="loop-card-head">
              <strong>{{ loop.title }}</strong>
              <span>{{ loop.executionMode === "parallel" ? "并行" : "串行" }}</span>
            </div>
            <div class="loop-card-meta">
              <span>次数 {{ loop.count }}</span>
              <span>起始 {{ loop.startIndex }}</span>
              <span>每轮 {{ loop.takeCount }}</span>
              <span>图 {{ loop.enableImageInput ? "开" : "关" }}</span>
              <span>词 {{ loop.enablePromptInput ? "开" : "关" }}</span>
            </div>
            <div v-if="loop.prompts.length" class="loop-card-prompts">{{ loop.prompts.join(" / ") }}</div>
          </div>
        </div>
        <div v-else class="section-empty">暂无循环配置输入</div>
      </div>
      <div v-if="data.videoResults.length" class="result-list">
        <div v-for="item in data.videoResults" :key="item.id" class="result-card">
          <video :src="item.url" controls playsinline />
          <div class="result-meta">
            <span>{{ formatDate(item.createdAt) }}</span>
            <a :href="item.url" target="_blank" rel="noreferrer">下载</a>
          </div>
          <div v-if="item.errorMessage" class="result-error">{{ item.errorMessage }}</div>
        </div>
      </div>
      <div v-else class="empty-result">生成结果会累积在这里，不覆盖历史。</div>
    </div>
  </CanvasNodeShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import CanvasNodeShell from "./CanvasNodeShell.vue";
import storeFactory from "@/stores/productionCanvasV2";
import type { CanvasV2Node, VideoWorkflowNodeDataV2 } from "../types";

defineEmits<{
  expand: [];
  delete: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<VideoWorkflowNodeDataV2>;
  data: VideoWorkflowNodeDataV2;
  selected?: boolean;
  dialogMode?: boolean;
}>();

const store = storeFactory();

const videoModelSelectOptions = computed(() =>
  store.videoModelOptions.map((item) => ({
    label: `${item.name} / ${item.label}`,
    value: `${item.id}:${item.value}`,
  })),
);

const modelDetail = computed(() => store.modelDetailMap[props.data.model] || null);
const resolutionOptions = computed(() =>
  (modelDetail.value?.durationResolutionMap?.[0]?.resolution ?? ["720p"]).map((item) => ({
    label: item,
    value: item,
  })),
);
const modeOptions = computed(() =>
  (modelDetail.value?.mode ?? ["text"]).map((item) => {
    const value = Array.isArray(item) ? JSON.stringify(item) : item;
    const label = Array.isArray(item) ? item.join(" + ") : String(item);
    return {
      label,
      value,
    };
  }),
);
const workflowInputs = computed(() => store.getWorkflowInputs(props.node.id));
const upstreamMediaCount = computed(() => workflowInputs.value.mediaNodes.length);
const upstreamPromptCount = computed(() => workflowInputs.value.promptNodes.length);
const upstreamLoopCount = computed(() => workflowInputs.value.loopNodes.length);

async function handleModelChange(value: any) {
  const modelId = Array.isArray(value) ? String(value[0] || "") : String(value || "");
  await store.applyWorkflowModel(props.node.id, modelId);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

onMounted(async () => {
  if (props.data.model) {
    await store.getModelDetail(props.data.model);
  }
});
</script>

<style scoped lang="scss">
.workflow-node {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.audio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  color: #0f172a;
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.summary-card {
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-card strong {
  font-size: 18px;
  color: #0f172a;
}

.summary-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.linked-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.78);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #0f172a;
  font-weight: 700;
}

.section-count {
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #dbe2ea;
}

.section-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 10px;
  color: #64748b;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.prompt-stack,
.loop-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-card,
.loop-card {
  border-radius: 12px;
  border: 1px solid #dbe2ea;
  background: #fff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prompt-card-head,
.loop-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.prompt-card-head strong,
.loop-card-head strong {
  font-size: 12px;
  color: #0f172a;
}

.prompt-card-head span,
.loop-card-head span {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.prompt-card-text,
.loop-card-prompts {
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  white-space: pre-wrap;
}

.loop-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.loop-card-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 11px;
  color: #475569;
}

.linked-media-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 8px;
}

.linked-media-item {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #dbe2ea;
  background: #fff;
}

.linked-media-item img,
.linked-media-item video,
.linked-audio {
  width: 100%;
  height: 78px;
  display: block;
  object-fit: cover;
  background: #e2e8f0;
}

.linked-audio {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #475569;
}

.linked-media-meta {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.linked-media-meta strong {
  font-size: 12px;
  color: #0f172a;
  word-break: break-all;
}

.linked-media-meta span {
  font-size: 11px;
  color: #64748b;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.result-card video {
  width: 100%;
  display: block;
  background: #020617;
}

.result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #475569;
}

.result-meta a {
  color: #2563eb;
}

.result-error {
  padding: 0 10px 10px;
  font-size: 12px;
  color: #b91c1c;
}

.empty-result {
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

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 820px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
