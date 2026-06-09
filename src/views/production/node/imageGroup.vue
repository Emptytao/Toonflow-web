<template>
  <t-card :class="['graphNode', 'imageGroupNode', { dialogMode: isDialogMode }]" :bordered="true">
    <NodeResizer v-if="!isDialogMode" :min-width="300" :min-height="220" :is-visible="selected" line-class-name="resizeLine" handle-class-name="resizeHandle" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.target" type="target" :position="Position.Left" style="top: 96px" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.source" type="source" :position="Position.Right" style="top: 96px" />

    <div class="titleBar" :class="{ dragHandle: !isDialogMode }">
      <div class="title">图片组</div>
      <div class="actions">
        <nodeExpandButton v-if="!isDialogMode" :node-id="props.id" />
        <t-button size="small" variant="text" @click.stop="store.ungroupNode(props.id)">解组</t-button>
      </div>
    </div>

    <div class="grid">
      <div class="gridItem" v-for="item in props.data.items" :key="item.id">
        <t-image v-if="item.fileType === 'image'" :src="item.url" fit="cover" class="thumb" />
        <video v-else-if="item.fileType === 'video'" :src="item.url" class="thumb" muted></video>
        <div v-else class="thumb audio">
          <VolumeMute size="20" />
        </div>
        <t-button size="small" theme="danger" variant="text" class="removeBtn" @click.stop="removeItem(item.id)">删</t-button>
      </div>
      <div v-if="!props.data.items?.length" class="emptyState">把图片节点拖到这里进行编组</div>
    </div>
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import { VolumeMute } from "@icon-park/vue-next";
import useProductionGraphStore from "@/stores/productionGraph";
import nodeExpandButton from "../components/nodeExpandButton.vue";
import type { ImageGroupNodeData } from "../graph/types";

const props = withDefaults(
  defineProps<{
  id: string;
  data: ImageGroupNodeData;
  selected?: boolean;
  renderMode?: "node" | "dialog";
}>(),
  {
    renderMode: "node",
  },
);

const store = useProductionGraphStore();
const isDialogMode = computed(() => props.renderMode === "dialog");

function removeItem(itemId: string) {
  store.updateNodeData(props.id, {
    items: props.data.items.filter((item) => item.id !== itemId),
  });
}
</script>

<style scoped lang="scss">
.imageGroupNode {
  min-width: 300px;
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
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .gridItem {
    position: relative;
  }

  .thumb {
    width: 100%;
    height: 72px;
    border-radius: 10px;
    overflow: hidden;
  }

  .audio {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--td-bg-color-secondarycontainer);
  }

  .removeBtn {
    position: absolute;
    top: 2px;
    right: 2px;
  }

  .emptyState {
    grid-column: 1 / -1;
    min-height: 120px;
    border: 1px dashed var(--td-border-level-2-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--td-text-color-placeholder);
  }

  &.dialogMode {
    .titleBar {
      cursor: default;
    }
  }
}
</style>
