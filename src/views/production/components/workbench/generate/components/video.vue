<template>
  <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.videoMenu')" header-bordered style="height: 100%">
    <template #actions>
      <t-button size="small" :loading="generating" @click="emit('generate')">{{ $t("workbench.generate.generate") }}</t-button>
    </template>
    <div class="history">
      <div class="titleBox f ac">
        <i-time />
        <span class="title">{{ $t("workbench.generate.history") }}（{{ currentTrack?.videoList.length }}）</span>
      </div>
      <div class="historyItemBox">
        <div
          class="historyCard"
          v-for="v in currentTrack?.videoList"
          :key="v.id">
          <div
            class="historyItem"
            :class="{ active: v.id === selectVideoId, generating: v.state === '生成中', failed: v.state === '生成失败' }"
            @click="previewVideo(v)">
            <template v-if="videoCoverMap[v.src]">
              <img :src="videoCoverMap[v.src]" class="videoCover" />
            </template>
            <template v-else-if="v.state !== '生成中' && v.src">
              <video
                :key="v.src"
                :src="v.src"
                preload="metadata"
                muted
                @loadedmetadata="
                  (e: Event) => {
                    (e.target as HTMLVideoElement).currentTime = 0.5;
                  }
                "
                @seeked="
                  (e: Event) => {
                    const el = e.target as HTMLVideoElement;
                    captureVideoCover(v.src);
                    el.style.display = 'none';
                  }
                " />
            </template>
            <div v-if="v.state === '生成中'" class="loadingOverlay c fc">
              <t-loading size="24px" />
              <span class="loadingText">{{ $t("workbench.generate.generating") }}</span>
            </div>
            <t-tooltip v-if="v.state == '生成失败'" placement="top" :content="v?.errorReason! ?? ''" theme="light">
              <t-tag class="stateTag" theme="danger" size="small">
                {{ $t("workbench.generate.generateFailed") }}
              </t-tag>
            </t-tooltip>
            <div v-if="v.state !== '生成中'" class="selectBtn" @click.stop="selectVideo(v)">
              <i-check size="16" />
            </div>
            <div class="delBtn" @click.stop="handleDeleteVideo(v)">
              <i-delete size="16" />
            </div>
            <div v-if="v.state !== '生成中' && v.state !== '生成失败'" class="download" @click.stop="downloadVideo(v)">
              <i-to-bottom size="16" />
            </div>
            <div v-if="v.state !== '生成中' && v.state !== '生成失败'" class="playBtn" @click.stop="openVideoPlayer(v)">
              <i-play size="16" />
            </div>
          </div>
          <t-button
            v-if="v.state === '生成失败'"
            class="recoverBtn"
            size="small"
            theme="primary"
            block
            :loading="recoveringMap[v.id]"
            @click.stop="openRecoverDialog(v)">
            <template #icon><i-refresh size="14" /></template>
            重新获取链接
          </t-button>
        </div>
      </div>
    </div>
  </t-card>

  <!-- 失败视频任务ID补填弹窗 -->
  <t-dialog v-model:visible="recoverDialogVisible" header="重新获取视频链接" width="420px" placement="center" :footer="false">
    <div class="recoverDialog">
      <div class="recoverTip">可手动填写任务 ID；留空则使用系统已记录的任务 ID。</div>
      <div class="recoverField">
        <div class="recoverLabel">任务 ID</div>
        <t-input v-model="recoverTaskId" clearable placeholder="请输入任务 ID（可选）" @enter="submitRecoverVideoLink" />
      </div>
      <div class="recoverFooter">
        <t-button variant="outline" @click="recoverDialogVisible = false">取消</t-button>
        <t-button theme="primary" :loading="recoverDialogLoading" @click="submitRecoverVideoLink">重新获取链接</t-button>
      </div>
    </div>
  </t-dialog>

  <!-- 视频播放弹窗 -->
  <t-dialog
    v-model:visible="videoPlayerVisible"
    :header="$t('workbench.generate.previewVideo')"
    :footer="false"
    width="800px"
    destroy-on-close
    @close="handlePlayerClose">
    <div class="videoPlayerBox">
      <video v-if="playingVideoSrc" :src="playingVideoSrc" controls autoplay class="videoPlayer" />
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const props = defineProps<{
  activeTrackIndex: number;
  generating?: boolean;
}>();
const currentTrack = defineModel<TrackItem>("currentTrack", {
  default: () => {},
});
const emit = defineEmits<{
  generate: [];
  refresh: [];
}>();

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;

const selectVideoId = ref();
const videoCoverMap = ref<Record<string, string>>({});
const videoPlayerVisible = ref(false);
const playingVideoSrc = ref<string>();
const recoveringMap = ref<Record<number, boolean>>({});
const recoverDialogVisible = ref(false);
const recoverTargetVideo = ref<HistoryVideoItem>();
const recoverTaskId = ref("");
const recoverDialogLoading = computed(() => {
  const videoId = recoverTargetVideo.value?.id;
  return videoId ? !!recoveringMap.value[videoId] : false;
});

/** 选中历史视频并同步到后端 */
async function selectVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
  try {
    await axios.post("/production/workbench/selectVideo", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
      videoId: v.id,
      trackId: currentTrack?.value.id,
    });
    window.$message.success($t("workbench.generate.selectVideoSuccess"));
    emit("refresh");
  } catch {
    window.$message.error($t("workbench.generate.selectVideoFailed"));
  }
}

