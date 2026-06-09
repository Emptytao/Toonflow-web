<template>
  <t-dialog
    :visible="visible"
    :header="dialogTitle"
    :width="dialogWidth"
    :footer="false"
    placement="center"
    attach="body"
    destroy-on-close
    @close="emit('close')"
    @update:visible="handleVisibleChange">
    <div v-if="nodeType" class="expandedNodeDialogBody">
      <scriptNode
        v-if="nodeType === 'script'"
        :id="nodeId"
        :handle-ids="scriptHandleIds"
        :model-value="props.flowData.script"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('script', $event)" />

      <scriptPlanNode
        v-else-if="nodeType === 'scriptPlan'"
        :id="nodeId"
        :handle-ids="standardHandleIds"
        :model-value="props.flowData.scriptPlan"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('scriptPlan', $event)" />

      <storyboardTableNode
        v-else-if="nodeType === 'storyboardTable'"
        :id="nodeId"
        :handle-ids="standardHandleIds"
        :model-value="props.flowData.storyboardTable"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('storyboardTable', $event)" />

      <assetsNode
        v-else-if="nodeType === 'assets'"
        :id="nodeId"
        :handle-ids="assetsHandleIds"
        :model-value="props.flowData.assets"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('assets', $event)" />

      <storyboardNode
        v-else-if="nodeType === 'storyboard'"
        :id="nodeId"
        :handle-ids="standardHandleIds"
        :assets-data="props.flowData.assets"
        :model-value="props.flowData.storyboard"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('storyboard', $event)" />

      <workbenchNode
        v-else-if="nodeType === 'workbench'"
        :id="nodeId"
        :handle-ids="standardHandleIds"
        :model-value="props.flowData.workbench"
        render-mode="dialog"
        @update:model-value="updateLegacyNode('workbench', $event)" />

      <mediaNode v-else-if="nodeType === 'media' && mediaData" :id="nodeId" :data="mediaData" :selected="false" render-mode="dialog" />

      <promptNode v-else-if="nodeType === 'prompt' && promptData" :id="nodeId" :data="promptData" :selected="false" render-mode="dialog" />

      <loopNode v-else-if="nodeType === 'loop' && loopData" :id="nodeId" :data="loopData" :selected="false" render-mode="dialog" />

      <imageGroupNode v-else-if="nodeType === 'imageGroup' && imageGroupData" :id="nodeId" :data="imageGroupData" :selected="false" render-mode="dialog" />
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { GraphNodeType, ImageGroupNodeData, LoopNodeData, MediaNodeData, ProductionNode, PromptNodeData } from "../graph/types";
import { getExpandedNodeDialogWidth, getExpandedNodeTitle } from "../graph/expand";
import scriptNode from "../node/script.vue";
import scriptPlanNode from "../node/scriptPlan.vue";
import assetsNode from "../node/assets.vue";
import storyboardTableNode from "../node/storyboardTable.vue";
import storyboardNode from "../node/storyboard.vue";
import workbenchNode from "../node/workbench.vue";
import mediaNode from "../node/media.vue";
import promptNode from "../node/prompt.vue";
import loopNode from "../node/loop.vue";
import imageGroupNode from "../node/imageGroup.vue";

const props = defineProps<{
  node?: ProductionNode;
  flowData: Record<string, any>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const visible = computed(() => Boolean(props.node));
const nodeId = computed(() => props.node?.id ?? "");
const nodeType = computed<GraphNodeType | null>(() => props.node?.type ?? null);
const standardHandleIds = computed(() => ({
  target: props.node?.data?.handleIds?.target ?? "",
  source: props.node?.data?.handleIds?.source ?? "",
}));
const scriptHandleIds = computed(() => ({
  assets: props.node?.data?.handleIds?.assets ?? "",
  source: props.node?.data?.handleIds?.source ?? "",
}));
const assetsHandleIds = computed(() => ({
  target: props.node?.data?.handleIds?.target ?? "",
}));
const mediaData = computed<MediaNodeData | null>(() => (nodeType.value === "media" ? (props.node?.data as MediaNodeData) : null));
const promptData = computed<PromptNodeData | null>(() => (nodeType.value === "prompt" ? (props.node?.data as PromptNodeData) : null));
const loopData = computed<LoopNodeData | null>(() => (nodeType.value === "loop" ? (props.node?.data as LoopNodeData) : null));
const imageGroupData = computed<ImageGroupNodeData | null>(() =>
  nodeType.value === "imageGroup" ? (props.node?.data as ImageGroupNodeData) : null,
);
const dialogTitle = computed(() => (nodeType.value ? getExpandedNodeTitle(nodeType.value) : ""));
const dialogWidth = computed(() => (nodeType.value ? getExpandedNodeDialogWidth(nodeType.value) : "72vw"));

function handleVisibleChange(nextVisible: boolean) {
  if (!nextVisible) {
    emit("close");
  }
}

function updateLegacyNode(key: string, value: any) {
  props.flowData[key] = value;
}
</script>

<style scoped lang="scss">
.expandedNodeDialogBody {
  max-height: calc(92vh - 120px);
  overflow: auto;
  padding-right: 4px;
}
</style>
