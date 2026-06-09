<template>
  <div class="composer" v-if="node">
    <div class="header">
      <div>
        <div class="title">Composer</div>
        <div class="subtitle">当前媒体节点的提示词与上游输入</div>
      </div>
      <div class="actions">
        <t-button size="small" variant="outline" @click="saveDraft">保存草稿</t-button>
        <t-button size="small" theme="primary" @click="store.runNode(node.id)">运行</t-button>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">上游图片</div>
      <div class="upstreamGrid">
        <div class="upstreamItem" v-for="item in upstreamImages" :key="item.id">
          <t-image v-if="item.fileType === 'image'" :src="item.url" fit="cover" class="thumb" />
          <video v-else-if="item.fileType === 'video'" :src="item.url" class="thumb" muted></video>
          <div v-else class="thumb audio">音频</div>
          <div class="thumbActions">
            <t-button size="small" variant="text" @click="moveImage(item.id, -1)">上移</t-button>
            <t-button size="small" variant="text" @click="moveImage(item.id, 1)">下移</t-button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">上游提示词预览</div>
      <div class="promptPreview" v-for="prompt in upstreamPrompts" :key="prompt.id">{{ prompt.text }}</div>
      <div class="promptPreview empty" v-if="!upstreamPrompts.length">暂无上游提示词</div>
    </div>

    <div class="section grow">
      <div class="sectionTitle">当前提示词</div>
      <div class="editorWrap">
        <promptEditor v-model="draftPrompt" :references="editorReferences" placeholder="输入提示词，使用 @ 引用上游素材" />
      </div>
    </div>

    <div class="section">
      <div class="resourceHeader">
        <div class="sectionTitle">模板库</div>
        <t-input v-model="keyword" placeholder="搜索模板 / 预设" clearable />
      </div>
      <div class="resourceTabs">
        <t-select v-model="category" :options="categoryOptions" placeholder="全部分类" clearable />
      </div>
      <div class="resourceList">
        <div class="resourceItem" v-for="item in filteredTemplates" :key="item.id">
          <div>
            <div class="name">{{ item.name }}</div>
            <div class="desc">{{ item.category || "未分类" }}</div>
          </div>
          <div class="itemActions">
            <t-button size="small" variant="text" @click="applyContent(item.content)">应用</t-button>
            <t-button size="small" variant="text" @click="saveAsPreset(item)">转预设</t-button>
          </div>
        </div>
      </div>
      <div class="resourceActions">
        <t-button size="small" variant="outline" @click="saveAsTemplate">保存为模板</t-button>
        <t-button size="small" variant="outline" @click="saveCurrentPreset">保存为预设</t-button>
      </div>
    </div>

    <div class="section">
      <div class="sectionTitle">提示词预设</div>
      <div class="resourceList">
        <div class="resourceItem" v-for="item in filteredPresets" :key="item.id">
          <div>
            <div class="name">{{ item.name }}</div>
            <div class="desc">{{ item.category || "未分类" }}</div>
          </div>
          <div class="itemActions">
            <t-button size="small" variant="text" @click="applyContent(item.content)">应用</t-button>
            <t-button size="small" variant="text" @click="editPreset(item)">更新</t-button>
            <t-button size="small" theme="danger" variant="text" @click="store.deletePreset(item.id)">删除</t-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import promptEditor from "@/components/promptEditor.vue";
import useProductionGraphStore from "@/stores/productionGraph";
import type { GraphMediaItem, MediaNodeData, ProductionNode, PromptResource } from "../graph/types";
import { getNodeOutputItems } from "../graph/types";

const store = useProductionGraphStore();
const keyword = ref("");
const category = ref("");

const node = computed(() => store.composerNode);
const draftPrompt = computed({
  get: () => ((node.value?.data as MediaNodeData | undefined)?.draftPrompt ?? ""),
  set: (value: string) => node.value && store.updateNodeData(node.value.id, { draftPrompt: value, prompt: value }),
});

const upstreamNodes = computed<ProductionNode[]>(() => {
  if (!node.value) return [];
  const incoming = store.edges.filter((edge) => edge.target === node.value!.id);
  return incoming
    .map((edge) => store.nodes.find((item) => item.id === edge.source))
    .filter((item): item is ProductionNode => Boolean(item));
});

