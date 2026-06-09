<template>
  <div class="node-shell" :class="[selected ? 'selected' : '', dialogMode ? 'dialog-mode' : '']">
    <div class="node-head">
      <div class="node-head-left">
        <span class="node-title">{{ title }}</span>
        <span v-if="badge" class="node-badge">{{ badge }}</span>
      </div>
      <div class="node-head-right">
        <span v-if="statusLabel" class="node-run-status" :class="statusClass">{{ statusLabel }}</span>
        <t-button v-if="!dialogMode" size="small" variant="text" theme="default" @click.stop="$emit('expand')">放大</t-button>
        <slot name="headActions" />
        <t-button v-if="!dialogMode" size="small" variant="text" theme="danger" @click.stop="$emit('delete')">删除</t-button>
      </div>
    </div>
    <div class="node-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    badge?: string;
    status?: string;
    dialogMode?: boolean;
    selected?: boolean;
  }>(),
  {
    badge: "",
    status: "",
    dialogMode: false,
    selected: false,
  },
);

defineEmits<{
  expand: [];
  delete: [];
}>();

const statusLabel = computed(() => {
  if (!props.status || props.status === "idle") return "";
  const map: Record<string, string> = {
    queued: "Queued",
    running: "Running",
    success: "Done",
    error: "Error",
    stopped: "Stopped",
  };
  return map[props.status] || props.status;
});

const statusClass = computed(() => {
  if (props.status === "success") return "done";
  if (props.status === "error") return "failed";
  return props.status || "";
});
</script>

<style scoped lang="scss">
.node-shell {
  width: 100%;
  height: 100%;
  border: 1px solid var(--v2-border, #d1d5db);
  border-radius: 22px;
  background: var(--v2-surface-soft, rgba(255, 255, 255, 0.78));
  box-shadow: var(--v2-shadow, 0 12px 28px rgba(15, 23, 42, 0.08));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.node-shell.selected {
  outline: 2px solid #111827;
  outline-offset: 2px;
}

.node-shell.dialog-mode {
  min-height: 360px;
}

.node-head {
  height: 42px;
  flex: 0 0 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(209, 213, 219, 0.92);
  background: rgba(255, 255, 255, 0.72);
}

.node-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.node-head-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.node-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--v2-muted, #6b7280);
}

.node-badge {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(229, 231, 235, 0.88);
  color: #4b5563;
  font-size: 11px;
  font-weight: 600;
}

.node-run-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.node-run-status.queued {
  background: #e2e8f0;
  color: #475569;
}

.node-run-status.running {
  background: #dbeafe;
  color: #1d4ed8;
}

.node-run-status.done {
  background: #dcfce7;
  color: #166534;
}

.node-run-status.failed {
  background: #fee2e2;
  color: #b91c1c;
}

.node-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: auto;
  background: transparent;
}
</style>
