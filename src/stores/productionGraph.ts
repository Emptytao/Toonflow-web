import { defineStore } from "pinia";
import { useDebounceFn } from "@vueuse/core";
import type { Connection, XYPosition } from "@vue-flow/core";
import dayjs from "dayjs";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import {
  cloneGraphDocument,
  createDefaultGraphDocument,
  createGraphEdge,
  createGraphNode,
  createRuntime,
  getNodeOutputItems,
  inferEdgeChannel,
  sanitizeGraphDocumentForSave,
  type GraphDocument,
  type GraphMediaGroup,
  type GraphMediaItem,
  type GraphNodeType,
  type ImageGroupNodeData,
  type MediaNodeData,
  type ProductionEdge,
  type ProductionNode,
  type PromptResource,
} from "@/views/production/graph/types";

interface ClipboardPayload {
  nodes: ProductionNode[];
  edges: ProductionEdge[];
}

interface PendingVideoJob {
  nodeId: string;
  runtime: MediaNodeData["runtime"];
}

function makeProductionGraphStore(projectId: string) {
  return defineStore(`productionGraph-${projectId}`, () => {
    const graphDocument = ref<any>(createDefaultGraphDocument(Number(projectId), 0));
    const loading = ref(false);
    const saving = ref(false);
    const version = ref(0);
    const currentEpisodeId = ref<number>();
    const selectedNodeIds = ref<string[]>([]);
    const selectedEdgeIds = ref<string[]>([]);
    const expandedNodeId = ref("");
    const clipboard = ref<ClipboardPayload | null>(null);
    const historyStack = ref<string[]>([]);
    const futureStack = ref<string[]>([]);
    const templates = ref<PromptResource[]>([]);
    const presets = ref<PromptResource[]>([]);

    let pollTimer: number | null = null;

    function isNodeSelected(node: ProductionNode) {
      return Boolean(node.selected);
    }

    function isEdgeSelected(edge: ProductionEdge) {
      return Boolean(edge.selected);
    }

    const nodes = computed<ProductionNode[]>({
      get: () => (graphDocument.value.nodes ?? []) as ProductionNode[],
      set: (value: ProductionNode[]) => {
        graphDocument.value.nodes = value;
      },
    });

    const edges = computed<ProductionEdge[]>({
      get: () => (graphDocument.value.edges ?? []) as ProductionEdge[],
      set: (value: ProductionEdge[]) => {
        graphDocument.value.edges = value;
      },
    });

    const selectedNodes = computed<ProductionNode[]>(() => {
      const ids = new Set(selectedNodeIds.value);
      const list: ProductionNode[] = [];
      for (const node of graphDocument.value.nodes) {
        if (ids.has(node.id)) {
          list.push(node);
        }
      }
      return list;
    });
    const selectedEdges = computed<ProductionEdge[]>(() => {
      const ids = new Set(selectedEdgeIds.value);
      const list: ProductionEdge[] = [];
      for (const edge of graphDocument.value.edges) {
        if (ids.has(edge.id)) {
          list.push(edge);
        }
      }
      return list;
    });
    const activeNode = computed<ProductionNode | undefined>(() => selectedNodes.value[0]);
    const composerNode = computed(() => (activeNode.value?.type === "media" ? activeNode.value : undefined));

    function hydrateClientDocument(document: GraphDocument) {
      return {
        ...document,
        nodes: document.nodes.map((node) => ({
          ...node,
          dragHandle: node.dragHandle ?? ".dragHandle",
        })),
        edges: document.edges.map((edge) => ({
          ...edge,
          type: edge.type ?? "graphEdge",
        })),
      } as GraphDocument;
    }

    function ensureExpandedNodeExists(nextNodes: ProductionNode[] = (graphDocument.value.nodes ?? []) as ProductionNode[]) {
      if (expandedNodeId.value && !nextNodes.some((node) => node.id === expandedNodeId.value)) {
        expandedNodeId.value = "";
      }
    }

    function openExpandedNode(nodeId: string) {
      expandedNodeId.value = nodeId;
    }

    function closeExpandedNode() {
      expandedNodeId.value = "";
    }

    function resetTransientState() {
      selectedNodeIds.value = [];
      selectedEdgeIds.value = [];
      closeExpandedNode();
      clipboard.value = null;
      historyStack.value = [];
      futureStack.value = [];
      stopPolling();
    }

    function serializeGraphSnapshot() {
      return JSON.stringify(graphDocument.value as unknown as Record<string, any>);
    }

    function getPersistedGraphDocument() {
      return sanitizeGraphDocumentForSave(graphDocument.value as any);
    }

    function captureHistory() {
      historyStack.value.push(serializeGraphSnapshot());
      if (historyStack.value.length > 60) {
        historyStack.value.shift();
      }
      futureStack.value = [];
    }

    async function saveGraphNow() {
      if (!currentEpisodeId.value) return;
      saving.value = true;
      try {
        const { data } = await axios.post("/production/graph/save", {
          projectId: Number(projectId),
          episodeId: currentEpisodeId.value,
          graphData: getPersistedGraphDocument(),
        });
        version.value = data?.version ?? version.value;
      } finally {
        saving.value = false;
      }
    }

    const scheduleSave = useDebounceFn(saveGraphNow, 500);

    async function loadTemplates() {
      const { data } = await axios.post("/production/graph/template/list", {
        projectId: Number(projectId),
      });
      templates.value = data ?? [];
    }

    async function loadPresets() {
      const { data } = await axios.post("/production/graph/preset/list", {
        projectId: Number(projectId),
      });
      presets.value = data ?? [];
    }

    async function loadGraph(episodeId: number) {
      loading.value = true;
      try {
        const { data } = await axios.post("/production/graph/get", {
          projectId: Number(projectId),
          episodeId,
        });
        currentEpisodeId.value = episodeId;
        version.value = data?.version ?? 0;
        graphDocument.value = hydrateClientDocument(data?.graphData ?? createDefaultGraphDocument(Number(projectId), episodeId));
        ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
        resetTransientState();
        await Promise.all([loadTemplates(), loadPresets()]);
        startPolling();
      } finally {
        loading.value = false;
      }
    }

    function replaceDocument(document: GraphDocument) {
      graphDocument.value = hydrateClientDocument(cloneGraphDocument(document));
      ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
      syncSelection([], []);
      scheduleSave();
    }

    function syncSelection(nodeIds: string[], edgeIds: string[]) {
      selectedNodeIds.value = nodeIds;
      selectedEdgeIds.value = edgeIds;
      const currentNodes = graphDocument.value.nodes as unknown as Array<Record<string, any>>;
      const currentEdges = graphDocument.value.edges as unknown as Array<Record<string, any>>;
      (graphDocument.value as any).nodes = currentNodes.map(
        (node) =>
          ({
            ...node,
            selected: nodeIds.includes(String(node.id)),
          }) as ProductionNode,
      );
      (graphDocument.value as any).edges = currentEdges.map(
        (edge) =>
          ({
            ...edge,
            selected: edgeIds.includes(String(edge.id)),
          }) as ProductionEdge,
      );
    }

    function clearSelection() {
      syncSelection([], []);
    }

    function updateViewport(viewport: GraphDocument["viewport"]) {
      graphDocument.value.viewport = { ...viewport };
      scheduleSave();
    }

    function setNodes(nextNodes: ProductionNode[]) {
      (graphDocument.value as any).nodes = nextNodes;
      ensureExpandedNodeExists(nextNodes);
      selectedNodeIds.value = nextNodes.filter(isNodeSelected).map((node) => node.id);
      selectedEdgeIds.value = selectedEdgeIds.value.filter((id) =>
        (graphDocument.value.edges as ProductionEdge[]).some((edge: ProductionEdge) => edge.id === id),
      );
      scheduleSave();
    }

    function setEdges(nextEdges: ProductionEdge[]) {
      (graphDocument.value as any).edges = nextEdges;
      selectedNodeIds.value = selectedNodeIds.value.filter((id) =>
        (graphDocument.value.nodes as ProductionNode[]).some((node: ProductionNode) => node.id === id),
      );
      selectedEdgeIds.value = nextEdges.filter(isEdgeSelected).map((edge) => edge.id);
      scheduleSave();
    }

    function addNode(nodeType: GraphNodeType, position: XYPosition, overrides: Partial<ProductionNode> = {}) {
      captureHistory();
      const node = createGraphNode(nodeType, position, overrides);
      graphDocument.value.nodes = [...graphDocument.value.nodes, node];
      syncSelection([node.id], []);
      scheduleSave();
      return node;
    }

    function updateNodeData(nodeId: string, updater: Record<string, any> | ((node: ProductionNode) => Record<string, any>)) {
      graphDocument.value.nodes = (graphDocument.value.nodes as ProductionNode[]).map((node: ProductionNode) => {
        if (node.id !== nodeId) return node;
        const patch = typeof updater === "function" ? updater(node) : updater;
        return {
          ...node,
          data: {
            ...(node.data as Record<string, any>),
            ...patch,
          },
        };
      });
      scheduleSave();
    }

    function updateNode(nodeId: string, patch: Partial<ProductionNode>) {
      graphDocument.value.nodes = (graphDocument.value.nodes as ProductionNode[]).map((node: ProductionNode) =>
        node.id === nodeId ? { ...node, ...patch } : node,
      );
      scheduleSave();
    }

    function removeEdgesByIds(edgeIds: string[]) {
      if (!edgeIds.length) return;
      captureHistory();
      graphDocument.value.edges = (graphDocument.value.edges as ProductionEdge[]).filter(
        (edge: ProductionEdge) => !edgeIds.includes(edge.id),
      );
      syncSelection(selectedNodeIds.value, selectedEdgeIds.value.filter((id) => !edgeIds.includes(id)));
      scheduleSave();
    }

    function removeNodesByIds(nodeIds: string[]) {
      if (!nodeIds.length) return;
      captureHistory();
      if (expandedNodeId.value && nodeIds.includes(expandedNodeId.value)) {
        closeExpandedNode();
      }
      graphDocument.value.nodes = (graphDocument.value.nodes as ProductionNode[]).filter(
        (node: ProductionNode) => !nodeIds.includes(node.id),
      );
      graphDocument.value.edges = (graphDocument.value.edges as ProductionEdge[]).filter(
        (edge: ProductionEdge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target),
      );
      clearSelection();
      scheduleSave();
    }

    function deleteSelection() {
      if (selectedEdgeIds.value.length) {
        removeEdgesByIds(selectedEdgeIds.value);
      }
      if (selectedNodeIds.value.length) {
        removeNodesByIds(selectedNodeIds.value);
      }
    }

    function copySelection() {
      const nodesToCopy = selectedNodes.value.map((node) => cloneGraphDocument(node));
      const nodeIdSet = new Set(nodesToCopy.map((node) => node.id));
      const edgesToCopy = (graphDocument.value.edges as ProductionEdge[])
        .filter((edge: ProductionEdge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
        .map((edge: ProductionEdge) => cloneGraphDocument(edge));
      clipboard.value = {
        nodes: nodesToCopy,
        edges: edgesToCopy,
      };
    }

    function duplicateNodes(nodeIds: string[], offset = { x: 48, y: 48 }) {
      const sourceNodes = (graphDocument.value.nodes as ProductionNode[]).filter((node: ProductionNode) => nodeIds.includes(node.id));
      if (!sourceNodes.length) return [];
      captureHistory();
      const idMap = new Map<string, string>();
      const clonedNodes: ProductionNode[] = sourceNodes.map((node: ProductionNode) => {
        const cloned = createGraphNode(node.type!, { x: node.position.x + offset.x, y: node.position.y + offset.y }, {
          width: typeof node.width === "number" ? node.width : undefined,
          height: typeof node.height === "number" ? node.height : undefined,
          data: cloneGraphDocument(node.data),
        });
        (cloned.data as Record<string, any>).handleIds = (cloned.data as Record<string, any>).handleIds;
        idMap.set(node.id, cloned.id);
        return cloned;
      });
      const clonedEdges: ProductionEdge[] = (graphDocument.value.edges as ProductionEdge[])
        .filter((edge: ProductionEdge) => nodeIds.includes(edge.source) && nodeIds.includes(edge.target))
        .map((edge: ProductionEdge) => ({
          ...cloneGraphDocument(edge),
          id: `${idMap.get(edge.source)}-${idMap.get(edge.target)}-${Date.now()}-${Math.random()}`,
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        }));

      graphDocument.value.nodes = [...graphDocument.value.nodes, ...clonedNodes];
      graphDocument.value.edges = [...graphDocument.value.edges, ...clonedEdges];
      syncSelection(
        clonedNodes.map((node) => node.id),
        [],
      );
      scheduleSave();
      return clonedNodes;
    }

    function pasteClipboard(position?: XYPosition) {
      if (!clipboard.value?.nodes?.length) return [];
      const clipboardNodes = clipboard.value.nodes as unknown as Array<Record<string, any>>;
      const clipboardEdges = clipboard.value.edges as unknown as Array<Record<string, any>>;
      const minX = Math.min(...clipboardNodes.map((node) => Number(node.position?.x ?? 0)));
      const minY = Math.min(...clipboardNodes.map((node) => Number(node.position?.y ?? 0)));
      const offset = position ? { x: position.x - minX, y: position.y - minY } : { x: 56, y: 56 };
      captureHistory();
      const idMap = new Map<string, string>();
      const clonedNodes: ProductionNode[] = clipboardNodes.map((node) => {
        const cloned = createGraphNode(node.type!, { x: node.position.x + offset.x, y: node.position.y + offset.y }, {
          width: typeof node.width === "number" ? node.width : undefined,
          height: typeof node.height === "number" ? node.height : undefined,
          data: cloneGraphDocument(node.data),
        });
        idMap.set(node.id, cloned.id);
        return cloned;
      });
      const clonedEdges: ProductionEdge[] = clipboardEdges.map((edge) => ({
        ...cloneGraphDocument(edge),
        id: `${idMap.get(edge.source)}-${idMap.get(edge.target)}-${Date.now()}-${Math.random()}`,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
      }));
      graphDocument.value.nodes = [...graphDocument.value.nodes, ...clonedNodes];
      graphDocument.value.edges = [...graphDocument.value.edges, ...clonedEdges];
      syncSelection(
        clonedNodes.map((node) => node.id),
        [],
      );
      scheduleSave();
      return clonedNodes;
    }

    function validateConnection(connection: Connection) {
      const source = (graphDocument.value.nodes as ProductionNode[]).find((node: ProductionNode) => node.id === connection.source);
      const target = (graphDocument.value.nodes as ProductionNode[]).find((node: ProductionNode) => node.id === connection.target);
      if (!source || !target || source.id === target.id) return false;
      if (
        (graphDocument.value.edges as ProductionEdge[]).some(
          (edge: ProductionEdge) =>
            edge.source === source.id && edge.target === target.id && edge.data?.channel === inferEdgeChannel(source.type),
        )
      ) {
        return false;
      }
      if (source.type === "prompt" || source.type === "loop") {
        return target.type === "media";
      }
      if (source.type === "media" || source.type === "imageGroup") {
        return target.type === "media" || target.type === "imageGroup";
      }
      if (source.type === "assets" || source.type === "storyboard") {
        return target.type === "media";
      }
      return true;
    }

    function connectNodes(connection: Connection) {
      if (!validateConnection(connection)) return false;
      const source = (graphDocument.value.nodes as ProductionNode[]).find((node: ProductionNode) => node.id === connection.source);
      const target = (graphDocument.value.nodes as ProductionNode[]).find((node: ProductionNode) => node.id === connection.target);
      if (!source || !target) return false;
      captureHistory();
      graphDocument.value.edges = [...graphDocument.value.edges, createGraphEdge(source, target, connection as Partial<ProductionEdge>)];
      scheduleSave();
      return true;
    }

    function undo() {
      const snapshot = historyStack.value.pop();
      if (!snapshot) return;
      futureStack.value.unshift(serializeGraphSnapshot());
      graphDocument.value = hydrateClientDocument(JSON.parse(snapshot) as GraphDocument);
      clearSelection();
      scheduleSave();
    }

    function redo() {
      const snapshot = futureStack.value.shift();
      if (!snapshot) return;
      historyStack.value.push(serializeGraphSnapshot());
      graphDocument.value = hydrateClientDocument(JSON.parse(snapshot) as GraphDocument);
      clearSelection();
      scheduleSave();
    }

    function addHistoryResult(nodeId: string, item: GraphMediaItem) {
      updateNodeData(nodeId, (node) => {
        const data = node.data as MediaNodeData;
        const group: GraphMediaGroup = {
          id: crypto.randomUUID(),
          label: `${data.mode === "video" ? "视频结果" : "图片结果"} ${dayjs().format("YYYY-MM-DD HH:mm:ss")}`,
          items: [{ ...item, createdAt: Date.now() }],
          createdAt: Date.now(),
        };
        return {
          historyGroups: [group, ...(data.historyGroups ?? [])],
          selectedGroupId: group.id,
          selectedItemId: item.id,
        };
      });
    }

    async function runNode(nodeId: string) {
      if (!currentEpisodeId.value) return;
        const { data } = await axios.post("/production/graph/runNode", {
          projectId: Number(projectId),
          episodeId: currentEpisodeId.value,
          nodeId,
          graphData: getPersistedGraphDocument(),
        });
      if (data?.graphData) {
        graphDocument.value = hydrateClientDocument(data.graphData);
        ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
      }
      if (data?.node) {
        updateNode(nodeId, data.node);
      }
      startPolling();
      scheduleSave();
      return data;
    }

    async function runChain(nodeId: string) {
      if (!currentEpisodeId.value) return;
        const { data } = await axios.post("/production/graph/runChain", {
          projectId: Number(projectId),
          episodeId: currentEpisodeId.value,
          nodeId,
          graphData: getPersistedGraphDocument(),
        });
      if (data?.graphData) {
        graphDocument.value = hydrateClientDocument(data.graphData);
        ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
      }
      startPolling();
      scheduleSave();
      return data;
    }

    const pendingVideoJobs = computed<PendingVideoJob[]>(() =>
      (graphDocument.value.nodes as ProductionNode[])
        .filter((node: ProductionNode) => node.type === "media")
        .map((node: ProductionNode) => ({
          nodeId: node.id,
          runtime: (node.data as MediaNodeData).runtime,
        }))
        .filter(
          (item: PendingVideoJob) =>
            item.runtime?.jobType === "video" && item.runtime?.jobId && ["queued", "running"].includes(item.runtime.status),
        ),
    );

    async function pollJobs() {
      if (!pendingVideoJobs.value.length) return;
      const { data } = await axios.post("/production/graph/queryJob", {
        jobs: pendingVideoJobs.value.map((item: PendingVideoJob) => ({
          nodeId: item.nodeId,
          jobId: item.runtime.jobId,
          jobType: "video",
        })),
      });
      const jobs = data?.jobs ?? [];
      if (!jobs.length) return;
      jobs.forEach((job: { nodeId: string; status: string; url?: string; errorMessage?: string; finishedAt?: number; jobId?: number }) => {
        updateNodeData(job.nodeId, (node) => {
          const nodeData = node.data as MediaNodeData;
          const runtime = createRuntime({
            ...nodeData.runtime,
            status: job.status as MediaNodeData["runtime"]["status"],
            finishedAt: job.finishedAt ?? Date.now(),
            resultUrl: job.url ?? "",
            errorMessage: job.errorMessage ?? "",
          });
          return {
            runtime,
          };
        });
        if (job.status === "success" && job.url) {
          const node = (graphDocument.value.nodes as ProductionNode[]).find((item: ProductionNode) => item.id === job.nodeId);
          const exists = getNodeOutputItems(node).some((item: GraphMediaItem) => item.url === job.url);
          if (!exists) {
            addHistoryResult(job.nodeId, {
              id: crypto.randomUUID(),
              fileType: "video",
              url: job.url,
              sourceNodeId: job.nodeId,
            });
          }
        }
      });
      if (!pendingVideoJobs.value.length) {
        stopPolling();
      }
    }

    function startPolling() {
      if (pollTimer != null) return;
      pollTimer = window.setInterval(() => {
        void pollJobs();
      }, 3000);
    }

    function stopPolling() {
      if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    async function uploadMedia(base64Data: string) {
      if (!currentEpisodeId.value) throw new Error("当前未选择集数");
      const { data } = await axios.post("/production/graph/uploadMedia", {
        projectId: Number(projectId),
        episodeId: currentEpisodeId.value,
        base64Data,
      });
      return data as { url: string; fileType: GraphMediaItem["fileType"] };
    }

    async function saveTemplate(payload: Pick<PromptResource, "name" | "category" | "content" | "description">) {
      await axios.post("/production/graph/template/save", {
        projectId: Number(projectId),
        ...payload,
      });
      await loadTemplates();
    }

    async function updateTemplate(payload: Pick<PromptResource, "id" | "name" | "category" | "content" | "description">) {
      await axios.post("/production/graph/template/update", {
        projectId: Number(projectId),
        ...payload,
      });
      await loadTemplates();
    }

    async function deleteTemplate(id: string) {
      await axios.post("/production/graph/template/delete", {
        id,
        projectId: Number(projectId),
      });
      await loadTemplates();
    }

    async function savePreset(payload: Pick<PromptResource, "name" | "category" | "content" | "description">) {
      await axios.post("/production/graph/preset/save", {
        projectId: Number(projectId),
        ...payload,
      });
      await loadPresets();
    }

    async function updatePreset(payload: Pick<PromptResource, "id" | "name" | "category" | "content" | "description">) {
      await axios.post("/production/graph/preset/update", {
        projectId: Number(projectId),
        ...payload,
      });
      await loadPresets();
    }

    async function deletePreset(id: string) {
      await axios.post("/production/graph/preset/delete", {
        id,
        projectId: Number(projectId),
      });
      await loadPresets();
    }

    function groupSelectedMediaNodes() {
      const mediaNodes = selectedNodes.value.filter((node) => node.type === "media");
      if (mediaNodes.length < 2) return;
      captureHistory();
      const items = mediaNodes.flatMap((node) => getNodeOutputItems(node));
      const minX = Math.min(...mediaNodes.map((node) => node.position.x));
      const minY = Math.min(...mediaNodes.map((node) => node.position.y));
      const baseGroupData = createGraphNode("imageGroup", { x: minX, y: minY }).data as ImageGroupNodeData;
      const groupNode = createGraphNode("imageGroup", { x: minX, y: minY }, {
        data: {
          ...baseGroupData,
          items,
        } as ImageGroupNodeData,
        width: 360,
        height: 260,
      });
      graphDocument.value.nodes = [...(graphDocument.value.nodes as ProductionNode[]).filter((node: ProductionNode) => !selectedNodeIds.value.includes(node.id)), groupNode];
      ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
      graphDocument.value.edges = (graphDocument.value.edges as ProductionEdge[]).filter(
        (edge: ProductionEdge) => !selectedNodeIds.value.includes(edge.source) && !selectedNodeIds.value.includes(edge.target),
      );
      syncSelection([groupNode.id], []);
      scheduleSave();
    }

    function ungroupNode(nodeId: string) {
      const groupNode = (graphDocument.value.nodes as ProductionNode[]).find(
        (node: ProductionNode) => node.id === nodeId && node.type === "imageGroup",
      );
      if (!groupNode) return;
      const groupData = groupNode.data as any;
      if (!groupData.items?.length) {
        removeNodesByIds([nodeId]);
        return;
      }
      captureHistory();
      const createdNodes: ProductionNode[] = groupData.items.map((item: GraphMediaItem, index: number) => {
        const baseMediaData = createGraphNode("media", { x: 0, y: 0 }).data as MediaNodeData;
        return createGraphNode("media", { x: groupNode.position.x + index * 36, y: groupNode.position.y + index * 24 }, {
          width: 300,
          height: 220,
          data: {
            ...baseMediaData,
            items: [item],
            historyGroups: [],
            mode: item.fileType === "video" ? "video" : "image",
          } as MediaNodeData,
        });
      });
      graphDocument.value.nodes = [...(graphDocument.value.nodes as ProductionNode[]).filter((node: ProductionNode) => node.id !== nodeId), ...createdNodes];
      ensureExpandedNodeExists(graphDocument.value.nodes as ProductionNode[]);
      syncSelection(createdNodes.map((node) => node.id), []);
      scheduleSave();
    }

    function mergeNodeIntoGroup(mediaNodeId: string, groupNodeId: string) {
      const mediaNode = (graphDocument.value.nodes as ProductionNode[]).find(
        (node: ProductionNode) => node.id === mediaNodeId && node.type === "media",
      );
      const groupNode = (graphDocument.value.nodes as ProductionNode[]).find(
        (node: ProductionNode) => node.id === groupNodeId && node.type === "imageGroup",
      );
      if (!mediaNode || !groupNode) return;
      const items = getNodeOutputItems(mediaNode);
      if (!items.length) return;
      captureHistory();
      updateNodeData(groupNodeId, (node) => {
        const data = node.data as any;
        return {
          items: [...(data.items ?? []), ...items],
        };
      });
      removeNodesByIds([mediaNodeId]);
      syncSelection([groupNodeId], []);
    }

    return {
      graphDocument,
      nodes,
      edges,
      loading,
      saving,
      version,
      currentEpisodeId,
      selectedNodeIds,
      selectedEdgeIds,
      expandedNodeId,
      selectedNodes,
      selectedEdges,
      activeNode,
      composerNode,
      templates,
      presets,
      clipboard,
      historyStack,
      futureStack,
      loadGraph,
      replaceDocument,
      captureHistory,
      clearSelection,
      syncSelection,
      updateViewport,
      setNodes,
      setEdges,
      addNode,
      updateNode,
      updateNodeData,
      removeEdgesByIds,
      removeNodesByIds,
      deleteSelection,
      copySelection,
      pasteClipboard,
      duplicateNodes,
      connectNodes,
      undo,
      redo,
      runNode,
      runChain,
      pollJobs,
      startPolling,
      stopPolling,
      uploadMedia,
      loadTemplates,
      loadPresets,
      saveTemplate,
      updateTemplate,
      deleteTemplate,
      savePreset,
      updatePreset,
      deletePreset,
      groupSelectedMediaNodes,
      ungroupNode,
      mergeNodeIntoGroup,
      openExpandedNode,
      closeExpandedNode,
    };
  });
}

const storeMap = new Map<string, ReturnType<typeof makeProductionGraphStore>>();

function createProductionGraphStore(projectId: string) {
  if (!storeMap.has(projectId)) {
    storeMap.set(projectId, makeProductionGraphStore(projectId));
  }
  return storeMap.get(projectId)!;
}

export default function useProductionGraphStore() {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createProductionGraphStore(id)();
}
