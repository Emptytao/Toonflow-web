<template>
  <div class="flowShell" @dblclick.capture="handleCanvasDblClick" @dragover.prevent @drop.prevent="handleDrop">
    <VueFlow
      id="mainFlowBox"
      class="flowMain"
      :class="{ 'is-interacting': isInteracting && otherSetting.interacting, 'space-dragging': isSpacePressed }"
      v-model:nodes="flowNodes"
      v-model:edges="flowEdges"
      :nodes-draggable="!isSpacePressed"
      :nodes-connectable="!isSpacePressed"
      :elements-selectable="!isSpacePressed"
      :max-zoom="10"
      :min-zoom="0.05"
      :pan-on-drag="true"
      fit-view-on-init
      :pan-on-scroll="canvasWheelEvent == 'scroll'"
      :zoom-on-scroll="canvasWheelEvent == 'zoom'"
      :selection-key-code="true"
      multi-selection-key-code="Control"
      delete-key-code="null"
      :default-edge-options="{ type: 'graphEdge' }"
      :selection-mode="SelectionMode.Partial"
      @mousedown="onSpaceMouseDown"
      @pane-ready="onPaneReady"
      @pane-click="handlePaneClick"
      @pane-mouse-move="recordPointer"
      @connect="handleConnect"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @move-start="startInteracting"
      @move-end="stopInteracting"
      @selection-start="startInteracting"
      @selection-end="stopInteracting"
      @node-drag-start="handleNodeDragStart"
      @node-drag-stop="handleNodeDragStop"
      @edge-double-click="handleEdgeDoubleClick">
      <template #node-script="props">
        <scriptNode :id="props.id" v-model="flowData.script" :handleIds="props.data.handleIds" />
      </template>
      <template #node-scriptPlan="props">
        <scriptPlan :id="props.id" v-model="flowData.scriptPlan" :handleIds="props.data.handleIds" />
      </template>
      <template #node-storyboardTable="props">
        <storyboardTable :id="props.id" v-model="flowData.storyboardTable" :handleIds="props.data.handleIds" />
      </template>
      <template #node-assets="props">
        <assets :id="props.id" v-model="flowData.assets" :handleIds="props.data.handleIds" />
      </template>
      <template #node-storyboard="props">
        <storyboard :id="props.id" v-model="flowData.storyboard" :assetsData="flowData.assets" :handleIds="props.data.handleIds" />
      </template>
      <template #node-workbench="props">
        <workbenchNode :id="props.id" v-model="flowData.workbench" :handleIds="props.data.handleIds" />
      </template>
      <template #node-media="props">
        <mediaNode :id="props.id" :data="props.data" :selected="props.selected" />
      </template>
      <template #node-prompt="props">
        <promptNode :id="props.id" :data="props.data" :selected="props.selected" />
      </template>
      <template #node-loop="props">
        <loopNode :id="props.id" :data="props.data" :selected="props.selected" />
      </template>
      <template #node-imageGroup="props">
        <imageGroupNode :id="props.id" :data="props.data" :selected="props.selected" />
      </template>
      <template #edge-graphEdge="edgeProps">
        <graphEdge v-bind="edgeProps" />
      </template>

      <Background />
      <MiniMap pannable zoomable :node-color="miniMapColor" mask-color="rgba(244, 240, 230, 0.72)" @nodeClick="handleMiniMapNodeClick" />
      <Controls />

      <div class="floatingWindow">
        <div class="episodesSelect f ac">
          <t-select
            :value="episodesId"
            :placeholder="$t('workbench.production.selectPlaceholder')"
            autoWidth
            :options="episodesOptions"
            filterable
            @change="handleEpisodesChange">
            <template #label>
              <i-document-folder size="24" />
            </template>
          </t-select>
          <t-tooltip placement="bottom" theme="primary" content="刷新当前画布">
            <t-button class="guide-refresh-btn" @click="refreshEpisodeData(false)" variant="outline">
              <template #icon>
                <i-refresh size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="自动布局">
            <t-button class="guide-layout-btn" @click="layoutGraph()" variant="outline">
              <template #icon>
                <i-tree-diagram size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="总览">
            <t-button @click="fitView({ duration: 300 })" variant="outline">
              <template #icon>
                <i-full-screen-play size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="定位到当前节点">
            <t-button @click="focusSelectedNode" variant="outline">
              <template #icon>
                <i-locate size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="导入媒体">
            <t-button @click="openFileDialog" variant="outline">
              <template #icon>
                <i-upload size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="图片编组">
            <t-button :disabled="selectedMediaNodeCount < 2" @click="graphStore.groupSelectedMediaNodes()" variant="outline">
              <template #icon>
                <i-folder-plus size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip placement="bottom" theme="primary" content="解组当前图片组">
            <t-button :disabled="graphStore.activeNode?.type !== 'imageGroup'" @click="graphStore.activeNode && graphStore.ungroupNode(graphStore.activeNode.id)" variant="outline">
              <template #icon>
                <i-folder-minus size="16" />
              </template>
            </t-button>
          </t-tooltip>
          <i-loading-four class="spin" size="16" style="margin-left: 0.5rem" v-show="loading || graphStore.loading || graphStore.saving" />
        </div>

        <div class="rightPanelDock">
          <t-tooltip placement="bottom" theme="primary" content="AI 助手">
            <button class="dockBtn" :class="{ active: activeRightPanel === 'chat' }" @click.stop="toggleRightPanel('chat')">
              <robot-one theme="outline" size="20" />
            </button>
          </t-tooltip>
        </div>

        <composerPanel v-if="graphStore.composerNode" />

        <transition name="slide" v-if="episodesId && activeRightPanel === 'chat'">
          <rightChatBox :title="title" v-model="flowData" @close="activeRightPanel = ''" />
        </transition>
      </div>
    </VueFlow>

    <div v-if="createMenu.visible" class="createMenu" :style="{ left: `${createMenu.screenX}px`, top: `${createMenu.screenY}px` }">
      <div class="menuTitle">创建节点</div>
      <div class="menuItem" @click="createNodeAtMenu('media')">图片 / 视频节点</div>
      <div class="menuItem" @click="createNodeAtMenu('prompt')">提示词节点</div>
      <div class="menuItem" @click="createNodeAtMenu('loop')">循环节点</div>
      <div class="menuItem" @click="openFileDialog">导入媒体</div>
    </div>

    <input ref="uploadInputRef" class="hiddenUpload" type="file" accept="image/*,video/*,audio/*" multiple @change="handleFileInputChange" />
    <expandedNodeDialog :node="expandedNode" :flow-data="flowData" @close="graphStore.closeExpandedNode()" />
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import { SelectionMode, VueFlow, useVueFlow } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import "@vue-flow/minimap/dist/style.css";
import "@vue-flow/node-resizer/dist/style.css";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import productionAgentStore from "@/stores/productionAgent";
import useProductionGraphStore from "@/stores/productionGraph";
import type { Connection, EdgeChange, NodeChange } from "@vue-flow/core";
import type { GraphMediaItem, GraphNodeType, MediaNodeData, ProductionEdge, ProductionNode } from "./graph/types";
import { createGraphNode, getNodeOutputItems } from "./graph/types";
import { useLayout } from "./utils/dagre";
import scriptNode from "./node/script.vue";
import scriptPlan from "./node/scriptPlan.vue";
import assets from "./node/assets.vue";
import storyboardTable from "./node/storyboardTable.vue";
import storyboard from "./node/storyboard.vue";
import workbenchNode from "./node/workbench.vue";
import mediaNode from "./node/media.vue";
import promptNode from "./node/prompt.vue";
import loopNode from "./node/loop.vue";
import imageGroupNode from "./node/imageGroup.vue";
import graphEdge from "./components/graphEdge.vue";
import composerPanel from "./components/composer.vue";
import expandedNodeDialog from "./components/expandedNodeDialog.vue";
import rightChatBox from "./components/rightChatBox/index.vue";
import { RobotOne } from "@icon-park/vue-next";

