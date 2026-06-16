<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <imageSelect :mode="modelParmas.mode as VideoMode" v-model="imageList" :storyboard-list="storyboardList" />
      </div>
    </div>
    <div class="modelSelect">
      <modeMenu v-model="modelParmas" :modeOptions="modeOptions" :trackId="currentTrack?.id" :modeList="modeList" @modeChange="modeChange" />
    </div>
    <div class="generate ac">
      <div class="prompt" v-if="currentTrack">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <div class="actionGroup">
              <t-select
                v-model="currentTemplateKey"
                size="small"
                class="templateSelect"
                :options="templateSelectOptions"
                :placeholder="$t('workbench.generate.templatePlaceholder')" />
              <t-button size="small" class="genTextbtn" :loading="activeTrackGenTextLoading" @click="genText">
                {{ $t("workbench.generate.generateText") }}
              </t-button>
            </div>
          </template>
          <div class="promptData fc">
            <div class="styleRow">
              <span class="styleLabel">{{ $t("workbench.generate.promptStyle") }}</span>
              <t-select
                :value="currentTrack.promptStyle"
                class="styleSelect"
                size="small"
                :options="promptStyleSelectOptions"
                @change="handlePromptStyleChange">
              </t-select>
            </div>
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="currentTrack.prompt" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
            <div class="bgmPanel">
              <div class="panelTitle">BGM 推荐</div>
              <div class="panelContent">
                {{ currentTrack.bgmSuggestion || bgmSuggestionFallback }}
              </div>
            </div>
            <div class="traceActionRow">
              <t-button size="small" variant="outline" class="traceActionBtn" @click="thinkingDialogVisible = true">
                AI思考
              </t-button>
              <t-button size="small" variant="outline" class="traceActionBtn" @click="skillDialogVisible = true">
                Skill / Tool
              </t-button>
            </div>
          </div>
        </t-card>
      </div>
      <div class="video">
        <videoCard
          v-if="currentTrack"
          :active-track-index="activeTrackIndex"
          v-model:current-track="currentTrack"
          @refresh="getGenerateData"
          @generate="generateVideo" />
      </div>
    </div>
    <div class="track">
      <newTrack
        v-model:activeTrackIndex="activeTrackIndex"
        v-model:genTextLoadingMap="genTextLoadingMap"
        v-model="trackList"
        :image-list="imageList"
        :prompt-style-options="resolvedPromptStyleOptions"
        :template-options="resolvedTemplateOptions"
        @change="trackChange"
        :modelParmas="modelParmas"
        :clampDuration="clampDuration"
        @getData="getGenerateData" />
    </div>

    <t-dialog v-model:visible="generatePreviewVisible" header="生成前检查" width="760px" placement="center" :footer="false" destroy-on-close>
      <div class="generatePreview" v-if="currentTrack">
        <div class="previewSection">
          <div class="previewTitle">{{ $t("workbench.generate.template") }}</div>
          <div class="previewBlock">{{ currentTemplateLabel }}</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">AI 提示词</div>
          <div class="previewBlock">{{ currentTrack.prompt || "当前暂无提示词，请先生成提示词。" }}</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">BGM 推荐</div>
          <div class="previewBlock">{{ currentTrack.bgmSuggestion || bgmSuggestionFallback }}</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">{{ $t("workbench.generate.promptStyle") }}</div>
          <div class="previewBlock">{{ currentPromptStyleLabel }}</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">调用 Skill</div>
          <div class="previewBlock">{{ currentTrack.aiTrace?.skill || "videoPromptGeneration" }}</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">调用 Tool</div>
          <div v-if="currentTrack.aiTrace?.tools?.length" class="chips">
            <span
              v-for="tool in currentTrack.aiTrace.tools"
              :key="tool"
              class="chip">
              {{ tool }}
            </span>
          </div>
          <div v-else class="previewBlock">当前未记录 Tool。</div>
        </div>
        <div class="previewSection">
          <div class="previewTitle">AI 思考过程</div>
          <div class="previewBlock">{{ aiThinkingFallback }}</div>
        </div>
        <div class="previewFooter">
          <t-button variant="outline" @click="generatePreviewVisible = false">取消</t-button>
          <t-button theme="primary" :loading="generateSubmitLoading" @click="submitGenerateVideo">开始生成</t-button>
        </div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="thinkingDialogVisible" header="AI 思考过程" width="760px" placement="center" :footer="false" destroy-on-close class="traceDialog">
      <div class="traceDialogBody">
        <div class="traceDialogContent">{{ aiThinkingFallback }}</div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="skillDialogVisible" header="调用 Skill / Tool" width="760px" placement="center" :footer="false" destroy-on-close class="traceDialog">
      <div class="traceDialogBody">
        <div class="traceMeta">
          <div class="metaRow">
            <span class="metaLabel">{{ $t("workbench.generate.template") }}</span>
            <span class="metaValue">{{ currentTemplateLabel }}</span>
          </div>
          <div class="metaRow">
            <span class="metaLabel">{{ $t("workbench.generate.promptStyle") }}</span>
            <span class="metaValue">{{ currentPromptStyleLabel }}</span>
          </div>
          <div class="metaRow" v-if="currentTrack?.aiTrace?.styleSkillName">
            <span class="metaLabel">Style Skill</span>
            <span class="metaValue">{{ currentTrack.aiTrace?.styleSkillName }}</span>
          </div>
          <div class="metaRow">
            <span class="metaLabel">Skill</span>
            <span class="metaValue">{{ currentTrack?.aiTrace?.skill || "videoPromptGeneration" }}</span>
          </div>
          <div class="metaRow" v-if="currentTrack?.aiTrace?.systemLayers?.length">
            <span class="metaLabel">System Layers</span>
            <div class="chips">
              <span
                v-for="layer in currentTrack.aiTrace.systemLayers"
                :key="layer"
                class="chip">
                {{ layer }}
              </span>
            </div>
          </div>
          <div class="metaRow">
            <span class="metaLabel">Tool</span>
            <div v-if="currentTrack?.aiTrace?.tools?.length" class="chips">
              <span
                v-for="tool in currentTrack.aiTrace.tools"
                :key="tool"
                class="chip">
                {{ tool }}
              </span>
            </div>
            <span
              v-else
              class="metaValue">
              这条提示词暂未记录 Tool，重新生成提示词后会补齐
            </span>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import newTrack from "./components/track.vue";
