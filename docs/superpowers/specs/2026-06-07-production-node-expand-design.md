# Production 画布节点放大查看设计

## 背景

当前 `/production` 画布中的节点信息密度越来越高。节点在画布内需要兼顾排布、连线和整体视野，导致内容区域经常受限，不利于查看和编辑。现有少数节点已经有各自的专用弹窗，但缺少一套统一的“单节点放大查看与操作”能力。

本次需求是在不改变现有 `Vue Flow` 画布主交互的前提下，为所有节点增加统一的放大入口。用户点击按钮后，可将该节点以弹窗方式单独放大查看，并继续使用该节点已有的编辑、运行、预览等能力。

## 目标

- 所有 `/production` 画布节点统一显示放大按钮。
- 点击放大按钮后，节点以弹窗方式单独展示。
- 弹窗内继续复用该节点原有内容与操作能力，而不是只读快照。
- 弹窗关闭后，节点数据保持实时同步，不引入额外保存逻辑。
- 不改动 graph 持久化模型，不把放大状态写入 graph JSON。

## 非目标

- 不根据内容是否溢出决定是否显示按钮，按钮常驻显示。
- 不新增节点级持久化字段。
- 不替换现有节点已有的专用弹窗，只做统一放大入口。
- 不改动节点业务逻辑本身，例如生成、轮询、预览、编辑器能力。
- 不扩展到 `/production` 之外的页面。

## 用户交互

### 节点卡片态

- 所有节点标题栏右侧显示统一的放大按钮。
- 放大按钮优先级低于节点原有核心操作，但与现有标题栏动作并列展示。
- 点击放大按钮后，打开“节点放大弹窗”。

### 节点放大弹窗

- 弹窗标题展示节点名称。
- 弹窗内容使用该节点自己的原始组件内容，而不是单独维护第二份视图。
- 用户可在弹窗中继续编辑、运行、预览、打开节点内部已有的专用弹窗。
- 弹窗关闭后，不需要单独确认保存；节点数据沿用现有响应式回写机制同步到画布。

### 兼容现有弹窗

- `media` 节点已有“结果预览”弹窗，继续保留。
- `script`、`scriptPlan`、`storyboardTable` 等已有编辑弹窗，继续保留。
- 新增的放大弹窗只是更大的节点工作区，不替代节点内部已有的专用弹窗。

## 作用范围

本次统一覆盖以下节点类型：

- `script`
- `scriptPlan`
- `assets`
- `storyboardTable`
- `storyboard`
- `workbench`
- `media`
- `prompt`
- `loop`
- `imageGroup`

## 技术设计

### 1. UI 状态

在图谱前端 store 中新增纯 UI 状态：

- `expandedNodeId: string`
- `openExpandedNode(nodeId: string)`
- `closeExpandedNode()`

该状态仅用于前端显示控制，不进入 `GraphDocument`，也不参与保存、迁移或后端接口传输。

### 2. 全局弹窗宿主

在 [src/views/production/index.vue](/D:/code/toon/Toonflow-web/src/views/production/index.vue) 中增加一个统一的节点放大弹窗宿主。

宿主职责：

- 根据 `expandedNodeId` 找到当前节点。
- 根据节点类型动态渲染对应节点组件。
- 为兼容节点继续传入现有 `flowData.*` 模型。
- 为 graph 节点继续传入 `id`、`data`、`selected` 等现有参数。
- 统一控制弹窗宽度、标题和关闭行为。

这样可以复用页面中已经集中注册的节点组件，不需要为每类节点再维护单独的放大页组件。

### 3. 节点组件双模式

所有节点组件新增可选入参：

- `renderMode?: "node" | "dialog"`

默认值为 `node`。

两种模式的差异：

#### `node` 模式

- 显示 `Handle`
- 显示 `NodeResizer`
- 保留画布卡片尺寸、裁剪和拖拽标题栏样式
- 显示放大按钮

#### `dialog` 模式

- 隐藏 `Handle`
- 隐藏 `NodeResizer`
- 去掉画布节点固定尺寸和裁剪约束
- 不显示放大按钮，避免二次打开弹窗
- 保留节点原有业务内容与操作

### 4. 统一放大按钮

所有节点标题栏接入统一样式的放大按钮，按钮行为统一调用 store 的 `openExpandedNode(nodeId)`。

