<template>
  <t-card :class="['graphNode', 'mediaNode', { dialogMode: isDialogMode }]" :bordered="true">
    <NodeResizer v-if="!isDialogMode" :min-width="280" :min-height="220" :is-visible="selected" line-class-name="resizeLine" handle-class-name="resizeHandle" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.prompt" type="target" :position="Position.Left" style="top: 56px" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.image" type="target" :position="Position.Left" style="top: 96px" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.loop" type="target" :position="Position.Left" style="top: 136px" />
    <Handle v-if="!isDialogMode" :id="props.data.handleIds.source" type="source" :position="Position.Right" style="top: 96px" />

    <div class="titleBar" :class="{ dragHandle: !isDialogMode }">
      <div class="titleInfo">
        <div class="title">媒体节点</div>
        <t-tag size="small" theme="primary" variant="light">{{ props.data.mode === "video" ? "视频模式" : "图片模式" }}</t-tag>
      </div>
      <div class="actions">
        <nodeExpandButton v-if="!isDialogMode" :node-id="props.id" />
        <t-button size="small" variant="text" @click.stop="store.runNode(props.id)">运行</t-button>
        <t-button size="small" variant="text" @click.stop="store.runChain(props.id)">链路</t-button>
      </div>
    </div>

    <div class="previewBox" @dblclick.stop="visible = true">
      <template v-if="currentItem">
        <t-image v-if="currentItem.fileType === 'image'" :src="currentItem.url" fit="cover" class="previewImage" />
        <video v-else-if="currentItem.fileType === 'video'" :src="currentItem.url" class="previewVideo" controls></video>
        <div v-else class="audioPreview">
          <VolumeMute size="28" />
          <audio :src="currentItem.url" controls></audio>
        </div>
      </template>
      <div v-else class="emptyState">
        <PictureAlbum size="28" />
        <span>双击空白创建或拖入媒体</span>
      </div>
    </div>

    <div class="summary">
      <div class="metaRow">
        <t-tag size="small" variant="outline">输入 {{ props.data.items?.length || 0 }}</t-tag>
        <t-tag size="small" variant="outline">历史 {{ props.data.historyGroups?.length || 0 }}</t-tag>
      </div>
      <div class="promptText">{{ promptPreview }}</div>
      <div class="runtime">
        <t-tag size="small" :theme="runtimeTheme">{{ runtimeText }}</t-tag>
        <span v-if="props.data.runtime?.elapsedMs" class="runtimeMs">{{ Math.round((props.data.runtime.elapsedMs || 0) / 1000) }}s</span>
      </div>
    </div>
  </t-card>

  <t-dialog v-model:visible="visible" header="结果预览" width="80vw" placement="center" attach="body">
    <div class="dialogPreview">
      <t-image v-if="currentItem?.fileType === 'image'" :src="currentItem.url" fit="contain" class="dialogImage" />
      <video v-else-if="currentItem?.fileType === 'video'" :src="currentItem.url" class="dialogVideo" controls autoplay></video>
      <audio v-else-if="currentItem?.fileType === 'audio'" :src="currentItem.url" controls autoplay></audio>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import { PictureAlbum, VolumeMute } from "@icon-park/vue-next";
import useProductionGraphStore from "@/stores/productionGraph";
import nodeExpandButton from "../components/nodeExpandButton.vue";
import type { GraphMediaItem, MediaNodeData } from "../graph/types";
import { getNodeOutputItems } from "../graph/types";

const props = withDefaults(
  defineProps<{
  id: string;
  data: MediaNodeData;
  selected?: boolean;
  renderMode?: "node" | "dialog";
}>(),
  {
    renderMode: "node",
  },
);

const store = useProductionGraphStore();
const visible = ref(false);
const isDialogMode = computed(() => props.renderMode === "dialog");

const currentItem = computed<GraphMediaItem | undefined>(() => {
  const node = store.nodes.find((item) => item.id === props.id);
  return getNodeOutputItems(node)[0];
});

const promptPreview = computed(() => props.data.draftPrompt || props.data.prompt || "尚未填写提示词");
const runtimeTheme = computed(() => {
  const status = props.data.runtime?.status;
  if (status === "success") return "success";
  if (status === "error") return "danger";
  if (status === "running" || status === "queued") return "warning";
  return "default";
});
const runtimeText = computed(() => {
  const status = props.data.runtime?.status;
  if (status === "success") return "成功";
  if (status === "error") return props.data.runtime?.errorMessage || "失败";
  if (status === "running") return "运行中";
  if (status === "queued") return "排队中";
  if (status === "stopped") return "已停止";
  return "未运行";
});
</script>

<style scoped lang="scss">
.mediaNode {
  min-width: 280px;
  min-height: 220px;
  user-select: none;
  cursor: default;

  &.dialogMode {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .titleBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: grab;
  }

  .titleInfo,
  .actions,
  .metaRow,
  .runtime,
  .audioPreview {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-weight: 600;
  }

  .previewBox {
    height: 128px;
    margin: 12px 0;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #f3efe5 0%, #ece9e2 100%);
    border: 1px solid var(--td-border-level-1-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .previewImage,
  .previewVideo,
  .dialogImage,
  .dialogVideo {
    width: 100%;
    height: 100%;
  }

  .emptyState {
    color: var(--td-text-color-placeholder);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .promptText {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .runtimeMs {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }

  &.dialogMode {
    .titleBar {
      cursor: default;
    }

    .promptText {
      display: block;
      -webkit-line-clamp: unset;
    }
  }
}

.dialogPreview {
  min-height: 60vh;
}
</style>