const { project } = storeToRefs(projectStore());
const { canvasWheelEvent, otherSetting } = storeToRefs(settingStore());
const agentStore = productionAgentStore();
const { episodesId, flowData, status } = storeToRefs(agentStore);
const graphStore = useProductionGraphStore();

provide("episodesId", episodesId);

const flowNodes = computed({
  get: () => graphStore.nodes,
  set: (value) => graphStore.setNodes(value as ProductionNode[]),
});
const flowEdges = computed({
  get: () => graphStore.edges,
  set: (value) => graphStore.setEdges(value as ProductionEdge[]),
});

const {
  fitView,
  setCenter,
  getViewport,
  setViewport,
  screenToFlowCoordinate,
  getNodes,
  getIntersectingNodes,
  updateNodeInternals,
} = useVueFlow({ id: "mainFlowBox" });
const { layout } = useLayout("mainFlowBox");

const loading = ref(false);
const activeRightPanel = ref<"" | "chat">("chat");
const uploadInputRef = ref<HTMLInputElement | null>(null);
const episodesOptions = ref<{ label: string; value: number }[]>([]);
const createMenu = reactive({
  visible: false,
  screenX: 0,
  screenY: 0,
  flowX: 0,
  flowY: 0,
});
const lastPointerFlowPosition = ref({ x: 200, y: 200 });

