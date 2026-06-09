<template>
  <t-card :class="['graphNode', 'promptNode', { dialogMode: isDialogMode }]" :bordered="true">
    <NodeResizer v-if="!isDialogMode" :min-width="280" :min-height="240" :is-visible="selected" line-class-name="resizeLine" handle-class-name="resizeHandle" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.source" type="source" :position="Position.Right" style="top: 84px" />

    <div class="titleBar" :class="{ dragHandle: !isDialogMode }">
      <div class="title">提示词节点</div>
      <div class="actions">
        <nodeExpandButton v-if="!isDialogMode" :node-id="props.id" />
        <t-button size="small" variant="text" @click.stop="store.runNode(props.id)">运行</t-button>
      </div>
    </div>

    <div class="field switchField">
      <span class="switchLabel">LLM 改写</span>
      <t-switch v-model="rewriteEnabled" />
    </div>
    <div class="field row">
      <t-select v-model="provider" :options="providerOptions" placeholder="提供商" clearable />
      <t-select v-model="model" :options="modelOptions" placeholder="模型" clearable />
    </div>
    <div class="field">
      <t-textarea v-model="rawPrompt" :autosize="{ minRows: 4, maxRows: 8 }" placeholder="输入原始提示词" />
    </div>
    <div class="field">
      <t-input v-model="systemPrompt" placeholder="系统提示词" />
    </div>
    <div class="field">
      <t-input v-model="rewriteInstruction" placeholder="改写指令" />
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import axios from "@/utils/axios";
import useProductionGraphStore from "@/stores/productionGraph";
import nodeExpandButton from "../components/nodeExpandButton.vue";
import type { PromptNodeData } from "../graph/types";

const props = withDefaults(
  defineProps<{
  id: string;
  data: PromptNodeData;
  selected?: boolean;
  renderMode?: "node" | "dialog";
}>(),
  {
    renderMode: "node",
  },
);

const store = useProductionGraphStore();
const modelList = ref<Array<{ id: string; label: string; value: string; name: string }>>([]);
const isDialogMode = computed(() => props.renderMode === "dialog");

const rawPrompt = computed({
  get: () => props.data.rawPrompt,
  set: (value: string) => store.updateNodeData(props.id, { rawPrompt: value, resolvedPrompt: props.data.rewriteEnabled ? props.data.resolvedPrompt : value }),
});
const systemPrompt = computed({
  get: () => props.data.systemPrompt,
  set: (value: string) => store.updateNodeData(props.id, { systemPrompt: value }),
});
const rewriteInstruction = computed({
  get: () => props.data.rewriteInstruction,
  set: (value: string) => store.updateNodeData(props.id, { rewriteInstruction: value }),
});
const rewriteEnabled = computed({
  get: () => props.data.rewriteEnabled,
  set: (value: boolean) => store.updateNodeData(props.id, { rewriteEnabled: value }),
});
const provider = computed({
  get: () => props.data.llmProvider,
  set: (value: string) => store.updateNodeData(props.id, { llmProvider: value, llmModel: "" }),
});
const model = computed({
  get: () => props.data.llmModel,
  set: (value: string) => store.updateNodeData(props.id, { llmModel: value }),
});

const providerOptions = computed(() =>
  Array.from(new Map(modelList.value.map((item) => [item.id, { label: item.name, value: item.id }])).values()),
);
const modelOptions = computed(() => modelList.value.filter((item) => item.id === provider.value).map((item) => ({ label: item.label, value: item.value })));

onMounted(async () => {
  const { data } = await axios.post("/modelSelect/getModelList", { type: "text" });
  modelList.value = data ?? [];
});
</script>

<style scoped lang="scss">
.promptNode {
  min-width: 280px;
  min-height: 240px;

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

  .field {
    margin-top: 10px;
  }

  .switchField {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .switchLabel {
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  &.dialogMode {
    .titleBar {
      cursor: default;
    }
  }
}
</style>
