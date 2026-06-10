<template>
  <div class="production-v2-page">
    <div class="board-shell">
      <div class="floating-toolbar floating-card">
        <t-select
          :value="episodesId"
          class="episode-select"
          :options="episodesOptions"
          filterable
          auto-width
          placeholder="选择剧集"
          @change="handleEpisodeChange" />
      </div>

      <button
        v-if="!referenceDrawerVisible"
        class="reference-drawer-trigger floating-card"
        aria-label="打开引用抽屉"
        title="打开引用抽屉"
        @click="toggleReferenceDrawer()">
        <span class="drawer-trigger-icon" aria-hidden="true">≡</span>
      </button>

      <transition name="drawer-slide">
        <div v-if="referenceDrawerVisible" class="reference-drawer floating-card">
          <button class="drawer-close-button" aria-label="关闭引用抽屉" @click="toggleReferenceDrawer(false)">×</button>

          <div class="drawer-tabs">
            <button
              v-for="section in drawerSections"
              :key="section.key"
              class="drawer-tab"
              :class="{ active: drawerSection === section.key }"
              @click="changeDrawerSection(section.key)">
              <span>{{ section.label }}</span>
              <span class="drawer-tab-count">{{ section.count }}</span>
            </button>
          </div>

          <div class="drawer-toolbar">
            <t-input v-model="activeDrawerKeyword" size="small" placeholder="搜索当前菜单内容" clearable />
          </div>

          <div class="drawer-subtabs">
            <button
              v-for="item in activeDrawerSecondaryTabs"
              :key="item.key"
              class="drawer-subtab"
              :class="{ active: activeDrawerSecondaryKey === item.key }"
              @click="changeDrawerSecondaryKey(item.key)">
              <span>{{ item.label }}</span>
              <span class="drawer-tab-count">{{ item.count }}</span>
            </button>
          </div>

          <div class="drawer-library">
            <div class="drawer-panel drawer-list-panel">
              <div class="drawer-panel-head">
                <div>
                  <div class="drawer-panel-title">{{ activeDrawerSectionLabel }}</div>
                  <div class="drawer-panel-subtitle">{{ activeDrawerSecondaryLabel }}</div>
                </div>
                <div class="drawer-panel-count">{{ activeDrawerListItems.length }} 项</div>
              </div>

              <div class="drawer-list">
                <button
                  v-for="item in activeDrawerListItems"
                  :key="item.id"
                  class="drawer-list-item"
                  :class="{ selected: activeDrawerSelectedId === item.id }"
                  @click="selectDrawerItem(item.id)">
                  <div class="drawer-list-item-body">
                    <div
                      v-if="item.previewUrl && (item.previewKind === 'image' || item.previewKind === 'video')"
                      class="drawer-list-item-preview"
                      :class="`kind-${item.previewKind}`">
                      <img v-if="item.previewKind === 'image'" :src="item.previewUrl" :alt="item.title" loading="lazy" />
                      <video v-else-if="item.previewKind === 'video'" :src="item.previewUrl" muted playsinline preload="metadata" />
                    </div>
                    <div class="drawer-list-item-topline">
                      <div class="drawer-list-item-title">{{ item.title }}</div>
                      <span v-if="item.badge" class="drawer-list-item-badge">{{ item.badge }}</span>
                    </div>
                    <div class="drawer-list-item-subtitle">{{ item.subtitle }}</div>
                    <div class="drawer-list-item-summary">{{ item.summary }}</div>
                    <div v-if="item.meta?.length" class="drawer-list-item-meta">
                      <span v-for="meta in item.meta" :key="meta">{{ meta }}</span>
                    </div>
                    <div v-if="item.tags?.length" class="drawer-chip-row">
                      <span v-for="tag in item.tags" :key="tag" class="drawer-chip">{{ tag }}</span>
                    </div>
                  </div>
                </button>
                <div v-if="!activeDrawerListItems.length" class="drawer-empty">{{ activeDrawerEmptyText }}</div>
              </div>
            </div>

            <div class="drawer-panel drawer-detail-panel">
              <template v-if="drawerSection === 'assets' && selectedAssetGroup">
                <div class="drawer-detail-head">
                  <div>
                    <div class="drawer-detail-title">{{ selectedAssetGroup.title }}</div>
                    <div class="drawer-detail-subtitle">{{ selectedAssetGroup.subtitle || "当前资产主体" }}</div>
                  </div>
                  <div class="drawer-chip-row">
                    <span class="drawer-chip">{{ getAssetCategoryLabel(selectedAssetGroup.libraryCategory) }}</span>
                    <span class="drawer-chip">{{ selectedAssetGroup.nativeItems.length }} 个原生资产</span>
                    <span class="drawer-chip">{{ selectedAssetGroup.derivedItems.length }} 个衍生资产</span>
                  </div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">资产详情</div>
                  <div class="drawer-detail-text">{{ selectedAssetGroup.detailText || selectedAssetGroup.summary || "当前主体暂无补充说明。" }}</div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">原生资产</div>
                  <div class="drawer-reference-list">
                    <div v-for="asset in selectedAssetGroup.nativeItems" :key="asset.id" class="drawer-reference-item">
                      <div v-if="asset.url && asset.fileType !== 'audio'" class="drawer-reference-preview" :class="`kind-${asset.fileType}`">
                        <img v-if="asset.fileType === 'image'" :src="asset.url" :alt="asset.label" loading="lazy" />
                        <video v-else-if="asset.fileType === 'video'" :src="asset.url" muted playsinline preload="metadata" />
                      </div>
                      <div class="drawer-reference-body">
                        <div class="drawer-reference-title">{{ asset.label }}</div>
                        <div class="drawer-reference-subtitle">{{ getAssetItemSubtitle(asset) }}</div>
                        <div class="drawer-reference-summary">{{ getAssetItemSummary(asset) }}</div>
                        <div class="drawer-chip-row">
                          <span class="drawer-chip">{{ getAssetOriginLabel(asset.assetOrigin) }}</span>
                          <span class="drawer-chip">{{ getFileTypeLabel(asset.fileType) }}</span>
                          <span v-if="asset.state" class="drawer-chip">{{ asset.state }}</span>
                        </div>
                      </div>
                      <button class="drawer-action" @click="sendAssetItem(asset)">发送到画布</button>
                    </div>
                    <div v-if="!selectedAssetGroup.nativeItems.length" class="drawer-empty inline-empty">当前主体暂无原生资产</div>
                  </div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">衍生资产</div>
                  <div class="drawer-reference-list">
                    <div v-for="asset in selectedAssetGroup.derivedItems" :key="asset.id" class="drawer-reference-item">
                      <div v-if="asset.url && asset.fileType !== 'audio'" class="drawer-reference-preview" :class="`kind-${asset.fileType}`">
                        <img v-if="asset.fileType === 'image'" :src="asset.url" :alt="asset.label" loading="lazy" />
                        <video v-else-if="asset.fileType === 'video'" :src="asset.url" muted playsinline preload="metadata" />
                      </div>
                      <div class="drawer-reference-body">
                        <div class="drawer-reference-title">{{ asset.label }}</div>
                        <div class="drawer-reference-subtitle">{{ getAssetItemSubtitle(asset) }}</div>
                        <div class="drawer-reference-summary">{{ getAssetItemSummary(asset) }}</div>
                        <div class="drawer-chip-row">
                          <span class="drawer-chip">{{ getAssetOriginLabel(asset.assetOrigin) }}</span>
                          <span class="drawer-chip">{{ getFileTypeLabel(asset.fileType) }}</span>
                          <span v-if="asset.state" class="drawer-chip">{{ asset.state }}</span>
                        </div>
                      </div>
                      <button class="drawer-action" @click="sendAssetItem(asset)">发送到画布</button>
                    </div>
                    <div v-if="!selectedAssetGroup.derivedItems.length" class="drawer-empty inline-empty">当前主体暂无衍生资产</div>
                  </div>
                </div>
              </template>

              <template v-else-if="drawerSection === 'prompts' && selectedPromptItem">
                <div class="drawer-detail-head">
                  <div>
                    <div class="drawer-detail-title">{{ selectedPromptItem.label }}</div>
                    <div class="drawer-detail-subtitle">{{ selectedPromptItem.subtitle || "当前提示词引用" }}</div>
                  </div>
                  <div class="drawer-chip-row">
                    <span class="drawer-chip">{{ getPromptCategoryLabel(selectedPromptItem.libraryCategory) }}</span>
                    <span class="drawer-chip">{{ getPromptSourceLabel(selectedPromptItem.sourceType) }}</span>
                  </div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">提示词正文</div>
                  <div class="drawer-detail-text prompt">{{ selectedPromptItem.text }}</div>
                </div>
                <div class="drawer-detail-actions">
                  <button class="drawer-action primary" @click="sendPromptItem(selectedPromptItem)">发送到画布</button>
                </div>
              </template>

              <template v-else-if="drawerSection === 'workflows' && selectedWorkflowItem">
                <div class="drawer-detail-head">
                  <div>
                    <div class="drawer-detail-title">{{ selectedWorkflowItem.title }}</div>
                    <div class="drawer-detail-subtitle">{{ selectedWorkflowItem.subtitle || selectedWorkflowItem.state }}</div>
                  </div>
                  <div class="drawer-chip-row">
                    <span class="drawer-chip">{{ selectedWorkflowItem.state }}</span>
                    <span class="drawer-chip">{{ selectedWorkflowItem.imageCount }} 张图片输入</span>
                    <span class="drawer-chip">{{ selectedWorkflowItem.history.length }} 条结果</span>
                  </div>
                </div>

                <template v-if="activeDrawerSecondaryKey === 'overview'">
                  <div class="drawer-detail-stats">
                    <div class="drawer-stat-card">
                      <span class="drawer-stat-label">当前状态</span>
                      <strong>{{ selectedWorkflowItem.state }}</strong>
                    </div>
                    <div class="drawer-stat-card">
                      <span class="drawer-stat-label">当前结果</span>
                      <strong>{{ selectedWorkflowItem.selectedVideo ? "已选中" : "未出片" }}</strong>
                    </div>
                    <div class="drawer-stat-card">
                      <span class="drawer-stat-label">引用素材</span>
                      <strong>{{ selectedWorkflowItem.mediaReferences.length }} 项</strong>
                    </div>
                  </div>
                  <div class="drawer-detail-section">
                    <div class="drawer-detail-label">当前视频</div>
                    <div class="drawer-detail-text">
                      {{ selectedWorkflowItem.selectedVideo?.label || "当前工作流还没有选中的视频结果。" }}
                    </div>
                  </div>
                  <div class="drawer-detail-section">
                    <div class="drawer-detail-label">视频提示词</div>
                    <div class="drawer-detail-text prompt">{{ selectedWorkflowItem.prompt || "当前工作流尚未填写提示词。" }}</div>
                  </div>
                  <div class="drawer-detail-actions">
                    <button class="drawer-action" :disabled="!selectedWorkflowItem.selectedVideo" @click="sendWorkflowSelectedVideo(selectedWorkflowItem)">
                      发送当前视频
                    </button>
                    <button class="drawer-action primary" @click="sendWorkflowBundle(selectedWorkflowItem)">发送整条工作流</button>
                  </div>
                </template>

                <template v-else-if="activeDrawerSecondaryKey === 'references'">
                  <div class="drawer-reference-list">
                    <div v-for="reference in selectedWorkflowItem.mediaReferences" :key="reference.id" class="drawer-reference-item">
                      <div class="drawer-reference-body">
                        <div class="drawer-reference-title">{{ reference.label }}</div>
                        <div class="drawer-reference-subtitle">{{ reference.subtitle || getFileTypeLabel(reference.fileType) }}</div>
                        <div class="drawer-reference-summary">{{ reference.url || "当前素材只保留引用快照。" }}</div>
                        <div class="drawer-chip-row">
                          <span class="drawer-chip">{{ getFileTypeLabel(reference.fileType) }}</span>
                          <span class="drawer-chip">{{ reference.sourceType === "assets" ? "资产" : "分镜" }}</span>
                        </div>
                      </div>
                      <button class="drawer-action" @click="sendPaletteReferenceItem(reference)">发送到画布</button>
                    </div>
                    <div v-if="!selectedWorkflowItem.mediaReferences.length" class="drawer-empty inline-empty">当前工作流暂无引用素材</div>
                  </div>
                </template>

                <template v-else>
                  <div class="workflow-history-list detail-mode">
                    <div v-for="history in selectedWorkflowItem.history" :key="history.id" class="workflow-history-item">
                      <div class="workflow-history-topline">
                        <div class="workflow-history-meta">
                          <span>{{ history.selected ? "当前选中" : "历史结果" }}</span>
                          <span>{{ history.state }}</span>
                        </div>
                        <div class="workflow-history-time">{{ formatDrawerHistoryTime(history.createdAt) }}</div>
                      </div>
                      <div class="drawer-detail-text">{{ history.label || history.url || "当前结果暂无视频地址。" }}</div>
                      <div v-if="history.errorReason" class="drawer-detail-text">{{ history.errorReason }}</div>
                      <div class="drawer-detail-actions compact">
                        <button class="drawer-action" :disabled="!history.url" @click="sendWorkflowHistoryVideo(selectedWorkflowItem, history)">
                          发送该结果
                        </button>
                      </div>
                    </div>
                    <div v-if="!selectedWorkflowItem.history.length" class="drawer-empty inline-empty">当前工作流暂无历史结果</div>
                  </div>
                </template>
              </template>

              <template v-else-if="drawerSection === 'storyboards' && selectedStoryboardItem">
                <div class="drawer-detail-head">
                  <div>
                    <div class="drawer-detail-title">{{ selectedStoryboardItem.label }}</div>
                    <div class="drawer-detail-subtitle">{{ selectedStoryboardItem.subtitle || "分镜参考" }}</div>
                  </div>
                  <div class="drawer-chip-row">
                    <span class="drawer-chip">{{ activeDrawerSecondaryLabel }}</span>
                  </div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">{{ activeDrawerSecondaryKey === "copy" ? "文案解析" : "镜头说明" }}</div>
                  <div class="drawer-detail-text prompt">
                    {{ selectedStoryboardItem.promptText || selectedStoryboardItem.subtitle || "当前分镜暂无文案解析。" }}
                  </div>
                </div>
                <div class="drawer-detail-section">
                  <div class="drawer-detail-label">来源</div>
                  <div class="drawer-detail-text">{{ selectedStoryboardItem.imageItem.url || "当前分镜只保留引用快照。" }}</div>
                </div>
                <div class="drawer-detail-actions">
                  <button class="drawer-action primary" @click="sendStoryboardImage(selectedStoryboardItem)">发送图片</button>
                  <button v-if="selectedStoryboardItem.promptText" class="drawer-action" @click="sendStoryboardPrompt(selectedStoryboardItem)">发送文案</button>
                </div>
              </template>

              <div v-else class="drawer-detail-empty">
                <div class="drawer-empty">{{ activeDrawerEmptyText }}</div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <div
        ref="boardRef"
        class="board"
        @mousedown="handleBoardMouseDown"
        @dblclick="handleBoardDoubleClick"
        @wheel.prevent="handleBoardWheel"
        @dragover.prevent
        @drop.prevent="handleBoardDrop">
        <svg class="links-layer" width="100%" height="100%" preserveAspectRatio="none">
          <g v-for="edge in renderedEdges" :key="edge.id">
            <path
              class="edge-hit"
              :d="edge.path"
              @mouseenter="hoveredEdgeId = edge.id"
              @mouseleave="hoveredEdgeId = hoveredEdgeId === edge.id ? '' : hoveredEdgeId"
              @click.stop="store.selectEdge(edge.id, $event.ctrlKey || $event.metaKey)"
              @dblclick.stop="store.removeEdge(edge.id)" />
            <path class="edge-line" :class="{ selected: store.selectedEdgeIds.includes(edge.id) }" :d="edge.path" />
          </g>
          <g v-if="tempEdgePath">
            <path class="edge-hit temp" :d="tempEdgePath" />
            <path class="edge-line temp" :d="tempEdgePath" />
          </g>
        </svg>

        <div class="edge-controls-layer">
          <template v-for="edge in renderedEdges" :key="`${edge.id}-controls`">
            <button
              class="edge-anchor-button"
              :class="[edge.kind, hoveredEdgeId === edge.id ? 'hovered' : '', store.selectedEdgeIds.includes(edge.id) ? 'selected' : '']"
              :style="{ left: `${edge.center.x}px`, top: `${edge.center.y}px` }"
              @mouseenter="hoveredEdgeId = edge.id"
              @mouseleave="hoveredEdgeId = hoveredEdgeId === edge.id ? '' : hoveredEdgeId"
              @click.stop="store.selectEdge(edge.id, $event.ctrlKey || $event.metaKey)" />
            <button
              v-if="store.selectedEdgeIds.includes(edge.id)"
              class="edge-delete-button"
              :style="{ left: `${edge.center.x}px`, top: `${edge.center.y - 22}px` }"
              @mouseenter="hoveredEdgeId = edge.id"
              @mouseleave="hoveredEdgeId = hoveredEdgeId === edge.id ? '' : hoveredEdgeId"
              @click.stop="store.removeEdge(edge.id)">
              ×
            </button>
          </template>
        </div>

        <div class="world" :style="worldStyle">
          <div class="nodes-layer">
            <div
              v-for="node in store.nodes"
              :key="node.id"
              class="canvas-node"
              :class="[`type-${node.type}`, store.selectedNodeIds.includes(node.id) ? 'selected' : '']"
              :style="nodeStyle(node)"
              :data-node-id="node.id"
              @mousedown.stop="handleNodeMouseDown(node, $event)">
              <component
                :is="resolveNodeComponent(node.type)"
                :node="node"
                :data="node.data"
                :selected="store.selectedNodeIds.includes(node.id)"
                @expand="store.openExpandedNode(node.id)"
                @delete="deleteNode(node.id)"
                @edit="openNodeEditor(node.id)"
                @open-workflow="handleVideoNodeActivate(node.id)" />

              <button
                v-for="port in getNodePorts(node.type)"
                :key="port.id"
                class="port"
                :class="[port.kind, port.side]"
                :style="portStyle(port.id)"
                :data-node-id="node.id"
                :data-port-id="port.id"
                :data-port-role="port.role"
                @mousedown.stop="port.role === 'output' ? handlePortMouseDown(node, port.id, $event) : undefined" />
            </div>
          </div>
        </div>

        <div class="overlay-layer">
          <div v-if="selectionBox.visible" class="selection-box" :style="selectionBoxStyle" />
          <div
            v-if="createMenu.visible"
            class="create-menu"
            :style="{ left: `${createMenu.screenX}px`, top: `${createMenu.screenY}px` }">
            <div class="menu-title">Create</div>
            <button class="menu-item" @click="createNodeFromMenu('media')">图片节点</button>
            <button class="menu-item" @click="createNodeFromMenu('prompt')">文本节点</button>
            <button class="menu-item" @click="createNodeFromMenu('video')">视频节点</button>
          </div>
          <div
            v-if="editorPromptNode"
            class="text-node-popup floating-card"
            :style="editorPopupStyle"
            @mousedown.stop>
            <div class="text-node-popup-head">
              <span>编辑文本节点</span>
              <button class="text-node-popup-close" @click="closeNodeEditor">×</button>
            </div>
            <div class="text-node-editor">
              <input
                class="text-node-input"
                v-model="editorPromptTitleDraft"
                placeholder="节点名称"
                @input="editorPromptDirty = true" />
              <textarea
                class="text-node-textarea"
                v-model="editorPromptTextDraft"
                placeholder="输入文本内容"
                @input="editorPromptDirty = true" />
            </div>
          </div>
        </div>

        <div class="minimap floating-card" @mousedown.stop="handleMinimapMouseDown">
          <div class="minimap-content">
            <div v-for="item in minimapNodes" :key="item.id" class="minimap-node" :class="{ selected: store.selectedNodeIds.includes(item.id) }" :style="item.style" />
            <div v-if="minimapNodes.length" class="minimap-viewport" :style="minimapViewportStyle" />
            <div v-else class="minimap-empty">EMPTY</div>
          </div>
        </div>
      </div>
    </div>

    <t-dialog
      class="expanded-node-dialog"
      :visible="Boolean(expandedNode)"
      :header="false"
      :footer="false"
      :width="expandedDialogLayout.width"
      destroy-on-close
      @close="store.closeExpandedNode()">
      <div class="expanded-node-dialog-body" :style="expandedDialogLayout">
        <component
          v-if="expandedNode"
          :is="resolveNodeComponent(expandedNode.type)"
          :node="expandedNode"
          :data="expandedNode.data"
          :dialog-mode="true"
          :selected="false"
          @expand="void 0"
          @delete="deleteNode(expandedNode.id)" />
      </div>
    </t-dialog>

    <VideoWorkflowPanel
      v-if="workflowPanelNode"
      :node="workflowPanelNode"
      :panel-style="workflowPanelStyle"
      @expand="store.openExpandedNode(workflowPanelNode.id)"
      @close="store.clearSelection()" />

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useEventListener, useResizeObserver } from "@vueuse/core";
import { LoadingFour as ILoadingFour } from "@icon-park/vue-next";
import projectStore from "@/stores/project";
import axios from "@/utils/axios";
import useProductionCanvasV2Store from "@/stores/productionCanvasV2";
import { buildBezierPath, getBezierPoint, getPortWorldPoint, rectsIntersect, screenToWorld, worldToScreen, zoomAtPoint } from "./core/geometry";
import { EXPANDED_DIALOG_RATIO, SMALL_POPUP_RATIO, fitAspectRatioToBounds } from "./core/layout";
import { getDefaultNodeSize } from "./core/nodeRegistry";
import MediaNode from "./nodes/MediaNode.vue";
import PromptNode from "./nodes/PromptNode.vue";
import LoopNode from "./nodes/LoopNode.vue";
import VideoNode from "./nodes/VideoNode.vue";
import VideoWorkflowPanel from "./panels/VideoWorkflowPanel.vue";
import type {
  CanvasV2ReferencePaletteItem,
  CanvasV2DrawerSectionKey,
  CanvasV2FileType,
  CanvasV2Node,
  CanvasV2NodeType,
  DrawerAssetCategoryKey,
  DrawerAssetItem,
  DrawerLibraryState,
  DrawerListItemViewModel,
  DrawerPromptItem,
  DrawerPromptCategoryKey,
  DrawerSection,
  DrawerSecondaryTab,
  DrawerStoryboardItem,
  DrawerStoryboardSecondaryKey,
  DrawerWorkflowHistoryItem,
  DrawerWorkflowSecondaryKey,
  DrawerWorkflowItem,
  PromptNodeDataV2,
  VideoNodeDataV2,
} from "./types";