const selectedMediaNodeCount = computed(() => graphStore.selectedNodes.filter((node) => node.type === "media").length);
const title = computed(() => episodesOptions.value.find((option) => option.value === episodesId.value)?.label ?? "");
const expandedNode = computed(() => graphStore.nodes.find((node) => node.id === graphStore.expandedNodeId));

const miniMapColor = (node: ProductionNode) => {
  if (node.type === "prompt") return "#f0b15a";
  if (node.type === "loop") return "#5a9cf0";
  if (node.type === "imageGroup") return "#67b08b";
  if (node.type === "media") return "#d9785b";
  return "#262626";
};

const isSpacePressed = ref(false);
let dragOrigin = { x: 0, y: 0, vx: 0, vy: 0 };

function onSpaceMouseDown(e: MouseEvent) {
  if (!isSpacePressed.value || e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const vp = getViewport();
  dragOrigin = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
  document.addEventListener("mousemove", onSpaceMouseMove);
  document.addEventListener("mouseup", onSpaceMouseUp, { once: true });
}
function onSpaceMouseMove(e: MouseEvent) {
  void setViewport({
    x: dragOrigin.vx + e.clientX - dragOrigin.x,
    y: dragOrigin.vy + e.clientY - dragOrigin.y,
    zoom: getViewport().zoom,
  });
}
function onSpaceMouseUp() {
  document.removeEventListener("mousemove", onSpaceMouseMove);
}

useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    isSpacePressed.value = true;
  }
});
useEventListener(document, "keyup", (e: KeyboardEvent) => {
  if (e.code === "Space") isSpacePressed.value = false;
});

const isInteracting = ref(false);
let interactionTimer: ReturnType<typeof setTimeout> | null = null;
function startInteracting() {
  if (interactionTimer) clearTimeout(interactionTimer);
  isInteracting.value = true;
}
function stopInteracting() {
  if (interactionTimer) clearTimeout(interactionTimer);
  interactionTimer = setTimeout(() => {
    isInteracting.value = false;
  }, 140);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "VIDEO", "AUDIO"].includes(target.tagName);
}