/** 删除某条历史视频 */
function handleDeleteVideo(value: HistoryVideoItem) {
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.del"),
    body: $t("workbench.generate.delVideo"),
    onConfirm: () => {
      axios.post("/production/workbench/delVideo", { id: value.id }).then(() => {
        window.$message.success($t("workbench.generate.delSuccess"));
        emit("refresh");
        dlg.destroy();
        currentTrack.value.videoList.filter((item) => item.id == value.id);
      });
    },
    onCancel: () => dlg.destroy(),
  });
}

/** 单个视频下载 */
async function downloadVideo(value: HistoryVideoItem) {
  const response = await fetch(value.src);
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "视频.mp4";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/** 打开手动补填任务ID弹窗 */
function openRecoverDialog(value: HistoryVideoItem) {
  recoverTargetVideo.value = value;
  recoverTaskId.value = "";
  recoverDialogVisible.value = true;
}

/** 提交失败视频恢复请求 */
function submitRecoverVideoLink() {
  if (!recoverTargetVideo.value || recoverDialogLoading.value) return;
  recoverVideoLink(recoverTargetVideo.value, recoverTaskId.value);
}

/** 重新查询失败视频的远端任务结果，并补回本地视频地址 */
async function recoverVideoLink(value: HistoryVideoItem, taskId?: string) {
  recoveringMap.value[value.id] = true;
  try {
    const trimmedTaskId = taskId?.trim();
    const { data } = await axios.post("/production/workbench/recoverVideoLink", {
      videoId: value.id,
      taskId: trimmedTaskId || undefined,
    });
    if (data?.state === "已完成") {
      value.state = "已完成";
      value.src = data.src ?? "";
      value.errorReason = "";
      if (value.src) captureVideoCover(value.src);
      window.$message.success("视频链接已重新获取");
      recoverDialogVisible.value = false;
      emit("refresh");
      return;
    }
    window.$message.warning(data?.message ?? "远端任务仍在生成中，请稍后再试");
  } catch (e: any) {
    value.errorReason = e?.message ?? "重新获取视频链接失败";
    window.$message.error(value.errorReason);
  } finally {
    recoveringMap.value[value.id] = false;
  }
}

/** 捕获视频封面（绘制 0.5s 帧到 canvas） */
function captureVideoCover(src: string) {
  if (!src || videoCoverMap.value[src]) return;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.src = src;
  video.addEventListener(
    "seeked",
    () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          videoCoverMap.value[src] = canvas.toDataURL("image/jpeg", 0.7);
        }
      } catch {}
      video.src = "";
    },
    { once: true },
  );
  video.addEventListener(
    "loadeddata",
    () => {
      video.currentTime = 0.5;
    },
    { once: true },
  );
  video.addEventListener(
    "error",
    () => {
      video.src = "";
    },
    { once: true },
  );
  video.load();
}

/** 打开视频播放弹窗 */
function openVideoPlayer(v: HistoryVideoItem) {
  if (!v.src) return;
  playingVideoSrc.value = v.src;
  videoPlayerVisible.value = true;
}

/** 关闭播放弹窗时清空 src，停止播放 */
function handlePlayerClose() {
  playingVideoSrc.value = undefined;
}

/** 点击历史视频条目进行预览 */
function previewVideo(v: HistoryVideoItem) {
  if (v.state === "生成中" || v.state === "生成失败") return;
}
</script>

<style lang="scss" scoped>
.history {
  height: 100%;
  .titleBox {
    gap: 6px;
    margin-bottom: 8px;
    .title {
      font-size: 13px;
      color: var(--td-text-color-secondary);
    }
  }
  .historyItemBox {
    display: grid;
    grid-template-columns: repeat(auto-fill, 130px);
    gap: 10px;
    height: 100%;
    align-items: start;
    .historyCard {
      width: 130px;
    }
    .historyItem {
      position: relative;
      width: 130px;
      height: 90px;
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      background: var(--td-bg-color-secondarycontainer);
      &.active {
        border-color: var(--td-brand-color);
      }
      &.generating {
        cursor: default;
      }
      &.failed {
        cursor: default;
      }
      .videoCover {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .loadingOverlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        gap: 4px;
        .loadingText {
          font-size: 11px;
          color: #fff;
        }
      }
      .stateTag {
        position: absolute;
        bottom: 4px;
        left: 4px;
      }
      .selectBtn,
      .delBtn,
      .download,
      .playBtn {
        position: absolute;
        display: none;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        cursor: pointer;
      }
      .selectBtn {
        bottom: 4px;
        right: 4px;
      }
      .delBtn {
        top: 4px;
        right: 4px;
      }
      .download {
        bottom: 4px;
        left: 4px;
      }
      .playBtn {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
      }
      &:hover {
        .selectBtn,
        .delBtn,
        .download,
        .playBtn {
          display: flex;
        }
      }
    }
    .recoverBtn {
      width: 100%;
      height: 28px;
      margin-top: 6px;
      color: #fff;
      background: var(--td-brand-color);
      border-color: var(--td-brand-color);
    }
  }
}

.recoverDialog {
  .recoverTip {
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }
  .recoverField {
    margin-bottom: 12px;
  }
  .recoverLabel {
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--td-text-color-primary);
  }
  .recoverFooter {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
  }
}

.videoPlayerBox {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  .videoPlayer {
    width: 100%;
    max-height: 450px;
    outline: none;
  }
}
:deep(.t-card__body) {
  overflow: auto;
  height: calc(100% - 48px);
}
</style>