type AssetDrawerGroup = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  detailText: string;
  libraryCategory: DrawerAssetCategoryKey;
  rootAssetId: number | null;
  rootAssetName: string;
  nativeItems: DrawerAssetItem[];
  derivedItems: DrawerAssetItem[];
};

const store = useProductionCanvasV2Store();
const { project } = storeToRefs(projectStore());
const route = useRoute();

const boardRef = ref<HTMLDivElement | null>(null);
const boardSize = reactive({ width: 0, height: 0 });
const liveViewport = ref({ x: 0, y: 0, zoom: 1 });
const episodesId = ref<number>(0);
const episodesOptions = ref<Array<{ label: string; value: number }>>([]);
const referenceDrawerVisible = ref(true);
const drawerSection = ref<CanvasV2DrawerSectionKey>("assets");
const editorNodeId = ref("");
const editorPromptTitleDraft = ref("");
const editorPromptTextDraft = ref("");
const editorPromptDirty = ref(false);
const drawerLibraryState = reactive<Record<CanvasV2DrawerSectionKey, DrawerLibraryState>>({
  assets: {
    keyword: "",
    secondaryKey: "role",
    selectedItemId: "",
  },
  prompts: {
    keyword: "",
    secondaryKey: "character",
    selectedItemId: "",
  },
  workflows: {
    keyword: "",
    secondaryKey: "overview",
    selectedItemId: "",
  },
  storyboards: {
    keyword: "",
    secondaryKey: "frames",
    selectedItemId: "",
  },
});

