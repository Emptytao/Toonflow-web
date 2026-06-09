<template>
  <BaseEdge :id="id" :path="path[0]" />
  <EdgeLabelRenderer>
    <div
      class="edgeActions"
      :style="{
        transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
      }">
      <div class="chip" @click.stop="remove">
        <i-close-small size="16" />
      </div>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@vue-flow/core";
import useProductionGraphStore from "@/stores/productionGraph";

const props = defineProps([
  "id",
  "sourceX",
  "sourceY",
  "targetX",
  "targetY",
  "sourcePosition",
  "targetPosition",
]);

const store = useProductionGraphStore();
const path = computed(() => getBezierPath(props as any));

function remove() {
  store.removeEdgesByIds([props.id]);
}
</script>

<style scoped lang="scss">
.edgeActions {
  position: absolute;
  pointer-events: all;
}

.chip {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--td-border-level-1-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
