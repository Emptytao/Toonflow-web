# Production Node Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `/production` 画布的所有节点增加常驻放大按钮，并在统一弹窗中复用节点原有编辑与操作能力。

**Architecture:** 先抽一个纯配置模块承载节点标题和弹窗宽度映射，并用最轻量测试覆盖；再在 graph store 中增加纯 UI 放大状态；最后新增统一的放大弹窗宿主与放大按钮组件，并让所有节点支持 `node/dialog` 双渲染模式。

**Tech Stack:** Vue 3、Pinia、Vue Flow、TDesign、Node.js `node:test` + `tsx --test`

---

## File Map

- Create: `D:/code/toon/Toonflow-web/src/views/production/graph/expand.ts`
- Create: `D:/code/toon/Toonflow-web/src/views/production/graph/expand.test.ts`
- Create: `D:/code/toon/Toonflow-web/src/views/production/components/nodeExpandButton.vue`
- Create: `D:/code/toon/Toonflow-web/src/views/production/components/expandedNodeDialog.vue`
- Modify: `D:/code/toon/Toonflow-web/src/stores/productionGraph.ts`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/index.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/script.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/scriptPlan.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/assets.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/storyboardTable.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/storyboard.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/workbench.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/media.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/prompt.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/loop.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/node/imageGroup.vue`

## Task 1: 抽取放大弹窗元数据并写测试

**Files:**
- Create: `D:/code/toon/Toonflow-web/src/views/production/graph/expand.test.ts`
- Create: `D:/code/toon/Toonflow-web/src/views/production/graph/expand.ts`

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { getExpandedNodeDialogWidth, getExpandedNodeTitle } from "./expand";

test("script 节点使用大宽度弹窗", () => {
  assert.equal(getExpandedNodeDialogWidth("script"), "92vw");
});

test("media 节点使用中宽度弹窗", () => {
  assert.equal(getExpandedNodeDialogWidth("media"), "78vw");
});

test("loop 节点返回正确标题", () => {
  assert.equal(getExpandedNodeTitle("loop"), "循环节点");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `yarn tsx --test src/views/production/graph/expand.test.ts`
Expected: FAIL，报 `./expand` 模块不存在或导出不存在。

- [ ] **Step 3: 实现最小配置模块**

```ts
import type { GraphNodeType } from "./types";

const NODE_TITLE_MAP: Record<GraphNodeType, string> = {
  script: "剧本节点",
  scriptPlan: "导演计划节点",
  assets: "素材节点",
  storyboardTable: "分镜表节点",
  storyboard: "分镜节点",
  workbench: "工作台节点",
  media: "媒体节点",
  prompt: "提示词节点",
  loop: "循环节点",
  imageGroup: "图片组节点",
};

const NODE_DIALOG_WIDTH_MAP: Record<GraphNodeType, string> = {
  script: "92vw",
  scriptPlan: "92vw",
  assets: "88vw",
  storyboardTable: "92vw",
  storyboard: "92vw",
  workbench: "88vw",
  media: "78vw",
  prompt: "72vw",
  loop: "72vw",
  imageGroup: "78vw",
};

export function getExpandedNodeTitle(nodeType: GraphNodeType): string {
  return NODE_TITLE_MAP[nodeType];
}

export function getExpandedNodeDialogWidth(nodeType: GraphNodeType): string {
  return NODE_DIALOG_WIDTH_MAP[nodeType];
}
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `yarn tsx --test src/views/production/graph/expand.test.ts`
Expected: PASS，3 个测试全部通过。

## Task 2: 增加 graph store 放大状态

**Files:**
- Modify: `D:/code/toon/Toonflow-web/src/stores/productionGraph.ts`

- [ ] **Step 1: 为 store 增加失败测试思路检查**

验证点：
- 初始 `expandedNodeId` 为空
- 调用 `openExpandedNode("x")` 后为 `"x"`
- 调用 `closeExpandedNode()` 后重置为空

说明：仓库当前没有 Pinia store 单测基础，本任务以内联实现 + 后续页面验证代替新增大型测试设施。

- [ ] **Step 2: 最小实现放大状态**

在 store 中新增：

```ts
const expandedNodeId = ref("");

function openExpandedNode(nodeId: string) {
  expandedNodeId.value = nodeId;
}

function closeExpandedNode() {
  expandedNodeId.value = "";
}
```

并在 `loadGraph()`、删除节点逻辑中做安全清理：

```ts
if (expandedNodeId.value && nodeIds.includes(expandedNodeId.value)) {
  expandedNodeId.value = "";
}
```

- [ ] **Step 3: 导出给页面使用**

把 `expandedNodeId`、`openExpandedNode`、`closeExpandedNode` 暴露在返回对象中。

## Task 3: 新增统一放大按钮与弹窗宿主

**Files:**
- Create: `D:/code/toon/Toonflow-web/src/views/production/components/nodeExpandButton.vue`
- Create: `D:/code/toon/Toonflow-web/src/views/production/components/expandedNodeDialog.vue`
- Modify: `D:/code/toon/Toonflow-web/src/views/production/index.vue`

- [ ] **Step 1: 创建统一放大按钮组件**

按钮职责：
- 接收 `nodeId`
- 调用 `graphStore.openExpandedNode(nodeId)`
- 统一展示放大 icon 和 tooltip

- [ ] **Step 2: 创建统一弹窗宿主**

宿主职责：
- 接收 `node`、`flowData`
- 根据节点类型渲染对应节点组件
- 兼容节点继续使用原来的 `v-model`
- graph 节点传 `id/data/selected/renderMode="dialog"`

- [ ] **Step 3: 在 production 页面接入弹窗**

在 `index.vue` 中：
- 计算 `expandedNode`
- 渲染 `expandedNodeDialog`
- 弹窗关闭时调用 `graphStore.closeExpandedNode()`

## Task 4: 让所有节点支持 `renderMode`

**Files:**
- Modify all node files under `D:/code/toon/Toonflow-web/src/views/production/node/`

- [ ] **Step 1: 所有节点补充 `renderMode?: "node" | "dialog"`**

统一模式：

```ts
const props = withDefaults(defineProps<...>(), {
  renderMode: "node",
});
```

- [ ] **Step 2: `node` 模式显示画布专用元素**

仅在 `renderMode === "node"` 时显示：
- `NodeResizer`
- `Handle`
- 放大按钮

- [ ] **Step 3: `dialog` 模式去掉画布约束**

统一样式分支：

```scss
&.dialogMode {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
```

并把标题栏 `cursor: grab` 改成仅 `node` 模式生效。

## Task 5: 回归验证

**Files:**
- Verify only

- [ ] **Step 1: 跑新增测试**

Run: `yarn tsx --test src/views/production/graph/expand.test.ts`
Expected: PASS

- [ ] **Step 2: 跑前端构建**

Run: `yarn build-only`
Expected: exit 0

- [ ] **Step 3: 跑前端全量 type-check 观察范围**

Run: `yarn type-check`
Expected: 仍可能失败，但不应新增 `src/views/production/*` 的新报错；若有 production 新报错，必须修完。