const assetCategoryLabelMap: Record<DrawerAssetCategoryKey, string> = {
  role: "角色",
  tool: "道具",
  scene: "场景",
  clip: "素材",
  audio: "音频",
  uncategorized: "未分类",
};

const promptCategoryLabelMap: Record<DrawerPromptCategoryKey, string> = {
  character: "角色",
  composition: "构图",
  camera: "运镜",
  style: "风格",
  lighting: "光影",
  other: "其他",
};

const promptSourceLabelMap = {
  track: "工作流",
  asset: "资产",
  storyboard: "分镜",
} as const;

const workflowSecondaryLabelMap: Record<DrawerWorkflowSecondaryKey, string> = {
  overview: "概览",
  references: "引用素材",
  history: "历史结果",
};

const storyboardSecondaryLabelMap: Record<DrawerStoryboardSecondaryKey, string> = {
  frames: "镜头卡",
  copy: "文案解析",
};

const createMenu = reactive({
  visible: false,
  screenX: 0,
  screenY: 0,
  worldX: 0,
  worldY: 0,
});
const spawnCursorByType = reactive<Record<CanvasV2NodeType, number>>({
  media: 0,
  prompt: 0,
  loop: 0,
  video: 0,
});

const panState = reactive({
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});

const selectionBox = reactive({
  visible: false,
  additive: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
});

const dragState = reactive<{
  active: boolean;
  moved: boolean;
  startWorldX: number;
  startWorldY: number;
  nodeIds: string[];
  positions: Record<string, { x: number; y: number }>;
}>({
  active: false,
  moved: false,
  startWorldX: 0,
  startWorldY: 0,
  nodeIds: [],
  positions: {},
});

const connectState = reactive<{
  active: boolean;
  sourceNodeId: string;
  sourcePort: string;
  x: number;
  y: number;
}>({
  active: false,
  sourceNodeId: "",
  sourcePort: "",
  x: 0,
  y: 0,
});

const minimapDrag = reactive({
  active: false,
});
const hoveredEdgeId = ref("");

const componentMap: Record<CanvasV2NodeType, any> = {
  media: MediaNode,
  prompt: PromptNode,
  loop: LoopNode,
  video: VideoNode,
};

const typeSpawnOffsets: Record<CanvasV2NodeType, { x: number; y: number }> = {
  media: { x: -360, y: -120 },
  prompt: { x: -360, y: 90 },
  loop: { x: -360, y: 300 },
  video: { x: 120, y: -10 },
};

const worldStyle = computed(() => ({
  transform: `translate(${liveViewport.value.x}px, ${liveViewport.value.y}px) scale(${liveViewport.value.zoom})`,
}));

const drawerSections = computed<DrawerSection[]>(() => [
  {
    key: "assets",
    label: "资产",
    count: buildAssetGroups([
      ...store.referenceDrawer.assets.image,
      ...store.referenceDrawer.assets.video,
      ...store.referenceDrawer.assets.audio,
    ]).length,
  },
  {
    key: "prompts",
    label: "提示词",
    count: store.referenceDrawer.prompts.length,
  },
  {
    key: "workflows",
    label: "视频工作流",
    count: store.referenceDrawer.workflows.length,
  },
  {
    key: "storyboards",
    label: "分镜/参考",
    count: store.referenceDrawer.storyboards.length,
  },
]);

const activeDrawerSectionLabel = computed(() => {
  const current = drawerSections.value.find((item) => item.key === drawerSection.value);
  return current?.label || "引用抽屉";
});

const activeDrawerState = computed(() => drawerLibraryState[drawerSection.value]);

const activeDrawerKeyword = computed({
  get: () => activeDrawerState.value.keyword,
  set: (value: string) => {
    activeDrawerState.value.keyword = value;
  },
});

const activeDrawerSecondaryKey = computed({
  get: () => activeDrawerState.value.secondaryKey,
  set: (value: string) => {
    activeDrawerState.value.secondaryKey = value;
  },
});

const activeDrawerSelectedId = computed({
  get: () => activeDrawerState.value.selectedItemId,
  set: (value: string) => {
    activeDrawerState.value.selectedItemId = value;
  },
});

const activeEpisodeLabel = computed(() => {
  const current = episodesOptions.value.find((item) => item.value === episodesId.value);
  return current?.label || (episodesId.value ? `第 ${episodesId.value} 集` : "当前剧集");
});

function matchDrawerKeyword(keyword: string, values: Array<string | undefined>) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(normalizedKeyword));
}

function getFileTypeLabel(fileType: CanvasV2FileType) {
  if (fileType === "video") return "视频";
  if (fileType === "audio") return "音频";
  return "图片";
}

function getAssetCategoryLabel(category: DrawerAssetCategoryKey) {
  return assetCategoryLabelMap[category] || assetCategoryLabelMap.uncategorized;
}

function getAssetOriginLabel(origin?: DrawerAssetItem["assetOrigin"]) {
  return origin === "derived" ? "衍生资产" : "原生资产";
}

function getAssetItemSubtitle(item: DrawerAssetItem) {
  return item.subtitle || `${getAssetOriginLabel(item.assetOrigin)} · ${getFileTypeLabel(item.fileType)}`;
}

function getAssetItemSummary(item: DrawerAssetItem) {
  return item.detailText || item.prompt || item.subtitle || "当前资产暂无详情。";
}

function getPromptCategoryLabel(category: DrawerPromptCategoryKey) {
  return promptCategoryLabelMap[category] || promptCategoryLabelMap.other;
}

function getPromptSourceLabel(sourceType: DrawerPromptItem["sourceType"]) {
  return promptSourceLabelMap[sourceType] || "提示词";
}

function getWorkflowPreviewUrl(item: DrawerWorkflowItem) {
  return item.selectedVideo?.url || item.imageReferences[0]?.url || item.mediaReferences[0]?.url || "";
}

function getWorkflowPreviewKind(item: DrawerWorkflowItem): CanvasV2FileType | "text" {
  if (item.selectedVideo?.url) return "video";
  const referenceItem = item.imageReferences[0] || item.mediaReferences[0];
  return referenceItem?.fileType || "text";
}

const allDrawerAssetItems = computed<DrawerAssetItem[]>(() => [
  ...store.referenceDrawer.assets.image,
  ...store.referenceDrawer.assets.video,
  ...store.referenceDrawer.assets.audio,
]);