import imageSelect from "./components/imageSelect.vue";
import modeMenu from "./components/modeMenu.vue";
import videoCard from "./components/video.vue";
import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import promptEditor from "@/components/promptEditor.vue";
import imageListCacheStore from "@/stores/imageListCache";

const DEFAULT_PROMPT_STYLE: PromptStyle = "general";
const DEFAULT_TEMPLATE_KEY: VideoPromptTemplateKey = "auto";
const FALLBACK_PROMPT_STYLE_OPTIONS: PromptStyleOption[] = [
  { value: "general", label: "通用润色" },
  { value: "high_energy", label: "高能戏剧化" },
  { value: "lyrical", label: "慢节奏细腻质感" },
];
const FALLBACK_TEMPLATE_OPTIONS: VideoPromptTemplateOption[] = [
  { value: "auto", label: "按模型自动选择" },
  { value: "universalMulti-parameter", label: "通用多参数模式" },
  { value: "universalFirstAndLastFrame", label: "通用首尾帧模式" },
  { value: "wan2.6Single-imageFirstFrame", label: "Wan 2.6 单图首帧模式" },
  { value: "seedance2Multi-parameter", label: "Seedance 2.0 多参数模式" },
  { value: "omni_flash-Multi-parameter", label: "Omni Flash 多参数模式" },
];

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);
const cacheStore = imageListCacheStore();
const { getCache, setCache, initCacheFromTrackList, warmUpUrls } = cacheStore;
const { urlMap } = storeToRefs(cacheStore);

const modeOptions = ref<VideoModel>({
  name: "",
  modelName: "",
  durationResolutionMap: [],
  audio: false,
  type: "video",
  mode: [],
}); // 当前模型配置

const trackList = ref<TrackItem[]>([]); // 轨道列表
const generatePreviewVisible = ref(false);
const generateSubmitLoading = ref(false);
const thinkingDialogVisible = ref(false);
const skillDialogVisible = ref(false);
const promptStyleOptions = ref<PromptStyleOption[]>([]);
const templateOptions = ref<VideoPromptTemplateOption[]>([]);
const currentTemplateKey = ref<VideoPromptTemplateKey>("auto");

