<template>
  <CanvasNodeShell
    :title="data.title || 'Loop'"
    badge="Loop"
    :selected="selected"
    :dialog-mode="dialogMode"
    @expand="$emit('expand')"
    @delete="$emit('delete')">
    <div class="loop-node">
      <div class="toggle-grid">
        <label class="toggle-item">
          <span>图片输入</span>
          <t-switch :value="data.enableImageInput" @update:value="(value) => store.updateNodeData(node.id, { enableImageInput: value })" />
        </label>
        <label class="toggle-item">
          <span>提示词输入</span>
          <t-switch :value="data.enablePromptInput" @update:value="(value) => store.updateNodeData(node.id, { enablePromptInput: value })" />
        </label>
      </div>
      <div class="field-row">
        <t-input-number :value="data.count" :min="1" theme="normal" placeholder="循环次数" @change="(value) => store.updateNodeData(node.id, { count: Number(value || 1) })" />
        <t-input-number :value="data.startIndex" :min="1" theme="normal" placeholder="起始编号" @change="(value) => store.updateNodeData(node.id, { startIndex: Number(value || 1) })" />
      </div>
      <div class="field-row">
        <t-select
          :value="data.executionMode"
          :options="[
            { label: '串行', value: 'serial' },
            { label: '并行', value: 'parallel' },
          ]"
          @change="(value) => store.updateNodeData(node.id, { executionMode: String(value || 'serial') })" />
        <t-input-number :value="data.takeCount" :min="1" theme="normal" placeholder="每轮取图数量" @change="(value) => store.updateNodeData(node.id, { takeCount: Number(value || 1) })" />
      </div>
      <div class="prompt-list">
        <div v-for="(prompt, index) in data.prompts" :key="index" class="prompt-row">
          <t-textarea
            :value="prompt"
            :autosize="{ minRows: 2, maxRows: dialogMode ? 6 : 4 }"
            :placeholder="`循环提示词 ${index + 1}`"
            @update:modelValue="(value) => updatePrompt(index, value)" />
          <t-button theme="danger" variant="text" @click="removePrompt(index)">删除</t-button>
        </div>
        <t-button variant="outline" theme="default" @click="appendPrompt">新增提示词</t-button>
      </div>
    </div>
  </CanvasNodeShell>
</template>

<script setup lang="ts">
import CanvasNodeShell from "./CanvasNodeShell.vue";
import storeFactory from "@/stores/productionCanvasV2";
import type { CanvasV2Node, LoopNodeDataV2 } from "../types";

defineEmits<{
  expand: [];
  delete: [];
}>();

const props = defineProps<{
  node: CanvasV2Node<LoopNodeDataV2>;
  data: LoopNodeDataV2;
  selected?: boolean;
  dialogMode?: boolean;
}>();

const store = storeFactory();

function updatePrompt(index: number, value: string) {
  const nextPrompts = [...props.data.prompts];
  nextPrompts[index] = value;
  store.updateNodeData(props.node.id, { prompts: nextPrompts });
}

function appendPrompt() {
  store.updateNodeData(props.node.id, { prompts: [...props.data.prompts, ""] });
}

function removePrompt(index: number) {
  const nextPrompts = props.data.prompts.filter((_, itemIndex) => itemIndex !== index);
  store.updateNodeData(props.node.id, { prompts: nextPrompts.length ? nextPrompts : [""] });
}
</script>

<style scoped lang="scss">
.loop-node {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow: auto;
}

.toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-item {
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #111827;
  font-weight: 600;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-row {
  border-radius: 14px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  padding: 8px;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