function buildAssetGroups(items: DrawerAssetItem[]) {
  const groupMap = new Map<string, AssetDrawerGroup>();
  items.forEach((item) => {
    const rootAssetId = item.rootAssetId ?? item.sourceId ?? null;
    const rootAssetName = String(item.rootAssetName || item.label || (rootAssetId ? `资产 ${rootAssetId}` : "未命名资产"));
    const groupId = `asset-group-${rootAssetId ?? item.sourceId}`;
    const existing = groupMap.get(groupId);
    if (!existing) {
      groupMap.set(groupId, {
        id: groupId,
        title: rootAssetName,
        subtitle: `${getAssetCategoryLabel(item.libraryCategory)}主体`,
        summary: getAssetItemSummary(item),
        detailText: item.detailText || item.prompt || item.subtitle || "",
        libraryCategory: item.libraryCategory,
        rootAssetId,
        rootAssetName,
        nativeItems: item.assetOrigin === "derived" ? [] : [item],
        derivedItems: item.assetOrigin === "derived" ? [item] : [],
      });
      return;
    }

    if (item.assetOrigin === "derived") {
      existing.derivedItems.push(item);
    } else {
      existing.nativeItems.push(item);
    }
    if (!existing.detailText && item.detailText) {
      existing.detailText = item.detailText;
    }
    if (!existing.summary) {
      existing.summary = getAssetItemSummary(item);
    }
  });

  return Array.from(groupMap.values())
    .map((group) => {
      const primaryNative = group.nativeItems[0];
      const primaryItem = primaryNative || group.derivedItems[0];
      return {
        ...group,
        subtitle: primaryNative?.subtitle || primaryItem?.subtitle || `${getAssetCategoryLabel(group.libraryCategory)}主体`,
        summary: group.detailText || getAssetItemSummary(primaryItem),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

const assetSecondaryTabs = computed<DrawerSecondaryTab[]>(() => {
  const baseTabs: DrawerSecondaryTab[] = ["role", "tool", "scene", "clip", "audio"].map((key) => ({
    key,
    label: assetCategoryLabelMap[key as DrawerAssetCategoryKey],
    count: buildAssetGroups(allDrawerAssetItems.value.filter((item) => item.libraryCategory === key)).length,
  }));
  const uncategorizedCount = buildAssetGroups(allDrawerAssetItems.value.filter((item) => item.libraryCategory === "uncategorized")).length;
  if (uncategorizedCount || drawerLibraryState.assets.secondaryKey === "uncategorized") {
    baseTabs.push({
      key: "uncategorized",
      label: assetCategoryLabelMap.uncategorized,
      count: uncategorizedCount,
    });
  }
  return baseTabs;
});

const promptSecondaryTabs = computed<DrawerSecondaryTab[]>(() =>
  ["character", "composition", "camera", "style", "lighting", "other"].map((key) => ({
    key,
    label: promptCategoryLabelMap[key as DrawerPromptCategoryKey],
    count: store.referenceDrawer.prompts.filter((item) => item.libraryCategory === key).length,
  })),
);

const workflowSecondaryTabs = computed<DrawerSecondaryTab[]>(() => [
  {
    key: "overview",
    label: workflowSecondaryLabelMap.overview,
    count: store.referenceDrawer.workflows.length,
  },
  {
    key: "references",
    label: workflowSecondaryLabelMap.references,
    count: store.referenceDrawer.workflows.reduce((total, item) => total + item.mediaReferences.length, 0),
  },
  {
    key: "history",
    label: workflowSecondaryLabelMap.history,
    count: store.referenceDrawer.workflows.reduce((total, item) => total + item.history.length, 0),
  },
]);

const storyboardSecondaryTabs = computed<DrawerSecondaryTab[]>(() => [
  {
    key: "frames",
    label: storyboardSecondaryLabelMap.frames,
    count: store.referenceDrawer.storyboards.length,
  },
  {
    key: "copy",
    label: storyboardSecondaryLabelMap.copy,
    count: store.referenceDrawer.storyboards.filter((item) => item.promptText).length,
  },
]);

const activeDrawerSecondaryTabs = computed<DrawerSecondaryTab[]>(() => {
  if (drawerSection.value === "assets") return assetSecondaryTabs.value;
  if (drawerSection.value === "prompts") return promptSecondaryTabs.value;
  if (drawerSection.value === "workflows") return workflowSecondaryTabs.value;
  return storyboardSecondaryTabs.value;
});

const activeDrawerSecondaryLabel = computed(() => {
  const current = activeDrawerSecondaryTabs.value.find((item) => item.key === activeDrawerSecondaryKey.value);
  return current?.label || "全部";
});

const filteredAssetItems = computed<DrawerAssetItem[]>(() => {
  const secondaryKey = drawerLibraryState.assets.secondaryKey as DrawerAssetCategoryKey;
  return allDrawerAssetItems.value.filter((item) => item.libraryCategory === secondaryKey);
});

const filteredAssetGroups = computed<AssetDrawerGroup[]>(() => {
  const keyword = drawerLibraryState.assets.keyword;
  return buildAssetGroups(filteredAssetItems.value).filter((group) =>
    matchDrawerKeyword(keyword, [
      group.title,
      group.subtitle,
      group.summary,
      group.detailText,
      getAssetCategoryLabel(group.libraryCategory),
      ...group.nativeItems.flatMap((item) => [item.label, item.subtitle, item.prompt, item.detailText]),
      ...group.derivedItems.flatMap((item) => [item.label, item.subtitle, item.prompt, item.detailText]),
    ]),
  );
});

const filteredPromptItems = computed<DrawerPromptItem[]>(() => {
  const keyword = drawerLibraryState.prompts.keyword;
  const secondaryKey = drawerLibraryState.prompts.secondaryKey as DrawerPromptCategoryKey;
  return store.referenceDrawer.prompts.filter(
    (item) =>
      item.libraryCategory === secondaryKey &&
      matchDrawerKeyword(keyword, [item.label, item.subtitle, item.text, getPromptCategoryLabel(item.libraryCategory), getPromptSourceLabel(item.sourceType)]),
  );
});

const filteredWorkflowItems = computed<DrawerWorkflowItem[]>(() => {
  const keyword = drawerLibraryState.workflows.keyword;
  return store.referenceDrawer.workflows.filter((item) =>
    matchDrawerKeyword(keyword, [
      item.title,
      item.subtitle,
      item.prompt,
      item.state,
      item.selectedVideo?.state,
      ...item.mediaReferences.map((reference) => reference.label),
      ...item.history.map((history) => history.state),
    ]),
  );
});

const filteredStoryboardItems = computed<DrawerStoryboardItem[]>(() => {
  const keyword = drawerLibraryState.storyboards.keyword;
  const secondaryKey = drawerLibraryState.storyboards.secondaryKey as DrawerStoryboardSecondaryKey;
  return store.referenceDrawer.storyboards.filter((item) => {
    if (secondaryKey === "copy" && !item.promptText) return false;
    return matchDrawerKeyword(keyword, [item.label, item.subtitle, item.promptText]);
  });
});

const selectedAssetGroup = computed<AssetDrawerGroup | null>(() => filteredAssetGroups.value.find((item) => item.id === activeDrawerSelectedId.value) || null);
const selectedPromptItem = computed<DrawerPromptItem | null>(() => filteredPromptItems.value.find((item) => item.id === activeDrawerSelectedId.value) || null);
const selectedWorkflowItem = computed<DrawerWorkflowItem | null>(() => filteredWorkflowItems.value.find((item) => item.id === activeDrawerSelectedId.value) || null);
const selectedStoryboardItem = computed<DrawerStoryboardItem | null>(() => filteredStoryboardItems.value.find((item) => item.id === activeDrawerSelectedId.value) || null);

const activeDrawerListItems = computed<DrawerListItemViewModel[]>(() => {
  if (drawerSection.value === "assets") {
    return filteredAssetGroups.value.map((group) => ({
      id: group.id,
      title: group.title,
      subtitle: group.subtitle || `${getAssetCategoryLabel(group.libraryCategory)}主体`,
      summary: group.summary || "当前主体暂无详情",
      badge: `${group.nativeItems.length + group.derivedItems.length} 项`,
      previewUrl: group.nativeItems[0]?.url || group.derivedItems[0]?.url || "",
      previewKind: group.nativeItems[0]?.fileType || group.derivedItems[0]?.fileType || "text",
      meta: [`${group.nativeItems.length} 个原生资产`, `${group.derivedItems.length} 个衍生资产`],
      tags: [getAssetCategoryLabel(group.libraryCategory)],
    }));
  }
  if (drawerSection.value === "prompts") {
    return filteredPromptItems.value.map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: item.subtitle || getPromptSourceLabel(item.sourceType),
      summary: item.text,
      badge: getPromptSourceLabel(item.sourceType),
      previewUrl: item.previewUrl,
      previewKind: item.previewUrl ? "image" : "text",
      meta: [getPromptCategoryLabel(item.libraryCategory)],
      tags: [getPromptCategoryLabel(item.libraryCategory), getPromptSourceLabel(item.sourceType)],
    }));
  }
  if (drawerSection.value === "workflows") {
    return filteredWorkflowItems.value.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle || item.state,
      summary: item.prompt || "当前工作流尚未填写提示词",
      badge: item.state,
      previewUrl: getWorkflowPreviewUrl(item),
      previewKind: getWorkflowPreviewKind(item),
      meta: [`${item.imageCount} 张图片输入`, `${item.history.length} 条历史结果`],
      tags: [item.state, `轨道 #${item.trackId}`],
    }));
  }
  return filteredStoryboardItems.value.map((item) => ({
    id: item.id,
    title: item.label,
    subtitle: item.subtitle || "分镜参考",
    summary: item.promptText || "当前分镜暂无文案解析",
    badge: activeDrawerSecondaryKey.value === "copy" ? "文案" : "镜头",
    previewUrl: item.imageItem.url,
    previewKind: "image",
    meta: [activeDrawerSecondaryLabel.value],
    tags: [activeDrawerSecondaryLabel.value],
  }));
});

const activeDrawerEmptyText = computed(() => {
  if (drawerSection.value === "assets") {
    return `当前剧集暂无可查看的${activeDrawerSecondaryLabel.value}主体`;
  }
  if (drawerSection.value === "prompts") {
    return `当前剧集暂无可发送的${activeDrawerSecondaryLabel.value}提示词`;
  }
  if (drawerSection.value === "workflows") {
    return "当前剧集暂无视频工作流数据";
  }
  return activeDrawerSecondaryKey.value === "copy" ? "当前剧集暂无可解析的分镜文案" : "当前剧集暂无可发送的分镜参考";
});

watch(
  activeDrawerSecondaryTabs,
  (tabs) => {
    if (!tabs.length) {
      activeDrawerSecondaryKey.value = "";
      return;
    }
    if (!tabs.some((item) => item.key === activeDrawerSecondaryKey.value)) {
      activeDrawerSecondaryKey.value = tabs[0].key;
    }
  },
  { immediate: true, deep: true },
);

watch(
  activeDrawerListItems,
  (items) => {
    if (!items.length) {
      activeDrawerSelectedId.value = "";
      return;
    }
    if (!items.some((item) => item.id === activeDrawerSelectedId.value)) {
      activeDrawerSelectedId.value = items[0].id;
    }
  },
  { immediate: true, deep: true },
);

function selectDrawerItem(itemId: string) {
  activeDrawerSelectedId.value = itemId;
}

function changeDrawerSection(sectionKey: CanvasV2DrawerSectionKey) {
  drawerSection.value = sectionKey;
}

function changeDrawerSecondaryKey(key: string) {
  activeDrawerSecondaryKey.value = key;
}

function sendPaletteReferenceItem(item: CanvasV2ReferencePaletteItem) {
  closeNodeEditor();
  store.createMediaNodeFromPaletteItem(item, getSuggestedSpawnPosition(item.fileType === "video" ? "video" : "media"), {
    exactPosition: true,
  });
}

const expandedNode = computed(() => store.nodes.find((node) => node.id === store.expandedNodeId) || null);
const workflowPanelNode = computed<CanvasV2Node<VideoNodeDataV2> | null>(() => {
  const node = store.activeNode;
  if (!node || node.type !== "video") return null;
  return node as CanvasV2Node<VideoNodeDataV2>;
});