const modelParmas = ref<ModelSetting>({
  mode: "",
  model: "",
  resolution: "480p",
  duration: 8,
  audio: false,
});

const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表

/** 排序优先级：assets有图=0，storyboard有图=1，无图=2 */
function getImageItemPriority(item: UploadItem): number {
  if (item.src) return item.sources === "assets" ? 0 : 1;
  return 2;
}

const imageList = computed({
  get(): UploadItem[] {
    // 触发对 urlMap 的依赖追踪，当 warmUpUrls 更新 urlMap 后自动重新计算
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    urlMap.value;
    const trackId = currentTrack.value?.id;
    const pid = project.value?.id;
    const sid = episodesId.value;
    // 优先从缓存读取
    if (pid != null && sid != null && trackId != null) {
      const cached = getCache(pid, sid, trackId);

      if (cached?.length) {
        return [...cached].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
      }
    }
    const medias = currentTrack.value?.medias;
    if (!medias?.length) return [];
    return [...(medias as UploadItem[])].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
  },
  set(val: UploadItem[]) {
    if (currentTrack.value) {
      currentTrack.value.medias = val as any;
      // 同步写入缓存
      const pid = project.value?.id;
      const sid = episodesId.value;
      const trackId = currentTrack.value.id;
      if (pid != null && sid != null && trackId != null) {
        setCache(pid, sid, trackId, val);
      }
    }
  },
});