function getCenterFlowPosition() {
  return screenToFlowCoordinate({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
}

async function layoutGraph(direction: "LR" | "TB" = "LR") {
  await nextTick();
  updateNodeInternals(graphStore.nodes.map((node) => node.id));
  await nextTick();
  graphStore.captureHistory();
  const nextNodes = layout(graphStore.nodes as any, graphStore.edges as any, direction) as ProductionNode[];
  graphStore.setNodes(nextNodes);
  await nextTick();
  await fitView({ duration: 300 });
}

async function getScriptData() {
  const { data: scriptRes } = await axios.post("/script/getScrptApi", {
    projectId: project.value?.id,
    name: "",
  });
  episodesOptions.value = (scriptRes ?? []).map((ep: any) => ({
    label: ep.name,
    value: ep.id,
  }));
  if (!episodesId.value && episodesOptions.value.length) {
    episodesId.value = episodesOptions.value[0].value;
  }
  if (episodesId.value) {
    await refreshEpisodeData(true);
  }
}

async function refreshEpisodeData(fit = false) {
  if (!episodesId.value) return;
  loading.value = true;
  try {
    await Promise.all([agentStore.getFlowData(), graphStore.loadGraph(episodesId.value)]);
    agentStore.updateContext();
    await agentStore.getHistory();
    await nextTick();
    if (fit) {
      await fitView({ duration: 300 });
    }
  } finally {
    loading.value = false;
  }
}

function confirmEpisodesSwitch() {
  if (status.value !== "pending" && status.value !== "streaming") {
    return Promise.resolve(true);
  }
  return new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: $t("workbench.production.confirm"),
      body: $t("workbench.production.confirmEpisodesSwitch"),
      confirmBtn: $t("workbench.production.save"),
      cancelBtn: $t("workbench.production.cancel"),
      theme: "warning",
      onConfirm: () => {
        dialog.destroy();
        resolve(true);
      },
      onCancel: () => {
        dialog.destroy();
        resolve(false);
      },
      onClose: () => {
        dialog.destroy();
        resolve(false);
      },
    });
  });
}

function handleEpisodesChange(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const nextEpisodesId = Number(rawValue);
  if (!Number.isFinite(nextEpisodesId) || nextEpisodesId === episodesId.value) return;
  void (async () => {
    if (!(await confirmEpisodesSwitch())) return;
    episodesId.value = nextEpisodesId;
    await refreshEpisodeData(true);
  })();
}

function handlePaneClick() {
  graphStore.clearSelection();
  createMenu.visible = false;
}

function recordPointer(event: MouseEvent) {
  lastPointerFlowPosition.value = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  });
}

function createNodeAtMenu(type: GraphNodeType) {
  graphStore.addNode(type, { x: createMenu.flowX, y: createMenu.flowY }, {
    width: type === "prompt" ? 320 : type === "loop" ? 300 : type === "imageGroup" ? 320 : 300,
    height: type === "prompt" ? 320 : type === "loop" ? 280 : type === "imageGroup" ? 260 : 260,
    data: createGraphNode(type, { x: 0, y: 0 }).data,
  });
  createMenu.visible = false;
}

function handleCanvasDblClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest(".vue-flow__pane")) return;
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  });
  createMenu.screenX = event.clientX;
  createMenu.screenY = event.clientY;
  createMenu.flowX = position.x;
  createMenu.flowY = position.y;
  createMenu.visible = true;
}

function handleConnect(connection: Connection) {
  graphStore.connectNodes(connection);
}

function handleNodesChange(changes: NodeChange[]) {
  const nextSelectedNodeIds = new Set(graphStore.selectedNodeIds);
  let changed = false;
  changes.forEach((change) => {
    if (change.type !== "select") return;
    changed = true;
    if (change.selected) {
      nextSelectedNodeIds.add(change.id);
    } else {
      nextSelectedNodeIds.delete(change.id);
    }
  });
  if (changed) {
    graphStore.syncSelection(Array.from(nextSelectedNodeIds), [...graphStore.selectedEdgeIds]);
  }
}

function handleEdgesChange(changes: EdgeChange[]) {
  const nextSelectedEdgeIds = new Set(graphStore.selectedEdgeIds);
  let changed = false;
  changes.forEach((change) => {
    if (change.type !== "select") return;
    changed = true;
    if (change.selected) {
      nextSelectedEdgeIds.add(change.id);
    } else {
      nextSelectedEdgeIds.delete(change.id);
    }
  });
  if (changed) {
    graphStore.syncSelection([...graphStore.selectedNodeIds], Array.from(nextSelectedEdgeIds));
  }
}