function getAnchoredPopupSize(maxWidth: number, maxHeight: number, minWidth: number, minHeight: number) {
  return fitAspectRatioToBounds(
    SMALL_POPUP_RATIO,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,
  );
}

const workflowPanelStyle = computed(() => {
  if (!workflowPanelNode.value || !boardRef.value) return {};
  const boardRect = boardRef.value.getBoundingClientRect();
  const popupSize = getAnchoredPopupSize(
    Math.min(760, window.innerWidth - 24, Math.max(420, boardSize.width * 0.56)),
    Math.min(360, window.innerHeight - 24, Math.max(180, boardSize.height * 0.42)),
    420,
    180,
  );
  const bottomAnchor = worldToScreen(
    {
      x: workflowPanelNode.value.position.x + workflowPanelNode.value.size.width / 2,
      y: workflowPanelNode.value.position.y + workflowPanelNode.value.size.height,
    },
    liveViewport.value,
  );
  const topAnchor = worldToScreen(
    {
      x: workflowPanelNode.value.position.x + workflowPanelNode.value.size.width / 2,
      y: workflowPanelNode.value.position.y,
    },
    liveViewport.value,
  );
  const maxLeft = Math.max(12, window.innerWidth - popupSize.width - 12);
  const left = Math.min(maxLeft, Math.max(12, boardRect.left + bottomAnchor.x - popupSize.width / 2));
  const belowTop = boardRect.top + bottomAnchor.y + 14;
  const belowSpace = window.innerHeight - belowTop - 12;
  const aboveSpace = boardRect.top + topAnchor.y - 26;
  const preferBelow = belowSpace >= popupSize.height || belowSpace >= aboveSpace;
  const top = preferBelow
    ? belowTop
    : Math.max(12, boardRect.top + topAnchor.y - popupSize.height - 14);
  return {
    width: `${popupSize.width}px`,
    height: `${popupSize.height}px`,
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
  };
});

function toggleReferenceDrawer(nextVisible?: boolean) {
  referenceDrawerVisible.value = typeof nextVisible === "boolean" ? nextVisible : !referenceDrawerVisible.value;
}

const editorPromptNode = computed<CanvasV2Node<PromptNodeDataV2> | null>(() => {
  const node = store.nodes.find((item) => item.id === editorNodeId.value);
  if (!node || node.type !== "prompt") return null;
  return node as CanvasV2Node<PromptNodeDataV2>;
});
const editorPopupStyle = computed(() => {
  if (!editorPromptNode.value) return {};
  const popupSize = getAnchoredPopupSize(
    Math.min(720, Math.max(360, boardSize.width - 32)),
    Math.min(320, Math.max(150, boardSize.height - 32)),
    360,
    150,
  );
  const anchor = worldToScreen(
    {
      x: editorPromptNode.value.position.x + editorPromptNode.value.size.width / 2,
      y: editorPromptNode.value.position.y + editorPromptNode.value.size.height,
    },
    liveViewport.value,
  );
  const topAnchor = worldToScreen(
    {
      x: editorPromptNode.value.position.x + editorPromptNode.value.size.width / 2,
      y: editorPromptNode.value.position.y,
    },
    liveViewport.value,
  );
  const maxLeft = Math.max(16, boardSize.width - popupSize.width - 16);
  const left = Math.min(maxLeft, Math.max(16, anchor.x - popupSize.width / 2));
  let top = anchor.y + 16;
  if (top + popupSize.height > boardSize.height - 16) {
    top = Math.max(16, topAnchor.y - popupSize.height - 16);
  }
  return {
    width: `${popupSize.width}px`,
    height: `${popupSize.height}px`,
    left: `${left}px`,
    top: `${top}px`,
  };
});
const expandedDialogLayout = computed(() => {
  const maxWidth = Math.min(window.innerWidth - 96, Math.max(560, boardSize.width - 32 || 0));
  const maxHeight = Math.min(window.innerHeight - 120, Math.max(320, boardSize.height - 24 || 0));
  const size = fitAspectRatioToBounds(EXPANDED_DIALOG_RATIO, maxWidth, maxHeight, 560, 320);
  return {
    width: `${size.width}px`,
    height: `${size.height}px`,
  };
});

const renderedEdges = computed(() =>
  store.edges
    .map((edge) => {
      const sourceNode = store.nodes.find((node) => node.id === edge.source);
      const targetNode = store.nodes.find((node) => node.id === edge.target);
      if (!sourceNode || !targetNode) return null;
      const sourcePortId = edge.sourcePort || (edge.kind === "prompt" ? "promptOut" : edge.kind === "loop" ? "loopOut" : "mediaOut");
      const targetPortId = edge.targetPort || (edge.kind === "prompt" ? "promptIn" : edge.kind === "loop" ? "loopIn" : "mediaIn");
      const sourcePort = worldToScreen(getPortWorldPoint(sourceNode, sourcePortId), liveViewport.value);
      const targetPort = worldToScreen(getPortWorldPoint(targetNode, targetPortId), liveViewport.value);
      return {
        ...edge,
        start: sourcePort,
        end: targetPort,
        path: buildBezierPath(sourcePort, targetPort),
        center: getBezierPoint(sourcePort, targetPort, 0.5),
      };
    })
    .filter(Boolean) as Array<{ id: string; kind: string; path: string; center: { x: number; y: number }; start: { x: number; y: number }; end: { x: number; y: number } }>,
);

const tempEdgePath = computed(() => {
  if (!connectState.active) return "";
  const sourceNode = store.nodes.find((node) => node.id === connectState.sourceNodeId);
  if (!sourceNode) return "";
  const start = worldToScreen(getPortWorldPoint(sourceNode, connectState.sourcePort), liveViewport.value);
  return buildBezierPath(start, { x: connectState.x, y: connectState.y });
});