function modeChange(newVal: string) {
  if (newVal == modelParmas.value.mode) return;
  if ((imageList.value.length || currentTrack.value?.prompt) && modelParmas.value.mode) {
    const dialog = DialogPlugin.confirm({
      header: $t("workbench.generate.modeChange"),
      body: $t("workbench.generate.modeChangeConfirm"),
      confirmBtn: $t("settings.generate.modelChnageSure"),
      cancelBtn: $t("settings.memory.msg.cancel"),
      onConfirm: async () => {
        imageList.value = [];
      currentTrack.value.prompt = "";
      currentTrack.value.bgmSuggestion = "";
      currentTrack.value.aiTrace = null;
      currentTrack.value.promptStyle = DEFAULT_PROMPT_STYLE;
      currentTemplateKey.value = DEFAULT_TEMPLATE_KEY;
      dialog.destroy();
      modelParmas.value.mode = newVal;
    },
    });
  } else if (newVal) {
    if (currentTrack.value) {
      currentTrack.value.bgmSuggestion = "";
      currentTrack.value.aiTrace = null;
      currentTrack.value.promptStyle = currentTrack.value.promptStyle || DEFAULT_PROMPT_STYLE;
      currentTemplateKey.value = currentTemplateKey.value || DEFAULT_TEMPLATE_KEY;
    }
    modelParmas.value.mode = newVal;
  }
}
const modeList = computed(() => {
  const modeLabelMap: Record<string, string> = {
    singleImage: "单图",
    startEndRequired: "首尾帧",
    endFrameOptional: "尾帧可选",
    startFrameOptional: "首帧可选",
    text: "文本生视频",
    videoReference: "视频",
    imageReference: "图片",
    audioReference: "音频",
    textReference: "文本",
  };
  function parseRefLabel(m: string): string {
    const match = m.match(/^(videoReference|imageReference|audioReference|textReference):(\d+)$/);
    if (match) {
      const base = modeLabelMap[match[1]] || match[1];
      return `${base} ×${match[2]}`;
    }
    return modeLabelMap[m] || m;
  }
  return modeOptions.value.mode
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => parseRefLabel(m)).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});
const currentTrack = computed({
  get() {
    return trackList.value[activeTrackIndex.value];
  },
  set(val) {
    trackList.value[activeTrackIndex.value] = val;
  },
});
const promptStyleSelectOptions = computed(() => {
  const options = promptStyleOptions.value.length ? promptStyleOptions.value : FALLBACK_PROMPT_STYLE_OPTIONS;
  return options.map((item) => ({ label: item.label, value: item.value }));
});
const templateSelectOptions = computed(() => {
  const source = templateOptions.value.length ? templateOptions.value : FALLBACK_TEMPLATE_OPTIONS;
  return source.map((item) => ({ label: item.label, value: item.value }));
});
const resolvedPromptStyleOptions = computed(() => (promptStyleOptions.value.length ? promptStyleOptions.value : FALLBACK_PROMPT_STYLE_OPTIONS));
const resolvedTemplateOptions = computed(() => (templateOptions.value.length ? templateOptions.value : FALLBACK_TEMPLATE_OPTIONS));
const promptStyleLabelMap = computed<Record<PromptStyle, string>>(() => {
  const source = promptStyleOptions.value.length ? promptStyleOptions.value : FALLBACK_PROMPT_STYLE_OPTIONS;
  return source.reduce(
    (acc, item) => {
      acc[item.value] = item.label;
      return acc;
    },
    { general: "通用润色", high_energy: "高能戏剧化", lyrical: "慢节奏细腻质感" } as Record<PromptStyle, string>,
  );
});
const currentPromptStyleLabel = computed(() => {
  const style = currentTrack.value?.promptStyle || DEFAULT_PROMPT_STYLE;
  return promptStyleLabelMap.value[style];
});
const currentTemplateLabel = computed(() => {
  const templateKey = currentTemplateKey.value || "auto";
  const source = resolvedTemplateOptions.value;
  return source.find((item) => item.value === templateKey)?.label || "按模型自动选择";
});
watch(
  templateOptions,
  (options) => {
    if (options.length && !options.some((item) => item.value === currentTemplateKey.value)) {
      currentTemplateKey.value = "auto";
    }
  },
  { immediate: true },
);
const bgmSuggestionFallback = computed(() => {
  if (!currentTrack.value?.prompt?.trim()) {
    return "当前还没有 BGM 推荐，请先生成提示词。";
  }
  return "这条提示词暂时没有生成出 BGM 推荐。重新生成提示词后会再次尝试。";
});
const aiThinkingFallback = computed(() => {
  const thinking = currentTrack.value?.aiTrace?.thinking?.trim();
  if (thinking) return thinking;
  if (!currentTrack.value?.prompt?.trim()) {
    return "当前还没有 AI 思考过程，请先生成提示词。";
  }
  return "这条提示词暂未记录 AI 思考过程。通常是旧数据生成时未保存，或当前模型没有返回 reasoning；重新生成提示词后会尝试补齐。";
});
/** 当前轨道是否正在生成提示词 */
const activeTrackGenTextLoading = computed(() => {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  return trackId != null ? !!genTextLoadingMap.value[trackId] : false;
});
/** 将时长限制在模型支持的范围内 */
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value?.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
  }
  return trackDuration;
}
watch(
  () => modelParmas.value.model,
  (val) => {
    if (!val) {
      modeOptions.value = {
        name: "",
        modelName: "",
        durationResolutionMap: [],
        audio: false,
        type: "video",
        mode: [],
      };
      modelParmas.value.mode = "";
      return;
    }
    axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
      modeOptions.value = data;
      modelParmas.value.audio = data.audio === true || data.audio === "true" || data.audio == "optional";
      const drMap = data.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0) {
        if (drMap[0].resolution?.length) modelParmas.value.resolution = drMap[0].resolution[0];
        if (drMap[0].duration?.length) modelParmas.value.duration = clampDuration(modelParmas.value.duration);
      }

      const currentParsed = parseMode(modelParmas.value.mode);
      const modeMatched =
        currentParsed !== null &&
        data.mode.some((m: VideoMode) => {
          if (Array.isArray(m) && Array.isArray(currentParsed)) {
            return JSON.stringify(m) === JSON.stringify(currentParsed);
          }
          return m == currentParsed;
        });
      if (!modeMatched) {
        const newMode = Array.isArray(data.mode[0]) ? JSON.stringify(data.mode[0]) : data.mode[0];
        modeChange(newMode);
      }
    });
  },
);
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ReferenceType[];
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}
/** uploadBox 作为 promptEditor 的引用预览 */
const references = computed(() => {
  function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
    const ext = src?.split(".").pop()?.toLowerCase() ?? "";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
    return "image";
  }

  return imageList.value
    .filter((item) => item.src)
    .map((item) => ({
      type: getFileTypeByExt(item.src) as "image" | "video" | "audio" | "text",
      src: item.src ?? "",
    }));
});

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });

  storyboardList.value = data.storyboardList;
  promptStyleOptions.value = Array.isArray(data.promptStyleOptions) && data.promptStyleOptions.length ? data.promptStyleOptions : FALLBACK_PROMPT_STYLE_OPTIONS;
  templateOptions.value = Array.isArray(data.templateOptions) && data.templateOptions.length ? data.templateOptions : FALLBACK_TEMPLATE_OPTIONS;
  // 优先使用本地缓存，没有缓存则用后端数据并写入缓存
  const pid = project.value?.id;
  const sid = episodesId.value;
  if (pid != null && sid != null) {
    data.trackList.forEach((track: TrackItem) => {
      track.promptStyle = track.promptStyle || DEFAULT_PROMPT_STYLE;
    });
    // 先将没有缓存的轨道写入缓存（保留已有本地编辑）
    initCacheFromTrackList(pid, sid, data.trackList);
    // 批量向后端请求文件路径对应的完整 URL
    await warmUpUrls(pid, sid);
    // 将本地缓存回写到 trackList，确保优先使用缓存数据（src 已解析为完整 URL）
    data.trackList.forEach((track: TrackItem) => {
      if (track.id == null) return;
      const cached = getCache(pid, sid, track.id);
      if (cached?.length) {
        track.medias = cached as unknown as TrackMedia[];
      }
    });
    // 整体赋值触发响应式
    trackList.value = [...data.trackList];
  }
  currentTemplateKey.value = currentTemplateKey.value || DEFAULT_TEMPLATE_KEY;

  modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);
}
/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: currentTrack.value?.prompt });
}
function handlePromptStyleChange(value: any) {
  const nextStyle = (Array.isArray(value) ? value[0] : value) as PromptStyle;
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (!trackId || !nextStyle || currentTrack.value?.promptStyle === nextStyle) return;
  currentTrack.value.promptStyle = nextStyle;
  axios
    .post("/production/workbench/updateVideoPrompt", { id: trackId, promptStyle: nextStyle, prompt: currentTrack.value?.prompt ?? "" })
    .catch((e) => window.$message.error((e as Error)?.message ?? $t("workbench.generate.promptStyleSaveFailed")));
}
const genTextLoadingMap = ref<Record<number, boolean>>({}); // trackId -> 是否正在生成提示词

