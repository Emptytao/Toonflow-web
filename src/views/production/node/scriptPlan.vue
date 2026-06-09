<template>
  <t-card :class="['scriptPlan', { dialogMode: isDialogMode }]">
    <NodeResizer v-if="!isDialogMode" :min-width="240" :min-height="160" line-class-name="resizeLine" handle-class-name="resizeHandle" />
    <div class="titleBar pr" :class="{ dragHandle: !isDialogMode }">
      <div class="title c">{{ $t("workbench.production.node.scriptPlan.title") }}</div>
      <div class="actions">
        <nodeExpandButton v-if="!isDialogMode" :node-id="props.id" />
        <t-button size="small" variant="text" @click="openEdit">{{ $t("workbench.production.edit") }}</t-button>
      </div>
      <Handle v-if="!isDialogMode" :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <Handle v-if="!isDialogMode" :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="content">
      <t-empty v-if="!scriptPlan" style="margin-top: 16px"></t-empty>
      <MdPreview v-else v-model="scriptPlan" :theme="mdTheme" />
    </div>
  </t-card>

  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('workbench.production.node.scriptPlan.editDialog')"
    :width="'90vw'"
    :confirm-btn="$t('workbench.production.save')"
    :cancel-btn="$t('workbench.production.cancel')"
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onCancel"
    :close-on-overlay-click="false"
    placement="center"
    attach="body">
    <MdEditor
      v-model="editContent"
      :theme="mdTheme"
      :toolbars="toolbars"
      :footers="[]"
      style="height: 72vh"
      @onUploadImg="() => {}"
      @drop.prevent
      @paste="onPaste" />
  </t-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import { MdEditor, MdPreview } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
import nodeExpandButton from "../components/nodeExpandButton.vue";
const { themeSetting } = storeToRefs(settingStore());
const mdTheme = computed<"light" | "dark">(() => (themeSetting.value.mode === "dark" ? "dark" : "light"));

const props = withDefaults(
  defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
  renderMode?: "node" | "dialog";
}>(),
  {
    renderMode: "node",
  },
);

const scriptPlan = defineModel<string>({ required: true });
const editContent = ref("");
const dialogVisible = ref(false);
const isDialogMode = computed(() => props.renderMode === "dialog");

const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

function openEdit() {
  editContent.value = scriptPlan.value ?? "";
  dialogVisible.value = true;
}

function onConfirm() {
  scriptPlan.value = editContent.value;
  dialogVisible.value = false;
}

function onCancel() {
  dialogVisible.value = false;
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}
</script>

<style lang="scss" scoped>
.scriptPlan {
  max-width: 100vw;
  width: fit-content;
  min-width: 200px;
  user-select: text;
  cursor: default;

  &.dialogMode {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .titleBar {
    cursor: grab;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 8px;

    :deep(.md-editor) {
      border: none;
    }
  }

  &.dialogMode {
    .titleBar {
      cursor: default;
    }
  }
}
</style>