const selectionBoxStyle = computed(() => {
  const left = Math.min(selectionBox.startX, selectionBox.currentX);
  const top = Math.min(selectionBox.startY, selectionBox.currentY);
  const width = Math.abs(selectionBox.currentX - selectionBox.startX);
  const height = Math.abs(selectionBox.currentY - selectionBox.startY);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

const contentBounds = computed(() => {
  if (!store.nodes.length) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  }
  const xs = store.nodes.flatMap((node) => [node.position.x, node.position.x + node.size.width]);
  const ys = store.nodes.flatMap((node) => [node.position.y, node.position.y + node.size.height]);
  return {
    minX: Math.min(...xs) - 120,
    minY: Math.min(...ys) - 120,
    maxX: Math.max(...xs) + 120,
    maxY: Math.max(...ys) + 120,
  };
});

const minimapNodes = computed(() => {
  const width = 188 - 16;
  const height = 126 - 16;
  const bounds = contentBounds.value;
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(width / worldWidth, height / worldHeight);
  const ox = (width - worldWidth * scale) / 2;
  const oy = (height - worldHeight * scale) / 2;
  return store.nodes.map((node) => ({
    id: node.id,
    style: {
      left: `${ox + (node.position.x - bounds.minX) * scale}px`,
      top: `${oy + (node.position.y - bounds.minY) * scale}px`,
      width: `${Math.max(3, node.size.width * scale)}px`,
      height: `${Math.max(3, node.size.height * scale)}px`,
    },
  }));
});

const minimapViewportStyle = computed(() => {
  const width = 188 - 16;
  const height = 126 - 16;
  const bounds = contentBounds.value;
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(width / worldWidth, height / worldHeight);
  const ox = (width - worldWidth * scale) / 2;
  const oy = (height - worldHeight * scale) / 2;
  const worldViewLeft = -liveViewport.value.x / liveViewport.value.zoom;
  const worldViewTop = -liveViewport.value.y / liveViewport.value.zoom;
  const worldViewWidth = boardSize.width / liveViewport.value.zoom;
  const worldViewHeight = boardSize.height / liveViewport.value.zoom;
  return {
    left: `${ox + (worldViewLeft - bounds.minX) * scale}px`,
    top: `${oy + (worldViewTop - bounds.minY) * scale}px`,
    width: `${Math.max(10, worldViewWidth * scale)}px`,
    height: `${Math.max(10, worldViewHeight * scale)}px`,
  };
});

function resolveNodeComponent(type: CanvasV2NodeType) {
  return componentMap[type];
}

function getBoardPoint(event: MouseEvent | DragEvent) {
  const rect = boardRef.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getWorldPoint(event: MouseEvent | DragEvent) {
  return screenToWorld(getBoardPoint(event), liveViewport.value);
}

function getVisibleBoardArea() {
  const rect = boardRef.value?.getBoundingClientRect();
  if (!rect) {
    return {
      left: 0,
      top: 0,
      width: boardSize.width,
      height: boardSize.height,
    };
  }
  const left = Math.max(0, -rect.left);
  const top = Math.max(0, -rect.top);
  const right = Math.max(left, Math.min(rect.width, window.innerWidth - rect.left));
  const bottom = Math.max(top, Math.min(rect.height, window.innerHeight - rect.top));
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getViewportCenterWorldPoint() {
  const visibleArea = getVisibleBoardArea();
  return screenToWorld(
    {
      x: visibleArea.left + visibleArea.width / 2,
      y: visibleArea.top + visibleArea.height / 2,
    },
    liveViewport.value,
  );
}

function nodeStyle(node: CanvasV2Node) {
  return {
    width: `${node.size.width}px`,
    height: `${node.size.height}px`,
    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
  };
}

function portStyle(portId: string) {
  if (portId === "promptIn") return { top: "38%" };
  if (portId === "mediaIn") return { top: "62%" };
  if (portId === "loopIn") return { top: "76%" };
  return { top: "50%" };
}

function getNodePorts(type: CanvasV2NodeType) {
  if (type === "media") {
    return [
      { id: "promptIn", role: "input", side: "left", kind: "prompt" },
      { id: "mediaIn", role: "input", side: "left", kind: "media" },
      { id: "mediaOut", role: "output", side: "right", kind: "media" },
    ];
  }
  if (type === "prompt") {
    return [
      { id: "promptIn", role: "input", side: "left", kind: "prompt" },
      { id: "mediaIn", role: "input", side: "left", kind: "media" },
      { id: "promptOut", role: "output", side: "right", kind: "prompt" },
    ];
  }
  if (type === "video") {
    return [
      { id: "promptIn", role: "input", side: "left", kind: "prompt" },
      { id: "mediaIn", role: "input", side: "left", kind: "media" },
    ];
  }
  return [];
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("textarea, input, button, select, option, a, [contenteditable='true'], .t-input, .t-textarea"));
}

function deleteNode(nodeId: string) {
  store.setSelection([nodeId], []);
  store.deleteSelection();
}

function openNodeEditor(nodeId: string) {
  if (Date.now() < suppressNodeEditorUntil) return;
  if (editorNodeId.value && editorNodeId.value !== nodeId) {
    commitNodeEditorDraft(true);
  }
  editorNodeId.value = nodeId;
  const node = store.nodes.find((item) => item.id === nodeId && item.type === "prompt") as CanvasV2Node<PromptNodeDataV2> | undefined;
  editorPromptTitleDraft.value = String(node?.data.title || "文本节点");
  editorPromptTextDraft.value = String(node?.data.rawPrompt || node?.data.resolvedPrompt || "");
  editorPromptDirty.value = false;
  store.setSelection([nodeId], []);
}

function closeNodeEditor() {
  commitNodeEditorDraft(true);
  editorNodeId.value = "";
}

function commitNodeEditorDraft(immediate = false) {
  if (!editorPromptNode.value) return;
  if (!editorPromptDirty.value) {
    if (immediate) {
      store.queueSave(true);
    }
    return;
  }
  const nextTitle = String(editorPromptTitleDraft.value || "").trim() || "文本节点";
  const nextText = String(editorPromptTextDraft.value || "");
  const currentTitle = String(editorPromptNode.value.data.title || "");
  const currentText = String(editorPromptNode.value.data.rawPrompt || editorPromptNode.value.data.resolvedPrompt || "");
  if (nextTitle === currentTitle && nextText === currentText) {
    editorPromptDirty.value = false;
    if (immediate) {
      store.queueSave(true);
    }
    return;
  }
  store.updateNodeData(editorPromptNode.value.id, {
    title: nextTitle,
    rawPrompt: nextText,
    resolvedPrompt: nextText,
  }, true);
  editorPromptDirty.value = false;
  if (immediate) {
    store.queueSave(true);
  }
}

function resetSpawnCursor() {
  spawnCursorByType.media = 0;
  spawnCursorByType.prompt = 0;
  spawnCursorByType.loop = 0;
  spawnCursorByType.video = 0;
}

function getVisibleWorldBounds() {
  const zoom = Math.max(liveViewport.value.zoom, 0.0001);
  const visibleArea = getVisibleBoardArea();
  const rightReservePx = visibleArea.width > 960 ? 392 : visibleArea.width > 720 ? 236 : 24;
  const bottomReservePx = visibleArea.width > 720 ? 168 : 24;
  const left = (visibleArea.left - liveViewport.value.x) / zoom;
  const top = (visibleArea.top - liveViewport.value.y) / zoom;
  return {
    left,
    top,
    right: left + Math.max(0, visibleArea.width - rightReservePx) / zoom,
    bottom: top + Math.max(0, visibleArea.height - bottomReservePx) / zoom,
  };
}

function clampSpawnPosition(position: { x: number; y: number }, size: { width: number; height: number }) {
  const bounds = getVisibleWorldBounds();
  const margin = 24;
  const minX = bounds.left + margin;
  const minY = bounds.top + margin;
  const maxX = Math.max(minX, bounds.right - size.width - margin);
  const maxY = Math.max(minY, bounds.bottom - size.height - margin);
  return {
    x: Math.round(Math.min(maxX, Math.max(minX, position.x))),
    y: Math.round(Math.min(maxY, Math.max(minY, position.y))),
  };
}

function getSuggestedSpawnPosition(type: CanvasV2NodeType, anchor = getViewportCenterWorldPoint()) {
  const size = getDefaultNodeSize(type);
  const offset = typeSpawnOffsets[type];
  const cursor = spawnCursorByType[type];
  spawnCursorByType[type] += 1;
  const columns = type === "video" ? 1 : 2;
  const column = cursor % columns;
  const row = Math.floor(cursor / columns);
  const horizontalGap = size.width + 58;
  const verticalGap = size.height + 52;
  return clampSpawnPosition({
    x: Math.round(anchor.x + offset.x + column * horizontalGap),
    y: Math.round(anchor.y + offset.y + row * verticalGap),
  }, size);
}

function createNodeFromMenu(type: CanvasV2NodeType) {
  store.addNode(type, clampSpawnPosition({ x: createMenu.worldX, y: createMenu.worldY }, getDefaultNodeSize(type)), {
    exactPosition: true,
  });
  createMenu.visible = false;
}

async function refreshDrawer() {
  await store.loadReferenceDrawerData();
}

function sendAssetItem(item: DrawerAssetItem) {
  sendPaletteReferenceItem(item);
}

function sendPromptItem(item: DrawerPromptItem) {
  closeNodeEditor();
  store.createPromptNodeFromDrawerItem(item, getSuggestedSpawnPosition("prompt"), {
    exactPosition: true,
  });
}

function sendStoryboardImage(item: DrawerStoryboardItem) {
  sendPaletteReferenceItem(item.imageItem);
}

function sendStoryboardPrompt(item: DrawerStoryboardItem) {
  if (!item.promptText || !item.promptSourceRef) return;
  sendPromptItem({
    id: `${item.id}-prompt`,
    label: `${item.label} 文案`,
    subtitle: "分镜参考提示词",
    text: item.promptText,
    previewUrl: item.imageItem.url,
    sourceType: "storyboard",
    libraryCategory: "other",
    sourceRef: item.promptSourceRef,
  });
}

function sendWorkflowSelectedVideo(item: DrawerWorkflowItem) {
  closeNodeEditor();
  store.createVideoNodeFromWorkflowItem(item, getSuggestedSpawnPosition("video"), {
    exactPosition: true,
  });
}

function sendWorkflowHistoryVideo(item: DrawerWorkflowItem, history: DrawerWorkflowHistoryItem) {
  closeNodeEditor();
  store.createVideoNodeFromWorkflowItem(item, getSuggestedSpawnPosition("video"), {
    exactPosition: true,
    historyItem: history,
  });
}

function sendWorkflowBundle(item: DrawerWorkflowItem) {
  closeNodeEditor();
  store.createWorkflowBundleFromDrawerItem(item, getSuggestedSpawnPosition("video"), {
    exactPosition: true,
  });
}

function formatDrawerHistoryTime(value?: number | null) {
  if (!value) return "无时间信息";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function handleVideoNodeActivate(nodeId: string) {
  if (Date.now() < suppressNodeEditorUntil) return;
  closeNodeEditor();
  store.setSelection([nodeId], []);
}

function fitAll() {
  const bounds = contentBounds.value;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const zoom = Math.min(1.1, Math.max(0.18, Math.min(boardSize.width / width, boardSize.height / height)));
  liveViewport.value = {
    x: (boardSize.width - width * zoom) / 2 - bounds.minX * zoom,
    y: (boardSize.height - height * zoom) / 2 - bounds.minY * zoom,
    zoom,
  };
  store.setViewport(liveViewport.value, true);
}

function focusActiveNode() {
  const node = store.activeNode;
  if (!node) {
    fitAll();
    return;
  }
  const centerX = node.position.x + node.size.width / 2;
  const centerY = node.position.y + node.size.height / 2;
  liveViewport.value = {
    x: boardSize.width / 2 - centerX * liveViewport.value.zoom,
    y: boardSize.height / 2 - centerY * liveViewport.value.zoom,
    zoom: Math.max(liveViewport.value.zoom, 0.8),
  };
  store.setViewport(liveViewport.value, true);
}

function handleEpisodeChange(value: any) {
  const nextValue = Array.isArray(value) ? Number(value[0]) : Number(value);
  if (!Number.isFinite(nextValue) || nextValue === episodesId.value) return;
  episodesId.value = nextValue;
}

async function loadEpisodes() {
  const routeEpisodeId = Number(route.query.episodeId || 0);
  if (!project.value?.id) return;
  try {
    const { data } = await axios.post("/script/getScrptApi", {
      projectId: Number(project.value.id),
      name: "",
    });
    episodesOptions.value = (data ?? []).map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
    if (!episodesId.value && episodesOptions.value.length) {
      const matched = episodesOptions.value.find((item) => item.value === routeEpisodeId);
      episodesId.value = matched?.value || episodesOptions.value[0].value;
    }
  } catch {
    episodesOptions.value = routeEpisodeId ? [{ label: `第${routeEpisodeId}集`, value: routeEpisodeId }] : [];
    if (!episodesId.value && routeEpisodeId) {
      episodesId.value = routeEpisodeId;
    }
  }
}

async function refreshGraph() {
  const nextProjectId = Number(project.value?.id || 0);
  if (!nextProjectId || !episodesId.value) return;
  await store.hydrate(nextProjectId, episodesId.value, {
    videoModel: project.value?.videoModel || "",
    videoMode: project.value?.mode || "text",
  });
  resetSpawnCursor();
  liveViewport.value = { ...store.graph.viewport };
  await nextTick();
  if (!store.nodes.length) {
    fitAll();
  }
}

watch(
  () => episodesId.value,
  async () => {
    await refreshGraph();
  },
);

watch(
  () => store.graph.viewport,
  (value) => {
    liveViewport.value = { ...value };
  },
  { deep: true },
);

useResizeObserver(boardRef, (entries) => {
  const entry = entries[0];
  boardSize.width = entry.contentRect.width;
  boardSize.height = entry.contentRect.height;
});

function handleBoardMouseDown(event: MouseEvent) {
  createMenu.visible = false;
  closeNodeEditor();
  if (event.button !== 0 || isEditableTarget(event.target)) return;
  if ((event.target as HTMLElement).closest(".canvas-node, .reference-drawer, .reference-drawer-trigger, .floating-toolbar, .create-menu, .minimap")) return;
  const point = getBoardPoint(event);
  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    selectionBox.visible = true;
    selectionBox.additive = Boolean(event.ctrlKey || event.metaKey);
    selectionBox.startX = point.x;
    selectionBox.startY = point.y;
    selectionBox.currentX = point.x;
    selectionBox.currentY = point.y;
    return;
  }
  panState.active = true;
  panState.moved = false;
  panState.startX = point.x;
  panState.startY = point.y;
  panState.originX = liveViewport.value.x;
  panState.originY = liveViewport.value.y;
}

function handleBoardDoubleClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest(".canvas-node, .create-menu, .reference-drawer, .reference-drawer-trigger, .floating-toolbar, .minimap")) return;
  const boardPoint = getBoardPoint(event);
  const worldPoint = getWorldPoint(event);
  createMenu.visible = true;
  createMenu.screenX = boardPoint.x;
  createMenu.screenY = boardPoint.y;
  createMenu.worldX = worldPoint.x;
  createMenu.worldY = worldPoint.y;
}

let wheelTimer: ReturnType<typeof setTimeout> | null = null;
let suppressNodeEditorUntil = 0;
function handleBoardWheel(event: WheelEvent) {
  const point = getBoardPoint(event);
  const factor = event.deltaY > 0 ? 0.92 : 1.08;
  liveViewport.value = zoomAtPoint(liveViewport.value, point, liveViewport.value.zoom * factor);
  if (wheelTimer) clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    store.setViewport(liveViewport.value, true);
  }, 100);
}