function handleEdgeDoubleClick(event: any) {
  const edgeId = event?.edge?.id ?? event?.id;
  if (edgeId) {
    graphStore.removeEdgesByIds([edgeId]);
  }
}

function focusSelectedNode() {
  const node = graphStore.activeNode;
  if (!node) {
    void fitView({ duration: 300 });
    return;
  }
  const width = typeof node.width === "number" ? node.width : 240;
  const height = typeof node.height === "number" ? node.height : 160;
  void setCenter(node.position.x + width / 2, node.position.y + height / 2, { duration: 300, zoom: Math.max(getViewport().zoom, 0.7) });
}

function handleMiniMapNodeClick(event: any) {
  const node = event?.node;
  if (!node) return;
  graphStore.syncSelection([node.id], []);
  focusSelectedNode();
}

function toggleRightPanel(panel: "chat") {
  activeRightPanel.value = activeRightPanel.value === panel ? "" : panel;
}

const altDragState = reactive<{
  active: boolean;
  nodeIds: string[];
  origin: { x: number; y: number } | null;
}>({
  active: false,
  nodeIds: [],
  origin: null,
});

function handleNodeDragStart(event: any) {
  startInteracting();
  graphStore.captureHistory();
  const draggedNodes: ProductionNode[] = event?.nodes ?? (event?.node ? [event.node] : []);
  if (event?.event?.altKey && draggedNodes.length) {
    altDragState.active = true;
    altDragState.nodeIds = draggedNodes.map((node) => node.id);
    altDragState.origin = { ...draggedNodes[0].position };
  } else {
    altDragState.active = false;
    altDragState.nodeIds = [];
    altDragState.origin = null;
  }
}

async function handleNodeDragStop(event: any) {
  stopInteracting();
  const draggedNodes: ProductionNode[] = event?.nodes ?? (event?.node ? [event.node] : []);
  if (altDragState.active && altDragState.origin && draggedNodes.length) {
    const current = draggedNodes[0].position;
    graphStore.duplicateNodes(altDragState.nodeIds, {
      x: altDragState.origin.x - current.x,
      y: altDragState.origin.y - current.y,
    });
  }
  altDragState.active = false;
  altDragState.nodeIds = [];
  altDragState.origin = null;

  draggedNodes.forEach((node) => {
    if (node.type !== "media") return;
    const intersects = getIntersectingNodes(node as any, true).filter((item) => item.id !== node.id && item.type === "imageGroup");
    if (intersects.length) {
      graphStore.mergeNodeIntoGroup(node.id, intersects[0].id);
    }
  });
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function appendItemsToActiveMedia(items: GraphMediaItem[]) {
  const active = graphStore.activeNode;
  if (!active || active.type !== "media") return false;
  const currentItems = ((active.data as any).items ?? []) as GraphMediaItem[];
  graphStore.updateNodeData(active.id, {
    items: [...currentItems, ...items],
    mode: items.some((item) => item.fileType === "video") ? "video" : (active.data as any).mode,
  });
  return true;
}

async function consumeFiles(files: File[], position?: { x: number; y: number }, preferAppend = false) {
  if (!files.length) return;
  const uploadItems: GraphMediaItem[] = [];
  for (const file of files) {
    const base64Data = await fileToBase64(file);
    const uploaded = await graphStore.uploadMedia(base64Data);
    uploadItems.push({
      id: crypto.randomUUID(),
      fileType: uploaded.fileType,
      url: uploaded.url,
      label: file.name,
      createdAt: Date.now(),
    });
  }
  if (preferAppend && (await appendItemsToActiveMedia(uploadItems))) {
    return;
  }
  const targetPos = position ?? lastPointerFlowPosition.value ?? getCenterFlowPosition();
  uploadItems.forEach((item, index) => {
    const baseMediaData = createGraphNode("media", { x: 0, y: 0 }).data as MediaNodeData;
    graphStore.addNode("media", { x: targetPos.x + index * 28, y: targetPos.y + index * 28 }, {
      width: 320,
      height: 260,
      data: {
        ...baseMediaData,
        items: [item],
        mode: item.fileType === "video" ? "video" : "image",
      } as MediaNodeData,
    });
  });
}

function openFileDialog() {
  createMenu.visible = false;
  uploadInputRef.value?.click();
}

async function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  await consumeFiles(files, lastPointerFlowPosition.value);
  input.value = "";
}

