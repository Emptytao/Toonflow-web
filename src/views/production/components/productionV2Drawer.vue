<template>
  <div class="productionV2Drawer">
    <div class="drawerHeader">
      <div class="drawerBreadcrumb">
        <span class="crumb">Production</span>
        <span class="crumbDivider">/</span>
        <span class="crumb">Workflow</span>
        <span class="crumbDivider">/</span>
        <span class="crumb active">Production V2</span>
      </div>
      <button class="closeBtn" @click.stop="emit('close')">
        <click-to-fold size="18" />
      </button>
    </div>

    <div class="drawerBody">
      <div class="heroCard">
        <div class="heroHead">
          <div class="episodeBadge">
            <i-dot theme="outline" :fill="'#16a34a'" />
            <span>{{ props.title || "当前剧集" }}</span>
          </div>
          <button class="heroIconButton" @click="openProductionV2(false)">
            <page-template size="18" />
          </button>
        </div>

        <div class="heroTitle">Production V2 新画布入口</div>
        <div class="heroDesc">从这里进入独立的无限画布工作流，新旧 Production 并行存在，不会改动当前页面内容。</div>

        <div class="guideTrail">
          <span class="trailItem">旧 Production</span>
          <span class="trailArrow">→</span>
          <span class="trailItem">右侧入口抽屉</span>
          <span class="trailArrow">→</span>
          <span class="trailItem active">Production V2</span>
        </div>

        <div class="actionRow">
          <t-button theme="primary" @click="openProductionV2(false)">
            <template #icon>
              <workbench size="16" />
            </template>
            打开新画布
          </t-button>
          <t-button variant="outline" @click="openProductionV2(true)">
            <template #icon>
              <page-template size="16" />
            </template>
            新窗口打开
          </t-button>
        </div>
      </div>

      <div class="guidePanel">
        <div class="guidePanelTitle">当前入口说明</div>
        <div class="guideGrid">
          <div class="guideItem">
            <div class="guideItemLabel">当前项目</div>
            <div class="guideItemValue">{{ project?.name || "未命名项目" }}</div>
          </div>
          <div class="guideItem">
            <div class="guideItemLabel">当前剧集</div>
            <div class="guideItemValue">{{ props.title || `第 ${props.episodeId || "-"} 集` }}</div>
          </div>
          <div class="guideItem">
            <div class="guideItemLabel">打开方式</div>
            <div class="guideItemValue">独立 V2 无限画布</div>
          </div>
          <div class="guideItem">
            <div class="guideItemLabel">上下文</div>
            <div class="guideItemValue">保持当前项目 / 剧集</div>
          </div>
        </div>
      </div>

      <div class="bottomComposer">
        <div class="composerHint">
          <div class="composerHintTitle">准备切换到新画布</div>
          <div class="composerHintDesc">点击右侧按钮后，将跳转到 `production-v2`，并优先带上当前剧集上下文。</div>
        </div>
        <button class="composerLaunch" @click="openProductionV2(false)">
          <page-template size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClickToFold, PageTemplate, Workbench } from "@icon-park/vue-next";
import projectStore from "@/stores/project";

const router = useRouter();
const { project } = storeToRefs(projectStore());

const props = defineProps<{
  title?: string;
  episodeId?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const routeLocation = computed(() =>
  router.resolve({
    path: "/production-v2",
    query: props.episodeId ? { episodeId: String(props.episodeId) } : undefined,
  }),
);

function openProductionV2(openInNewTab = false) {
  const href = routeLocation.value.href;
  if (openInNewTab) {
    window.open(href, "_blank");
    return;
  }
  router.push(routeLocation.value);
}
</script>

<style lang="scss" scoped>
.productionV2Drawer {
  position: absolute;
  top: 62px;
  right: 5px;
  bottom: 10px;
  width: min(460px, calc(100vw - 24px));
  display: flex;
  flex-direction: column;
  z-index: 9999;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: -10px 12px 40px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.drawerHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.drawerBreadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.crumb,
.crumbDivider {
  font-size: 12px;
  color: #64748b;
}

.crumb {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.crumb.active {
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.18);
}

.closeBtn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
  }
}

.drawerBody {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.06), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.heroCard,
.guidePanel,
.bottomComposer {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.heroCard {
  padding: 16px;
}

.heroHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.episodeBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.heroIconButton {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.heroTitle {
  margin-top: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.heroDesc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #475569;
}

.guideTrail {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trailItem,
.trailArrow {
  font-size: 12px;
  color: #64748b;
}

.trailItem {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f8fafc;
}

.trailItem.active {
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.08);
}

.actionRow {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.guidePanel {
  padding: 16px;
}

.guidePanelTitle,
.composerHintTitle {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.guideGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.guideItem {
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.guideItemLabel {
  font-size: 12px;
  color: #64748b;
}

.guideItemValue {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.6;
}

.bottomComposer {
  margin-top: auto;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.composerHint {
  min-width: 0;
}

.composerHintDesc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.composerLaunch {
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
}

@media (max-width: 900px) {
  .productionV2Drawer {
    top: 70px;
    left: 12px;
    right: 12px;
    width: auto;
  }

  .guideGrid {
    grid-template-columns: 1fr;
  }
}
</style>