function handleNodeMouseDown(node: CanvasV2Node, event: MouseEvent) {
  createMenu.visible = false;
  if (node.type !== "prompt") {
    closeNodeEditor();
  }
  if (event.button !== 0 || isEditableTarget(event.target)) return;
  if ((event.target as HTMLElement).closest(".port")) return;
  const additive = event.ctrlKey || event.metaKey;
  if (additive) {
    store.toggleNodeSelection(node.id, true);
    return;
  }
  if (!store.selectedNodeIds.includes(node.id)) {
    store.setSelection([node.id], []);
  }
  let dragIds = [...store.selectedNodeIds];
  if (!dragIds.length) {
    dragIds = [node.id];
  }
  if (event.altKey) {
    store.duplicateNodes(dragIds);
    dragIds = [...store.selectedNodeIds];
  }
  store.captureHistory();
  const worldPoint = getWorldPoint(event);
  dragState.active = true;
  dragState.moved = false;
  dragState.startWorldX = worldPoint.x;
  dragState.startWorldY = worldPoint.y;
  dragState.nodeIds = dragIds;
  dragState.positions = Object.fromEntries(
    store.nodes
      .filter((item) => dragIds.includes(item.id))
      .map((item) => [item.id, { x: item.position.x, y: item.position.y }]),
  );
}

function handlePortMouseDown(node: CanvasV2Node, portId: string, event: MouseEvent) {
  const point = getBoardPoint(event);
  connectState.active = true;
  connectState.sourceNodeId = node.id;
  connectState.sourcePort = portId;
  connectState.x = point.x;
  connectState.y = point.y;
}

function updateSelectionFromBox() {
  const left = Math.min(selectionBox.startX, selectionBox.currentX);
  const top = Math.min(selectionBox.startY, selectionBox.currentY);
  const width = Math.abs(selectionBox.currentX - selectionBox.startX);
  const height = Math.abs(selectionBox.currentY - selectionBox.startY);
  const worldStart = screenToWorld({ x: left, y: top }, liveViewport.value);
  const worldEnd = screenToWorld({ x: left + width, y: top + height }, liveViewport.value);
  const selectionRect = {
    x: worldStart.x,
    y: worldStart.y,
    width: worldEnd.x - worldStart.x,
    height: worldEnd.y - worldStart.y,
  };
  const matchedIds = store.nodes
    .filter((node) => rectsIntersect(selectionRect, { x: node.position.x, y: node.position.y, width: node.size.width, height: node.size.height }))
    .map((node) => node.id);
  if (selectionBox.additive) {
    store.setSelection([...new Set([...store.selectedNodeIds, ...matchedIds])], []);
    return;
  }
  store.setSelection(matchedIds, []);
}

function connectToTargetAt(clientX: number, clientY: number) {
  const target = document.elementsFromPoint(clientX, clientY).find((element) => {
    return element instanceof HTMLElement && element.dataset.portRole === "input";
  }) as HTMLElement | undefined;
  if (!target) return;
  const targetNodeId = target.dataset.nodeId || "";
  if (!targetNodeId) return;
  store.connectNodes(connectState.sourceNodeId, targetNodeId);
}

function handleMinimapMouseDown(event: MouseEvent) {
  minimapDrag.active = true;
  centerViewportByMinimap(event);
}

function centerViewportByMinimap(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const content = target.querySelector(".minimap-content") as HTMLElement | null;
  if (!content) return;
  const rect = content.getBoundingClientRect();
  const bounds = contentBounds.value;
  const width = rect.width;
  const height = rect.height;
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(width / worldWidth, height / worldHeight);
  const ox = (width - worldWidth * scale) / 2;
  const oy = (height - worldHeight * scale) / 2;
  const pointX = Math.max(0, Math.min(width, event.clientX - rect.left));
  const pointY = Math.max(0, Math.min(height, event.clientY - rect.top));
  const worldX = bounds.minX + (pointX - ox) / scale;
  const worldY = bounds.minY + (pointY - oy) / scale;
  liveViewport.value = {
    ...liveViewport.value,
    x: boardSize.width / 2 - worldX * liveViewport.value.zoom,
    y: boardSize.height / 2 - worldY * liveViewport.value.zoom,
  };
  store.setViewport(liveViewport.value);
}

useEventListener(document, "mousemove", (event: MouseEvent) => {
  if (panState.active) {
    const point = getBoardPoint(event);
    panState.moved = true;
    liveViewport.value = {
      ...liveViewport.value,
      x: panState.originX + (point.x - panState.startX),
      y: panState.originY + (point.y - panState.startY),
    };
    return;
  }
  if (selectionBox.visible) {
    const point = getBoardPoint(event);
    selectionBox.currentX = point.x;
    selectionBox.currentY = point.y;
    return;
  }
  if (dragState.active) {
    const worldPoint = getWorldPoint(event);
    const dx = worldPoint.x - dragState.startWorldX;
    const dy = worldPoint.y - dragState.startWorldY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragState.moved = true;
    }
    dragState.nodeIds.forEach((nodeId) => {
      const origin = dragState.positions[nodeId];
      if (!origin) return;
      store.updateNodePosition(nodeId, {
        x: origin.x + dx,
        y: origin.y + dy,
      });
    });
    return;
  }
  if (connectState.active) {
    const point = getBoardPoint(event);
    connectState.x = point.x;
    connectState.y = point.y;
    return;
  }
  if (minimapDrag.active) {
    centerViewportByMinimap(event);
  }
});

useEventListener(document, "mouseup", (event: MouseEvent) => {
  if (panState.active) {
    panState.active = false;
    if (!panState.moved) {
      store.clearSelection();
    }
    store.setViewport(liveViewport.value, true);
  }
  if (selectionBox.visible) {
    updateSelectionFromBox();
    selectionBox.visible = false;
  }
  if (dragState.active) {
    if (dragState.moved) {
      suppressNodeEditorUntil = Date.now() + 160;
    }
    dragState.active = false;
    dragState.moved = false;
    dragState.nodeIds = [];
    dragState.positions = {};
    store.queueSave();
  }
  if (connectState.active) {
    connectToTargetAt(event.clientX, event.clientY);
    connectState.active = false;
    connectState.sourceNodeId = "";
    connectState.sourcePort = "";
  }
  if (minimapDrag.active) {
    minimapDrag.active = false;
    store.setViewport(liveViewport.value, true);
  }
});

useEventListener(document, "paste", async (event: ClipboardEvent) => {
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  event.preventDefault();
  await consumeFiles(files, getViewportCenterWorldPoint());
});

useEventListener(
  document,
  "keydown",
  (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      createMenu.visible = false;
      if (referenceDrawerVisible.value) {
        toggleReferenceDrawer(false);
        return;
      }
      if (editorNodeId.value) {
        closeNodeEditor();
        return;
      }
      if (store.expandedNodeId) {
        store.closeExpandedNode();
        return;
      }
      if (!isEditableTarget(event.target)) {
        store.clearSelection();
      }
      return;
    }
    if (isEditableTarget(event.target)) return;
    const ctrl = event.ctrlKey || event.metaKey;
    if (event.repeat && (ctrl || event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      return;
    }
    if (ctrl && event.key.toLowerCase() === "a") {
      event.preventDefault();
      store.selectAllNodes();
      return;
    }
    if (ctrl && event.key.toLowerCase() === "c") {
      event.preventDefault();
      store.copySelection();
      return;
    }
    if (ctrl && event.key.toLowerCase() === "d") {
      event.preventDefault();
      store.duplicateSelection();
      return;
    }
    if (ctrl && event.key.toLowerCase() === "v") {
      event.preventDefault();
      store.pasteClipboard(getViewportCenterWorldPoint());
      return;
    }
    if (ctrl && event.key.toLowerCase() === "s") {
      event.preventDefault();
      store.queueSave(true);
      return;
    }
    if (ctrl && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      store.undo();
      return;
    }
    if ((ctrl && event.key.toLowerCase() === "y") || (ctrl && event.shiftKey && event.key.toLowerCase() === "z")) {
      event.preventDefault();
      store.redo();
      return;
    }
    if (ctrl && event.key === "0") {
      event.preventDefault();
      fitAll();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      store.deleteSelection();
      return;
    }
  },
  { capture: true },
);

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function consumeFiles(files: File[], worldPoint: { x: number; y: number }) {
  if (!files.length) return;
  const uploadedItems = await Promise.all(
    files.map(async (file) => {
      const base64Data = await fileToDataUrl(file);
      const uploaded = await store.uploadMedia(base64Data);
      return {
        id: crypto.randomUUID(),
        fileType: uploaded.fileType,
        url: uploaded.url,
        label: file.name,
        sourceType: "upload" as const,
        createdAt: Date.now(),
      };
    }),
  );
  uploadedItems.forEach((item, index) => {
    const nodeType: CanvasV2NodeType = item.fileType === "video" ? "video" : "media";
    const node = store.addNode(nodeType, {
      x: worldPoint.x + index * 24,
      y: worldPoint.y + index * 24,
    });
    if (nodeType === "video") {
      store.updateNodeData(node.id, {
        title: item.label,
        referenceItems: [item],
      });
      return;
    }
    store.updateNodeData(node.id, {
      title: item.label,
      items: [item],
    });
  });
}

async function handleBoardDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  await consumeFiles(files, getWorldPoint(event));
}

onMounted(async () => {
  liveViewport.value = { ...store.graph.viewport };
  await loadEpisodes();
  if (episodesId.value) {
    await refreshGraph();
  }
});

onUnmounted(() => {
  store.stopPolling();
});

watch(editorPromptNode, (node) => {
  if (editorNodeId.value && !node) {
    editorNodeId.value = "";
  }
});
</script>

<style scoped lang="scss">
.production-v2-page {
  --v2-surface: #f3f4f6;
  --v2-surface-strong: #e5e7eb;
  --v2-surface-soft: rgba(255, 255, 255, 0.78);
  --v2-border: #d1d5db;
  --v2-text: #111827;
  --v2-muted: #6b7280;
  --v2-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  position: relative;
  width: 100%;
  height: calc(100vh - 74px);
  color: var(--v2-text);
}

.board-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.floating-card {
  border: 1px solid var(--v2-border);
  background: var(--v2-surface-soft);
  box-shadow: var(--v2-shadow);
  backdrop-filter: blur(16px);
}

.floating-toolbar {
  position: absolute;
  top: 14px;
  left: 18px;
  z-index: 30;
  width: fit-content;
  max-width: calc(100vw - 36px);
  border-radius: 18px;
  padding: 10px 12px;
  display: inline-flex;
  align-items: center;
}

.episode-select {
  width: 220px;
}

.reference-drawer-trigger {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 29;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--v2-text);
}

