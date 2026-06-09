<template>
  <t-tooltip content="放大查看" theme="primary" placement="bottom">
    <t-button class="nodeExpandButton" size="small" variant="text" shape="square" @mousedown.stop @click.stop="store.openExpandedNode(nodeId)">
      <template #icon>
        <i-full-screen-play size="16" />
      </template>
    </t-button>
  </t-tooltip>
</template>

<script setup lang="ts">
import useProductionGraphStore from "@/stores/productionGraph";

defineProps<{
  nodeId: string;
}>();

const store = useProductionGraphStore();
</script>

<style scoped lang="scss">
.nodeExpandButton {
  color: var(--td-text-color-secondary);

  &:hover {
    color: var(--td-brand-color);
  }
}
</style>