按钮样式原则：

- 轻量，不抢占主操作视觉优先级
- 与现有标题栏动作共存
- 统一尺寸、图标和 hover 态

### 5. 与现有数据流的关系

放大弹窗内不创建独立副本。

它直接复用当前页面已有的数据源：

- 兼容节点复用 `flowData`
- graph 节点复用 graph store 中的 node data

因此：

- 弹窗编辑是实时编辑
- 关闭弹窗不需要额外同步
- 不存在“弹窗保存后再写回节点”的第二套逻辑

## 文件改动边界

### 核心文件

- [src/stores/productionGraph.ts](/D:/code/toon/Toonflow-web/src/stores/productionGraph.ts)
- [src/views/production/index.vue](/D:/code/toon/Toonflow-web/src/views/production/index.vue)

### 需要适配双模式的节点组件

- [src/views/production/node/script.vue](/D:/code/toon/Toonflow-web/src/views/production/node/script.vue)
- [src/views/production/node/scriptPlan.vue](/D:/code/toon/Toonflow-web/src/views/production/node/scriptPlan.vue)
- [src/views/production/node/assets.vue](/D:/code/toon/Toonflow-web/src/views/production/node/assets.vue)
- [src/views/production/node/storyboardTable.vue](/D:/code/toon/Toonflow-web/src/views/production/node/storyboardTable.vue)
- [src/views/production/node/storyboard.vue](/D:/code/toon/Toonflow-web/src/views/production/node/storyboard.vue)
- [src/views/production/node/workbench.vue](/D:/code/toon/Toonflow-web/src/views/production/node/workbench.vue)
- [src/views/production/node/media.vue](/D:/code/toon/Toonflow-web/src/views/production/node/media.vue)
- [src/views/production/node/prompt.vue](/D:/code/toon/Toonflow-web/src/views/production/node/prompt.vue)
- [src/views/production/node/loop.vue](/D:/code/toon/Toonflow-web/src/views/production/node/loop.vue)
- [src/views/production/node/imageGroup.vue](/D:/code/toon/Toonflow-web/src/views/production/node/imageGroup.vue)

如发现标题栏结构重复较多，可补一个轻量共用组件或样式层，但不单独拆出复杂抽象。

## 测试与验收

### 功能验收

- 所有节点卡片都能看到放大按钮。
- 点击任一节点放大按钮，都能打开对应节点的放大弹窗。
- 弹窗中显示的是该节点当前最新数据。
- 在弹窗内编辑节点内容后，关闭弹窗，画布中的节点内容同步更新。
- 弹窗内不显示连线端口和 resize 手柄。
- 弹窗内仍可执行节点原有操作，例如运行、预览、编辑等。
- 原有节点内部专用弹窗不受影响。

### 回归验收

- 画布拖拽、缩放、选中、连线不受影响。
- 切换 episode 后，放大状态正确重置或切换到当前页面合法节点。
- 新增节点、删除节点后，不会出现失效的放大弹窗引用。
- `media`、`prompt`、`loop`、兼容节点在两种模式下都无明显布局错乱。

## 风险与处理

### 风险 1：节点组件强依赖画布容器样式

部分节点可能默认假设自己始终在卡片容器中渲染，放大后会出现高度塌陷或内容过满。

处理方式：

- 通过 `renderMode` 为弹窗模式单独补最小样式分支
- 只调整容器和标题栏，不改业务逻辑

### 风险 2：兼容节点已有弹窗与放大弹窗叠加

节点内部可能继续打开自己的编辑弹窗，形成“弹窗中再弹窗”。

处理方式：

- 一期允许这种叠加，只保证不冲突、不丢数据
- 不在本次需求内重构已有节点的编辑模式

### 风险 3：标题栏按钮过多

部分节点标题栏原本已有多个按钮，新增放大按钮可能造成挤压。

处理方式：

- 放大按钮保持最轻量尺寸
- 必要时对个别节点标题栏布局做小幅调整，但不改主交互

## 实现顺序

1. 先补 store 的放大状态。
2. 再补 `index.vue` 的全局弹窗宿主。
3. 然后适配新增节点组件。
4. 最后适配兼容节点组件和统一按钮样式。
5. 完成后跑前端构建与关键页面回归。