.drawer-trigger-icon {
  font-size: 18px;
  line-height: 1;
  color: var(--v2-text);
}

.reference-drawer {
  position: absolute;
  top: 18px;
  right: 18px;
  bottom: 18px;
  z-index: 28;
  width: min(380px, calc(100vw - 36px));
  border-radius: 28px;
  padding: 14px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.drawer-close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(209, 213, 219, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--v2-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.drawer-toolbar {
  display: flex;
  align-items: center;
}

.drawer-tabs,
.drawer-subtabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-right: 36px;
}

.drawer-tab,
.drawer-subtab {
  border: 1px solid var(--v2-border);
  background: rgba(255, 255, 255, 0.78);
  color: var(--v2-muted);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.drawer-tab.active,
.drawer-subtab.active {
  border-color: #9ca3af;
  background: rgba(229, 231, 235, 0.92);
  color: var(--v2-text);
}

.drawer-tab-count {
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(209, 213, 219, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #4b5563;
}

.drawer-library {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-panel {
  min-height: 0;
  border-radius: 20px;
  border: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-list-panel {
  flex: 0 0 42%;
}

.drawer-detail-panel {
  flex: 1 1 auto;
}

.drawer-panel-head {
  padding: 14px 16px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(209, 213, 219, 0.65);
}

.drawer-panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--v2-text);
}

.drawer-panel-subtitle,
.drawer-panel-count {
  font-size: 12px;
  color: var(--v2-muted);
}

.drawer-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.drawer-list-item {
  border: 1px solid rgba(209, 213, 219, 0.84);
  background: rgba(243, 244, 246, 0.9);
  border-radius: 18px;
  padding: 12px 14px;
  display: block;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.drawer-list-item:hover {
  border-color: rgba(156, 163, 175, 0.8);
  background: rgba(255, 255, 255, 0.92);
}

.drawer-list-item.selected {
  border-color: rgba(107, 114, 128, 0.82);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.drawer-list-item-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.drawer-list-item-preview,
.drawer-reference-preview {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(209, 213, 219, 0.84);
  background: rgba(229, 231, 235, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-list-item-preview {
  aspect-ratio: 16 / 9;
}

.drawer-reference-preview {
  aspect-ratio: 16 / 9;
}

.drawer-list-item-preview.kind-image,
.drawer-reference-preview.kind-image {
  background: rgba(255, 255, 255, 0.82);
}

.drawer-list-item-preview img,
.drawer-list-item-preview video,
.drawer-reference-preview img,
.drawer-reference-preview video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: rgba(229, 231, 235, 0.72);
}

.drawer-list-item-topline,
.workflow-history-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.drawer-list-item-title,
.drawer-detail-title,
.drawer-reference-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--v2-text);
}

.drawer-list-item-badge {
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(229, 231, 235, 0.98);
  border: 1px solid rgba(209, 213, 219, 0.88);
  color: #374151;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.drawer-list-item-subtitle,
.drawer-detail-subtitle,
.drawer-reference-subtitle,
.workflow-history-time {
  font-size: 12px;
  color: var(--v2-muted);
}

.drawer-list-item-summary,
.drawer-detail-text,
.drawer-reference-summary {
  font-size: 13px;
  line-height: 1.65;
  color: #374151;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.drawer-list-item-summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawer-list-item-meta,
.drawer-chip-row,
.drawer-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-list-item-meta {
  font-size: 12px;
  color: var(--v2-muted);
}

.drawer-chip {
  min-height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(209, 213, 219, 0.84);
  background: rgba(255, 255, 255, 0.82);
  color: #4b5563;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
}

.drawer-detail-panel {
  padding: 14px 16px;
  gap: 14px;
  overflow: auto;
}

.drawer-detail-head,
.drawer-detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-detail-label,
.drawer-stat-label {
  font-size: 12px;
  color: var(--v2-muted);
}

.drawer-detail-text.prompt {
  min-height: 0;
  max-height: 180px;
  overflow: auto;
}

.drawer-detail-stats {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.drawer-stat-card {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(209, 213, 219, 0.84);
  background: rgba(243, 244, 246, 0.92);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-stat-card strong {
  font-size: 14px;
  color: var(--v2-text);
}

.drawer-reference-list,
.workflow-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-reference-item,
.workflow-history-item {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(209, 213, 219, 0.84);
  background: rgba(243, 244, 246, 0.92);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-reference-item {
  align-items: flex-start;
}

.drawer-reference-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-reference-summary {
  font-size: 12px;
  color: var(--v2-muted);
}

.drawer-action {
  border: 1px solid var(--v2-border);
  background: rgba(255, 255, 255, 0.84);
  color: #4b5563;
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 12px;
  cursor: pointer;
}

.drawer-action.primary {
  background: rgba(229, 231, 235, 0.98);
  color: var(--v2-text);
}

.drawer-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.workflow-history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
  font-weight: 600;
  flex-wrap: wrap;
}

.drawer-detail-actions.compact {
  margin-top: 8px;
}

.drawer-detail-empty {
  flex: 1;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-empty,
.inline-empty {
  font-size: 12px;
  color: var(--v2-muted);
  padding: 10px 0;
}

.inline-empty {
  padding: 2px 0 0;
}

.board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.92), transparent 30%),
    radial-gradient(circle at bottom right, rgba(229, 231, 235, 0.42), transparent 28%),
    linear-gradient(180deg, #f8f9fb 0%, #f1f3f5 100%);
}

.board::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(209, 213, 219, 0.62) 1px, transparent 1px),
    linear-gradient(90deg, rgba(209, 213, 219, 0.62) 1px, transparent 1px);
  background-size: 36px 36px;
  opacity: 0.28;
  pointer-events: none;
}

.links-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 4;
  pointer-events: auto;
  overflow: visible;
  display: block;
}

.edge-line {
  fill: none;
  pointer-events: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.edge-line {
  stroke: #cfd4dc;
  stroke-width: 1.25;
  opacity: 0.92;
}

.edge-line.selected {
  stroke: #9ca3af;
  stroke-width: 1.6;
  opacity: 1;
}

.edge-line.temp {
  stroke: #b9c0ca;
  stroke-width: 1.35;
  opacity: 0.96;
}

.edge-hit {
  fill: none;
  stroke: rgba(15, 23, 42, 0.001);
  stroke-width: 20;
  pointer-events: stroke;
  cursor: pointer;
}

.edge-controls-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.edge-anchor-button,
.edge-delete-button {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 999px;
  pointer-events: auto;
}

.edge-anchor-button {
  width: 12px;
  height: 12px;
  background: #cfd4dc;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.96),
    0 2px 8px rgba(15, 23, 42, 0.08);
  opacity: 0.95;
  cursor: pointer;
}

.edge-anchor-button.hovered,
.edge-anchor-button.selected {
  background: #9ca3af;
  opacity: 1;
}

.edge-anchor-button.selected {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.98),
    0 0 0 4px rgba(148, 163, 184, 0.18);
}

.edge-delete-button {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #6b7280;
  color: #ffffff;
  font-size: 14px;
  line-height: 1;
  box-shadow:
    0 0 0 1px #ffffff,
    0 8px 18px rgba(15, 23, 42, 0.1);
  cursor: pointer;
}

.world {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  z-index: 6;
}

.nodes-layer {
  position: absolute;
  inset: 0;
}

.canvas-node {
  position: absolute;
  min-width: 220px;
  min-height: 120px;
}

.canvas-node.type-media,
.canvas-node.type-video {
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.port {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  z-index: 12;
}

.port::after {
  content: "";
  position: absolute;
  left: 15px;
  top: 15px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #6b7280;
  box-shadow: 0 0 0 1px #cbd5e1;
}

.port.left {
  left: -29px;
}

.port.right {
  right: -15px;
}

.port.prompt::after {
  background: #d97706;
}

.port.media::after {
  background: #475569;
}

.port.loop::after {
  background: #0f766e;
}

.overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.selection-box {
  position: absolute;
  border: 1px solid #9ca3af;
  background: rgba(156, 163, 175, 0.12);
}

.create-menu {
  position: absolute;
  min-width: 180px;
  padding: 8px;
  border-radius: 18px;
  border: 1px solid var(--v2-border);
  background: rgba(243, 244, 246, 0.94);
  box-shadow: var(--v2-shadow);
  pointer-events: auto;
}

.menu-title {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--v2-muted);
}

.menu-item {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 9px 10px;
  border-radius: 12px;
  cursor: pointer;
}

.menu-item:hover {
  background: rgba(229, 231, 235, 0.82);
}

.minimap {
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 24;
  width: 188px;
  height: 126px;
  padding: 8px;
  border-radius: 16px;
}

.minimap-content {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: rgba(229, 231, 235, 0.72);
  overflow: hidden;
}

.minimap-node {
  position: absolute;
  border-radius: 3px;
  background: rgba(156, 163, 175, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.72);
}

.minimap-node.selected {
  background: #6b7280;
}

.minimap-viewport {
  position: absolute;
  border: 1.5px solid #6b7280;
  background: rgba(156, 163, 175, 0.12);
  border-radius: 5px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.75);
}

.minimap-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.text-node-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.text-node-input,
.text-node-textarea {
  width: 100%;
  border: 1px solid var(--v2-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--v2-text);
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.text-node-input:focus,
.text-node-textarea:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.16);
}

.text-node-input {
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 500;
}

.text-node-textarea {
  flex: 1;
  min-height: 0;
  padding: 12px;
  resize: none;
  font-size: 14px;
  line-height: 1.7;
}

.text-node-popup {
  position: absolute;
  z-index: 22;
  padding: 14px;
  border-radius: 18px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}

.text-node-popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
}

.text-node-popup-close {
  width: 24px;
  height: 24px;
  border: 1px solid var(--v2-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #4b5563;
  cursor: pointer;
}

.expanded-node-dialog-body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.expanded-node-dialog :deep(.t-dialog) {
  border-radius: 26px;
  background: rgba(243, 244, 246, 0.98);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.expanded-node-dialog :deep(.t-dialog__body) {
  padding: 14px;
  background: transparent;
}

.hidden-upload {
  display: none;
}

.spin {
  animation: spin 0.8s linear infinite;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition:
    transform 0.26s ease,
    opacity 0.26s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .reference-drawer {
    width: 320px;
  }
}

@media (max-width: 900px) {
  .floating-toolbar {
    position: static;
    margin: 12px;
    width: fit-content;
    max-width: calc(100vw - 24px);
  }

  .reference-drawer-trigger {
    top: 80px;
    right: 12px;
  }

  .reference-drawer {
    top: 80px;
    right: 12px;
    bottom: 12px;
    width: min(340px, calc(100vw - 24px));
  }

  .production-v2-page {
    height: auto;
    min-height: calc(100vh - 74px);
  }

  .board {
    height: calc(100vh - 330px);
  }
}
</style>