const upstreamImages = computed<GraphMediaItem[]>(() => {
  const nodeData = node.value?.data as MediaNodeData | undefined;
  const order = nodeData?.composer?.upstreamImageOrder ?? [];
  const allItems = upstreamNodes.value.flatMap((item) => getNodeOutputItems(item));
  const itemMap = new Map(allItems.map((item) => [item.id, item]));
  const ordered = order.map((id) => itemMap.get(id)).filter((item): item is GraphMediaItem => Boolean(item));
  const remain = allItems.filter((item) => !order.includes(item.id));
  return [...ordered, ...remain];
});

const upstreamPrompts = computed(() =>
  upstreamNodes.value
    .filter((item) => item?.type === "prompt")
    .map((item) => ({
      id: item!.id,
      text: (item!.data as any).resolvedPrompt || (item!.data as any).rawPrompt || "",
    }))
    .filter((item) => item.text),
);

const editorReferences = computed(() =>
  upstreamImages.value.map((item) => ({
    type: item.fileType as "image" | "video" | "audio" | "text",
    src: item.url,
  })),
);

const categoryOptions = computed(() => {
  const values = new Set<string>();
  [...store.templates, ...store.presets].forEach((item) => item.category && values.add(item.category));
  return Array.from(values).map((item) => ({ label: item, value: item }));
});

const filteredTemplates = computed(() =>
  store.templates.filter((item) => {
    const hitKeyword = !keyword.value || item.name.includes(keyword.value) || item.content.includes(keyword.value);
    const hitCategory = !category.value || item.category === category.value;
    return hitKeyword && hitCategory;
  }),
);
const filteredPresets = computed(() =>
  store.presets.filter((item) => {
    const hitKeyword = !keyword.value || item.name.includes(keyword.value) || item.content.includes(keyword.value);
    const hitCategory = !category.value || item.category === category.value;
    return hitKeyword && hitCategory;
  }),
);

function moveImage(itemId: string, direction: -1 | 1) {
  if (!node.value) return;
  const list = [...upstreamImages.value];
  const index = list.findIndex((item) => item.id === itemId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return;
  const current = list[index];
  const target = list[nextIndex];
  if (!current || !target) return;
  [list[index], list[nextIndex]] = [target, current];
  store.updateNodeData(node.value.id, {
    composer: {
      ...((node.value.data as MediaNodeData).composer ?? {}),
      upstreamImageOrder: list.map((item) => item.id),
    },
  });
}

function saveDraft() {
  if (!node.value) return;
  store.updateNodeData(node.value.id, {
    composer: {
      ...((node.value.data as MediaNodeData).composer ?? {}),
      draftSavedAt: Date.now(),
    },
  });
}

function applyContent(content: string) {
  draftPrompt.value = content;
}

async function saveAsTemplate() {
  if (!draftPrompt.value) return;
  await store.saveTemplate({
    name: `模板 ${dayjs().format("HH:mm:ss")}`,
    category: category.value,
    content: draftPrompt.value,
    description: "",
  });
}

async function saveCurrentPreset() {
  if (!draftPrompt.value) return;
  await store.savePreset({
    name: `预设 ${dayjs().format("HH:mm:ss")}`,
    category: category.value,
    content: draftPrompt.value,
    description: "",
  });
}

async function saveAsPreset(item: PromptResource) {
  await store.savePreset({
    name: item.name,
    category: item.category,
    content: item.content,
    description: item.description,
  });
}

async function editPreset(item: PromptResource) {
  await store.updatePreset({
    id: item.id,
    name: item.name,
    category: item.category,
    content: draftPrompt.value,
    description: item.description,
  });
}
</script>

<style scoped lang="scss">
.composer {
  position: absolute;
  top: 10px;
  right: 10px;
  bottom: 10px;
  width: 380px;
  z-index: 9998;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 16px;
  box-shadow: var(--td-shadow-2);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  overflow: auto;
}

.header,
.actions,
.resourceHeader,
.resourceTabs,
.resourceActions,
.itemActions,
.thumbActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header,
.resourceHeader {
  justify-content: space-between;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.subtitle,
.desc {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grow {
  min-height: 220px;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 600;
}

.upstreamGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.thumb {
  width: 100%;
  height: 72px;
  border-radius: 10px;
}

.audio {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--td-bg-color-secondarycontainer);
}

.promptPreview {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--td-bg-color-secondarycontainer);
  font-size: 12px;
  white-space: pre-wrap;
}

.empty {
  color: var(--td-text-color-placeholder);
}

.editorWrap {
  min-height: 180px;
  resize: vertical;
  overflow: auto;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 12px;
  padding: 8px;
}

.resourceList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resourceItem {
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-weight: 600;
}
</style>
