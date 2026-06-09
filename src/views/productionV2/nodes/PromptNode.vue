<template>
  <div v-if="dialogMode" class="prompt-node-dialog">
    <div class="prompt-node-dialog-head">
      <div class="prompt-node-dialog-title">{{ displayTitle }}</div>
      <div class="prompt-node-dialog-subtitle">通用文本节点</div>
    </div>
    <t-textarea
      :value="editableText"
      :autosize="{ minRows: 14, maxRows: 24 }"
      placeholder="输入文本内容"
      @update:modelValue="updatePromptText" />
  </div>

  <div v-else class="prompt-node-canvas" :class="{ selected }" @click.stop="$emit('edit')">
    <div class="prompt-node-floating-label" :title="displayTitle">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h9.2l3.8 3.8V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 1.5V8h2.5L14 5.5ZM8 11h8v1.8H8V11Zm0 4h8v1.8H8V15Zm0-8h4.5v1.8H8V7Z" />
      </svg>
      <span>{{ displayTitle }}</span>
    </div>
    <div class="prompt-node-card">
      <div class="prompt-node-text" :class="{ empty: !displayText }">
        {{ displayText || "点击编辑文本" }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import storeFactory from "@/stores/productionCanvasV2";
import type { CanvasV2Node, PromptNodeDataV2 } from "../types";

defineEmits<{
  expand: [];
  delete: [];
  edit: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<PromptNodeDataV2>;
  data: PromptNodeDataV2;
  selected?: boolean;
  dialogMode?: boolean;
}>();

const store = storeFactory();

const displayTitle = computed(() => {
  const title = String(props.data.title || "").trim();
  if (!title || title === "Prompt") return "文本节点";
  return title;
});

const displayText = computed(() => String(props.data.resolvedPrompt || props.data.rawPrompt || "").trim());
const editableText = computed(() => String(props.data.rawPrompt || props.data.resolvedPrompt || ""));

function updatePromptText(value: string) {
  const nextValue = String(value || "");
  store.updateNodeData(props.node.id, {
    rawPrompt: nextValue,
    resolvedPrompt: nextValue,
  });
}
</script>

<style scoped lang="scss">
.prompt-node-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}

.prompt-node-dialog :deep(.t-textarea__inner) {
  min-height: 100%;
  border-color: rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.84);
  color: #111827;
}

.prompt-node-dialog-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prompt-node-dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--v2-text, #111827);
}

.prompt-node-dialog-subtitle {
  font-size: 12px;
  color: var(--v2-muted, #6b7280);
}

.prompt-node-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.prompt-node-floating-label {
  position: absolute;
  left: 0;
  top: -36px;
  max-width: min(220px, 100%);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.prompt-node-floating-label svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: currentColor;
}

.prompt-node-card {
  width: 100%;
  height: 100%;
  border-radius: 22px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(243, 244, 246, 0.94);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.prompt-node-canvas.selected .prompt-node-card {
  border-color: #9ca3af;
  box-shadow:
    0 0 0 2px rgba(156, 163, 175, 0.14),
    0 16px 32px rgba(15, 23, 42, 0.1);
}

.prompt-node-text {
  width: 100%;
  height: 100%;
  padding: 22px 24px;
  color: #111827;
  font-size: 17px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
}

.prompt-node-text.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 16px;
}
</style>
