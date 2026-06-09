<template>
  <t-card :class="['graphNode', 'loopNode', { dialogMode: isDialogMode }]" :bordered="true">
    <NodeResizer v-if="!isDialogMode" :min-width="260" :min-height="220" :is-visible="selected" line-class-name="resizeLine" handle-class-name="resizeHandle" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.source" type="source" :position="Position.Right" style="top: 96px" />

    <div class="titleBar" :class="{ dragHandle: !isDialogMode }">
      <div class="title">循环节点</div>
      <div class="actions">
        <nodeExpandButton v-if="!isDialogMode" :node-id="props.id" />
        <t-button size="small" variant="text" @click.stop="store.runChain(props.id)">运行链路</t-button>
      </div>
    </div>

    <div class="grid">
      <div class="switchItem">
        <span class="switchLabel">图片输入</span>
        <t-switch v-model="enableImageInput" />
      </div>
      <div class="switchItem">
        <span class="switchLabel">提示词输入</span>
        <t-switch v-model="enablePromptInput" />
      </div>
      <t-input-number v-model="loopCount" theme="normal" :min="1" :step="1" />
      <t-input-number v-model="startIndex" theme="normal" :min="1" :step="1" />
      <t-select v-model="mode" :options="modeOptions" />
      <t-input-number v-model="takeCount" theme="normal" :min="1" :step="1" />
    </div>

    <div class="promptList">
      <div class="promptRow" v-for="(item, index) in prompts" :key="index">
        <t-input :value="item" @change="(value) => updatePrompt(index, String(value))" placeholder="循环提示词" />
        <t-button size="small" variant="text" @click.stop="removePrompt(index)">删</t-button>
      </div>
      <t-button size="small" variant="outline" block @click.stop="appendPrompt">新增循环提示词</t-button>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import useProductionGraphStore from "@/stores/productionGraph";
import nodeExpandButton from "../components/nodeExpandButton.vue";
import type { LoopNodeData } from "../graph/types";

const props = withDefaults(
  defineProps<{
  id: string;
  data: LoopNodeData;
  selected?: boolean;
  renderMode?: "node" | "dialog";
}>(),
  {
    renderMode: "node",
  },
);

const store = useProductionGraphStore();
const isDialogMode = computed(() => props.renderMode === "dialog");
const modeOptions = [
  { label: "串行", value: "serial" },
  { label: "并行", value: "parallel" },
];

const enableImageInput = computed({
  get: () => props.data.enableImageInput,
  set: (value: boolean) => store.updateNodeData(props.id, { enableImageInput: value }),
});
const enablePromptInput = computed({
  get: () => props.data.enablePromptInput,
  set: (value: boolean) => store.updateNodeData(props.id, { enablePromptInput: value }),
});
const loopCount = computed({
  get: () => props.data.count,
  set: (value: number) => store.updateNodeData(props.id, { count: Number(value) || 1 }),
});
const startIndex = computed({
  get: () => props.data.startIndex,
  set: (value: number) => store.updateNodeData(props.id, { startIndex: Number(value) || 1 }),
});
const mode = computed({
  get: () => props.data.mode,
  set: (value: "serial" | "parallel") => store.updateNodeData(props.id, { mode: value }),
});
const takeCount = computed({
  get: () => props.data.takeCount,
  set: (value: number) => store.updateNodeData(props.id, { takeCount: Number(value) || 1 }),
});
const prompts = computed(() => props.data.prompts ?? []);

function updatePrompt(index: number, value: string) {
  const nextPrompts = [...prompts.value];
  nextPrompts[index] = value;
  store.updateNodeData(props.id, { prompts: nextPrompts });
}
function appendPrompt() {
  store.updateNodeData(props.id, { prompts: [...prompts.value, ""] });
}
function removePrompt(index: number) {
  if (prompts.value.length <= 1) return;
  store.updateNodeData(props.id, { prompts: prompts.value.filter((_, promptIndex) => promptIndex !== index) });
}
</script>

<style scoped lang="scss">
.loopNode {
  min-width: 260px;
  min-height: 220px;

  &.dialogMode {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .titleBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: grab;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .title {
    font-weight: 600;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .switchItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .switchLabel {
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }

  .promptList {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .promptRow {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  &.dialogMode {
    .titleBar {
      cursor: default;
    }
  }
}
</style>