async function handleDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  });
  await consumeFiles(files, position);
}

useEventListener(document, "paste", async (event: ClipboardEvent) => {
  if (!episodesId.value) return;
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  event.preventDefault();
  await consumeFiles(files, lastPointerFlowPosition.value, true);
});

useEventListener(document, "keydown", async (event: KeyboardEvent) => {
  if (isTypingTarget(event.target)) return;
  const ctrl = event.ctrlKey || event.metaKey;
  if (ctrl && event.key.toLowerCase() === "c") {
    event.preventDefault();
    graphStore.copySelection();
    return;
  }
  if (ctrl && event.key.toLowerCase() === "v") {
    event.preventDefault();
    graphStore.pasteClipboard(lastPointerFlowPosition.value || getCenterFlowPosition());
    return;
  }
  if (ctrl && event.key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    graphStore.undo();
    return;
  }
  if ((ctrl && event.key.toLowerCase() === "y") || (ctrl && event.shiftKey && event.key.toLowerCase() === "z")) {
    event.preventDefault();
    graphStore.redo();
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    graphStore.deleteSelection();
  }
});

watch(
  () => graphStore.composerNode,
  (value) => {
    if (value) {
      activeRightPanel.value = "";
    }
  },
);

onMounted(async () => {
  await getScriptData();
});

function onPaneReady() {
  void fitView({ duration: 300 });
}
</script>

<style lang="scss" scoped>
.flowShell {
  position: relative;
  width: 100%;
  height: 100%;
}

.flowMain {
  height: 100%;

  &.space-dragging {
    cursor: grab !important;
    :deep(*) {
      cursor: grab !important;
    }
  }

  .floatingWindow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
}

.episodesSelect {
  position: absolute;
  top: 10px;
  left: 0;
  z-index: 9999;
  gap: 8px;
}

.rightPanelDock {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10010;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
}

.dockBtn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #1f2937;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.22s ease,
    color 0.22s ease,
    transform 0.22s ease,
    box-shadow 0.22s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
    transform: translateY(-1px);
  }

  &.active {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #fff;
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.28);
  }
}

.createMenu {
  position: fixed;
  z-index: 10020;
  min-width: 180px;
  padding: 8px;
  border-radius: 14px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-1-color);
  box-shadow: var(--td-shadow-2);
}

.menuTitle {
  padding: 6px 10px;
  font-weight: 600;
  font-size: 13px;
}

.menuItem {
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    background: var(--td-bg-color-secondarycontainer);
  }
}

.hiddenUpload {
  display: none;
}

:deep(.slide-enter-active),
:deep(.slide-leave-active) {
  transition: transform 0.3s ease-out;
}

:deep(.slide-enter-from) {
  transform: translateX(100%);
}

:deep(.slide-leave-to) {
  transform: translateX(100%);
}

.flowMain.is-interacting {
  :deep(.vue-flow__node) {
    will-change: transform;
    contain: layout style paint;
  }

  :deep(.vue-flow__transformationpane) {
    will-change: transform;
  }
}

$handleSize: 12px;

:deep(.source),
:deep(.target) {
  width: $handleSize;
  height: $handleSize;
}

:deep(.dragHandle) {
  padding: 4px;
  border-radius: 4px;

  &:hover {
    cursor: move;
    backdrop-filter: brightness(0.96);
  }
}

:deep(.resizeHandle) {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #111;
  border: 2px solid #fff;
}

:deep(.resizeLine) {
  border-color: rgba(17, 17, 17, 0.25);
}
</style>