/** 单个轨道生成提示词 */
async function genText() {
  if (currentTrack.value.id == null || genTextLoadingMap.value[currentTrack.value.id]) return;
  let info = [];
  const currentTrackId = currentTrack.value.id;
  const changeTrack = currentTrack.value;
  if (modelParmas.value.mode == "text") {
    info = changeTrack?.medias.map(({ id, sources }) => ({ id, sources }));
  } else {
    info =
      modelParmas.value.mode === "text"
        ? []
        : (() => {
            const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
            const preSliced = frameMode.includes(modelParmas.value.mode)
              ? imageList.value.slice(0, 2)
              : modelParmas.value.mode === "singleImage"
                ? imageList.value.slice(0, 1)
                : imageList.value;
            const filtered = preSliced.filter((item) => item.id).map(({ id, sources }) => ({ id, sources }));
            if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
            if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
            return filtered;
          })();
  }
  genTextLoadingMap.value[currentTrackId] = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: currentTrackId,
      info: info,
      model: modelParmas.value.model,
      mode: modelParmas.value.mode,
      promptStyle: changeTrack.promptStyle || DEFAULT_PROMPT_STYLE,
      templateKey: currentTemplateKey.value || DEFAULT_TEMPLATE_KEY,
    });
    changeTrack.prompt = data?.prompt ?? "";
    changeTrack.bgmSuggestion = data?.bgmSuggestion ?? "";
    changeTrack.aiTrace = data?.aiTrace ?? null;
    changeTrack.promptStyle = data?.promptStyle ?? changeTrack.promptStyle ?? DEFAULT_PROMPT_STYLE;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "提示词生成失败");
  } finally {
    genTextLoadingMap.value[currentTrackId] = false;
  }
}
function trackChange(prevIndex?: number) {
  // 切换前：将旧轨道的 imageList 保存到缓存
  if (prevIndex != null) {
    const prevTrack = trackList.value[prevIndex];
    const pid = project.value?.id;
    const sid = episodesId.value;
    if (pid != null && sid != null && prevTrack?.id != null) {
      setCache(pid, sid, prevTrack.id, prevTrack.medias as unknown as UploadItem[]);
    }
  }
  // 切换后：从缓存恢复当前轨道的 imageList
  const pid = project.value?.id;
  const sid = episodesId.value;
  const curTrack = trackList.value[activeTrackIndex.value];
  if (pid != null && sid != null && curTrack?.id != null) {
    const cached = getCache(pid, sid, curTrack.id);
    if (cached) {
      curTrack.medias = cached as unknown as TrackMedia[];
    }
  }
  // imageList 是基于 currentTrack.medias 的计算属性，切换轨道后自动切换数据
  if (modelParmas.value.mode == "singleImage" && imageList.value.length > 1) {
    imageList.value = imageList.value.slice(0, 1);
  }
  if (currentTrack.value && !currentTrack.value.promptStyle) {
    currentTrack.value.promptStyle = DEFAULT_PROMPT_STYLE;
  }
  if (!currentTemplateKey.value) {
    currentTemplateKey.value = DEFAULT_TEMPLATE_KEY;
  }
  modelParmas.value.duration = clampDuration(trackList.value?.[activeTrackIndex.value]?.duration);
}
/** 监听当前轨道的 medias 变化，实时同步到缓存 */
watch(
  () => currentTrack.value?.medias,
  (medias) => {
    if (!medias) return;
    const pid = project.value?.id;
    const sid = episodesId.value;
    const trackId = currentTrack.value?.id;
    if (pid != null && sid != null && trackId != null) {
      setCache(pid, sid, trackId, medias as unknown as UploadItem[]);
    }
  },
  { deep: true },
);

onMounted(() => {
  modelParmas.value.model = project.value?.videoModel || "";
  modelParmas.value.mode = project.value?.mode || "";
  getGenerateData();
  if (hasGenerateVideoIds.value && hasGenerateVideoIds.value.length) {
    startPoll();
  }
});
/** 单个轨道生成视频 */
async function generateVideo() {
  generatePreviewVisible.value = true;
}

async function submitGenerateVideo() {
  if (!currentTrack.value?.prompt?.trim()) {
    window.$message.warning("请先生成或填写视频提示词");
    return;
  }
  generateSubmitLoading.value = true;
  try {
    const { data } = await axios.post("/production/workbench/generateVideo", {
      projectId: project.value?.id,
      scriptId: episodesId.value,
      uploadData:
        modelParmas.value.mode === "text"
          ? []
          : (() => {
              const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
              const preSliced = frameMode.includes(modelParmas.value.mode)
                ? imageList.value.slice(0, 2)
                : modelParmas.value.mode === "singleImage"
                  ? imageList.value.slice(0, 1)
                  : imageList.value;
              const filtered = preSliced.filter((item) => Boolean(item.src) && item.id).map(({ id, sources }) => ({ id, sources }));
              if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
              if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
              return filtered;
            })(),
      prompt: currentTrack.value.prompt,
      model: modelParmas.value.model,
      mode: modelParmas.value.mode,
      resolution: modelParmas.value.resolution,
      duration: modelParmas.value.duration,
      audio: modelParmas.value.audio,
      trackId: currentTrack.value.id,
    });
    window.$message.success($t("workbench.generate.generateStarted"));
    currentTrack.value.videoList.push({
      id: data,
      state: "生成中",
      src: "",
    });
    generatePreviewVisible.value = false;
  } catch (e) {
    window.$message.error((e as any)?.message ?? "视频发起生成请求失败");
  } finally {
    generateSubmitLoading.value = false;
  }
}
let pollTimer: NodeJS.Timeout | null = null;

function startPoll() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => getVideoList(), 3000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
const hasGenerateVideoIds = computed(() => {
  return trackList.value
    .map((track) => {
      return track.videoList.filter((i) => i.state == "生成中").map((i) => i.id);
    })
    .flatMap((i) => i);
});

/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getVideoList() {
  const { data } = await axios.post("/production/workbench/checkVideoStateList", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    videoIds: hasGenerateVideoIds.value,
  });
  if (data && data.length) {
    data.forEach((item: { id: number; state: "生成中" | "未生成" | "已完成" | "生成失败"; src?: string; errorReason?: string }) => {
      for (const track of trackList.value) {
        const findData = track.videoList.find((i) => i.id == item.id);
        if (findData) {
          findData.state = item.state;
          findData.src = item?.src ?? "";
          findData.errorReason = item?.errorReason ?? "";
          break;
        }
      }
    });
  }
}
watch(
  () => hasGenerateVideoIds.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      startPoll();
    } else {
      stopPoll();
    }
  },
);

onUnmounted(() => {
  stopPoll();
});
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow-y: auto;
  .referenceImage {
  }
  .modelSelect {
  }
  .generate {
    flex: 1;
    min-height: 0;
    width: 100%;
    gap: 5px;
    .prompt {
      width: 50%;
      height: 100%;
      min-height: 0;
      .videoPrompt {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        :deep(.t-card__body) {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .promptData {
          width: 100%;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          .promptInput {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          }
          .bgmPanel {
            flex-shrink: 0;
            padding: 10px 12px;
            border-radius: 6px;
            background: var(--td-bg-color-secondarycontainer);
            .panelTitle {
              margin-bottom: 6px;
              font-size: 13px;
              font-weight: 600;
              color: var(--td-text-color-primary);
            }
            .panelContent {
              font-size: 13px;
              line-height: 1.6;
              color: var(--td-text-color-secondary);
              white-space: pre-wrap;
            }
          }
          .styleRow {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
            .styleLabel {
              font-size: 13px;
              font-weight: 600;
              color: var(--td-text-color-primary);
            }
            .styleSelect {
              width: 220px;
            }
          }
          .traceActionRow {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
            .traceActionBtn {
              min-width: 92px;
            }
          }
          .tracePanel {
            flex-shrink: 0;
            padding: 10px 12px;
            border-radius: 6px;
            background: var(--td-bg-color-secondarycontainer);
            .panelTitle {
              margin-bottom: 6px;
              font-size: 13px;
              font-weight: 600;
              color: var(--td-text-color-primary);
            }
            .panelContent {
              font-size: 13px;
              line-height: 1.6;
              color: var(--td-text-color-secondary);
              white-space: pre-wrap;
            }
            .panelMeta {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .metaRow {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .metaLabel {
              font-size: 12px;
              font-weight: 600;
              color: var(--td-text-color-placeholder);
            }
            .metaValue {
              font-size: 13px;
              line-height: 1.6;
              color: var(--td-text-color-secondary);
              white-space: pre-wrap;
            }
          }
        }
      }
    }
    .video {
      width: 50%;
      height: 100%;
      min-height: 0;
    }
  }
  .track {
  }
}

.generatePreview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  .previewSection {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .previewTitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary);
  }
  .previewBlock {
    max-height: 180px;
    padding: 10px 12px;
    overflow: auto;
    white-space: pre-wrap;
    line-height: 1.6;
    border-radius: 6px;
    background: var(--td-bg-color-secondarycontainer);
    color: var(--td-text-color-secondary);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    background: rgba(var(--td-brand-color-rgb, 0, 82, 217), 0.1);
    color: var(--td-brand-color);
    font-size: 12px;
    line-height: 1.2;
  }
  .previewFooter {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
}

.traceDialogBody {
  min-width: 420px;
  min-height: 220px;
  max-width: min(90vw, 1100px);
  max-height: 72vh;
  padding: 12px;
  overflow: auto;
  resize: both;
  border-radius: 12px;
  border: 1px solid var(--td-border-level-1-color);
  background: var(--td-bg-color-container);
}

.traceDialogContent {
  font-size: 13px;
  line-height: 1.7;
  color: var(--td-text-color-secondary);
  white-space: pre-wrap;
}

.traceMeta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.traceDialog :deep(.t-dialog) {
  max-width: min(90vw, 1100px);
}
</style>
