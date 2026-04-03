<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

type MessageRole = "user" | "assistant" | "error";

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
};

type DesktopSettings = {
  MODEL_PROVIDER?: string;
  ANTHROPIC_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_MODEL?: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  API_TIMEOUT_MS?: string;
};

const isBusy = ref(false);
const sessionId = ref("");
const workspacePath = ref("");
const inputText = ref("");
const showSettings = ref(true);
const noticeText = ref("");
const noticeType = ref<"ok" | "warn">("ok");
const messages = ref<ChatMessage[]>([]);
const currentAssistantId = ref("");

// 三种模式：云端 / Ollama / 本地 OpenAI 兼容
const runMode = ref<"cloud" | "ollama" | "local-openai">("cloud");
const apiKey = ref("");
const selectedModelId = ref("");
const selectedModelProvider = ref<"openrouter" | "anthropic" | "">("");

// Ollama 配置
const ollamaBaseUrl = ref("http://127.0.0.1:11434");
const ollamaModel = ref("");

// 本地 OpenAI 兼容配置
const localOpenaiBaseUrl = ref("http://192.168.6.216:8889");
const localOpenaiModel = ref("qwen3.5-35b");
const localOpenaiApiKey = ref("");

const cloudModels = ref<Array<{ id: string; name: string; provider: string }>>([]);
const loadingModels = ref(false);

const settings = reactive<Required<DesktopSettings>>({
  MODEL_PROVIDER: "anthropic",
  ANTHROPIC_BASE_URL: "",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_AUTH_TOKEN: "",
  ANTHROPIC_MODEL: "",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "",
  OLLAMA_BASE_URL: "",
  OLLAMA_MODEL: "",
  API_TIMEOUT_MS: "3000000",
});

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roleLabel(role: MessageRole) {
  if (role === "user") return "你";
  if (role === "assistant") return "助手";
  return "错误";
}

function addMessage(role: MessageRole, text: string) {
  const item: ChatMessage = { id: makeId(), role, text };
  messages.value.push(item);
  return item.id;
}

function showNotice(text: string, type: "ok" | "warn" = "ok") {
  noticeText.value = text;
  noticeType.value = type;
}

function inferProviderByModel(model: string) {
  if ((model || "").startsWith("openrouter/")) return "openrouter";
  return "anthropic";
}

function inferProviderByKey(key: string) {
  const k = (key || "").trim();
  if (k.startsWith("sk-or-")) return "openrouter";
  return "";
}

function cloudBaseUrlByProvider(provider: "openrouter" | "anthropic") {
  return provider === "openrouter" ? "https://openrouter.ai/api" : "https://api.anthropic.com";
}

function applySettings(data?: DesktopSettings) {
  if (!data) return;
  settings.MODEL_PROVIDER = data.MODEL_PROVIDER || "anthropic";
  settings.ANTHROPIC_BASE_URL = data.ANTHROPIC_BASE_URL ?? "";
  settings.ANTHROPIC_API_KEY = data.ANTHROPIC_API_KEY ?? "";
  settings.ANTHROPIC_AUTH_TOKEN = data.ANTHROPIC_AUTH_TOKEN ?? "";
  settings.ANTHROPIC_MODEL = data.ANTHROPIC_MODEL ?? "";
  settings.ANTHROPIC_DEFAULT_SONNET_MODEL = data.ANTHROPIC_DEFAULT_SONNET_MODEL ?? "";
  settings.ANTHROPIC_DEFAULT_HAIKU_MODEL = data.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? "";
  settings.ANTHROPIC_DEFAULT_OPUS_MODEL = data.ANTHROPIC_DEFAULT_OPUS_MODEL ?? "";
  settings.OLLAMA_BASE_URL = data.OLLAMA_BASE_URL ?? "";
  settings.OLLAMA_MODEL = data.OLLAMA_MODEL ?? "";
  settings.API_TIMEOUT_MS = data.API_TIMEOUT_MS ?? "3000000";

  // 根据配置恢复模式
  if (settings.MODEL_PROVIDER === "ollama") {
    runMode.value = "ollama";
  } else if (settings.MODEL_PROVIDER === "local-openai") {
    runMode.value = "local-openai";
  } else {
    runMode.value = "cloud";
  }

  const cloudKey = settings.ANTHROPIC_API_KEY || settings.ANTHROPIC_AUTH_TOKEN || "";
  apiKey.value = cloudKey === "ollama-local" ? "" : cloudKey;
  selectedModelId.value = settings.ANTHROPIC_MODEL || "openrouter/auto";
  selectedModelProvider.value = "openrouter";
  ollamaBaseUrl.value = settings.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  ollamaModel.value = settings.OLLAMA_MODEL || "";

  // 从 ANTHROPIC_BASE_URL 恢复本地 OpenAI 配置
  if (settings.MODEL_PROVIDER === "local-openai") {
    localOpenaiBaseUrl.value = settings.ANTHROPIC_BASE_URL || "http://192.168.6.216:8889";
    localOpenaiModel.value = settings.ANTHROPIC_MODEL || "qwen3.5-35b";
    localOpenaiApiKey.value = settings.ANTHROPIC_API_KEY || "";
  }
}

async function sendMessage() {
  if (isBusy.value) return;
  const text = inputText.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputText.value = "";
  currentAssistantId.value = addMessage("assistant", "");
  isBusy.value = true;

  let provider = "anthropic";
  let model = "";

  if (runMode.value === "ollama") {
    provider = "ollama";
    model = ollamaModel.value.trim();
  } else if (runMode.value === "local-openai") {
    provider = "local-openai";
    model = localOpenaiModel.value.trim();
  } else {
    model = settings.ANTHROPIC_MODEL || "";
  }

  const result = await window.desktopApi.sendMessage({
    prompt: text,
    provider,
    model,
  });

  if (!result?.ok) {
    if (result?.sessionId) sessionId.value = result.sessionId;
    messages.value = messages.value.filter((m) => m.id !== currentAssistantId.value);
    if (result?.stopped) {
      addMessage("assistant", "任务已停止。");
    } else {
      addMessage("error", result?.error || "请求失败");
    }
    isBusy.value = false;
    return;
  }

  const target = messages.value.find((m) => m.id === currentAssistantId.value);
  if (result?.sessionId) sessionId.value = result.sessionId;
  if (target && !target.text.trim()) {
    target.text = result.text || "[模型未返回文本]";
  }
  isBusy.value = false;
}

async function stopMessage() {
  const result = await window.desktopApi.stopMessage();
  if (result?.sessionId) sessionId.value = result.sessionId;
  if (!result.ok && result.error) showNotice(result.error, "warn");
}

async function chooseWorkspace() {
  const result = await window.desktopApi.chooseWorkspace();
  if (!result.ok) {
    if (result.error) showNotice(result.error, "warn");
    return;
  }
  workspacePath.value = result.path || "";
  showNotice("项目目录已切换。", "ok");
}

async function createSession() {
  if (isBusy.value) return;
  const result = await window.desktopApi.newSession();
  sessionId.value = result.sessionId;
  addMessage("assistant", `新会话已创建：${result.sessionId}`);
}

function clearMessages() {
  messages.value = [];
}

async function saveSettings() {
  if (isBusy.value) return;

  // Ollama 模式
  if (runMode.value === "ollama") {
    if (!ollamaModel.value.trim()) {
      showNotice("请先填写 Ollama 模型", "warn");
      return;
    }

    const localBase = ollamaBaseUrl.value.trim() || "http://127.0.0.1:11434";
    const payload: Record<string, string> = {
      MODEL_PROVIDER: "ollama",
      OLLAMA_BASE_URL: localBase,
      OLLAMA_MODEL: ollamaModel.value.trim(),
      API_TIMEOUT_MS: settings.API_TIMEOUT_MS || "3000000",
      DISABLE_TELEMETRY: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    };

    const saved = await window.desktopApi.saveSettings(payload);
    applySettings(saved);
    showNotice("Ollama 配置已保存。", "ok");
    return;
  }

  // 本地 OpenAI 兼容模式
  if (runMode.value === "local-openai") {
    if (!localOpenaiModel.value.trim()) {
      showNotice("请先填写模型 ID", "warn");
      return;
    }

    const payload: Record<string, string> = {
      MODEL_PROVIDER: "local-openai",
      ANTHROPIC_BASE_URL: localOpenaiBaseUrl.value.trim() || "http://192.168.6.216:8889",
      ANTHROPIC_API_KEY: localOpenaiApiKey.value.trim() || "local",
      ANTHROPIC_AUTH_TOKEN: localOpenaiApiKey.value.trim() || "local",
      ANTHROPIC_MODEL: localOpenaiModel.value.trim(),
      ANTHROPIC_DEFAULT_SONNET_MODEL: "",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "",
      API_TIMEOUT_MS: settings.API_TIMEOUT_MS || "3000000",
      DISABLE_TELEMETRY: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    };

    const saved = await window.desktopApi.saveSettings(payload);
    applySettings(saved);
    showNotice("本地 OpenAI 配置已保存。", "ok");
    return;
  }

  // 云端模式
  if (!apiKey.value.trim()) {
    showNotice("请先填写 API Key", "warn");
    return;
  }
  const cloudModel = "openrouter/auto";
  const provider: "openrouter" = "openrouter";
  const cloudBaseUrl = cloudBaseUrlByProvider(provider);
  selectedModelId.value = cloudModel;
  selectedModelProvider.value = "openrouter";

  const payload: Record<string, string> = {
    MODEL_PROVIDER: "anthropic",
    ANTHROPIC_BASE_URL: cloudBaseUrl,
    ANTHROPIC_API_KEY: apiKey.value.trim(),
    ANTHROPIC_AUTH_TOKEN: apiKey.value.trim(),
    ANTHROPIC_MODEL: cloudModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: "",
    ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
    ANTHROPIC_DEFAULT_OPUS_MODEL: "",
    API_TIMEOUT_MS: settings.API_TIMEOUT_MS || "3000000",
    DISABLE_TELEMETRY: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  };

  const saved = await window.desktopApi.saveSettings(payload);
  applySettings(saved);
  showNotice("已保存。云端模型已固定为 openrouter/auto。", "ok");
}

async function clearModelFields() {
  if (isBusy.value) return;
  const saved = await window.desktopApi.clearModelSettings();
  applySettings(saved);
  selectedModelId.value = "";
  selectedModelProvider.value = "";
  showNotice("模型字段已清空。", "warn");
}

async function loadCloudModels(source: "openrouter" | "anthropic") {
  loadingModels.value = true;
  try {
    const result = await window.desktopApi.listModels({ source, apiKey: apiKey.value });
    if (!result.ok) {
      showNotice(result.error || "模型列表加载失败", "warn");
      return;
    }
    cloudModels.value = result.models || [];
    showNotice(`已加载 ${cloudModels.value.length} 个${source === "openrouter" ? " OpenRouter" : " Anthropic"}模型`, "ok");
  } finally {
    loadingModels.value = false;
  }
}

onMounted(async () => {
  const appState = await window.desktopApi.getState();
  sessionId.value = appState.sessionId || "";
  workspacePath.value = appState.workspacePath || "";
  isBusy.value = Boolean(appState.busy);
  applySettings(appState.settings || {});

  addMessage("assistant", "先完成模型配置，再打开项目目录，直接下达编码任务。");

  window.desktopApi.onDelta((payload) => {
    if (!payload?.text) return;
    const target = messages.value.find((m) => m.id === currentAssistantId.value);
    if (target) target.text += payload.text;
  });

  window.desktopApi.onStatus((payload) => {
    if (payload && typeof payload.busy === "boolean") {
      isBusy.value = payload.busy;
    }
  });
});
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="badge">SELF-REPAIR</div>
      <h1>用 Claude 修 Claude</h1>
      <p>只需配置 API Key 与模型，随后直接在项目里发起编码任务。</p>
      <div class="path-chip">当前项目：{{ workspacePath || "未选择" }}</div>
    </header>

    <section class="flowbar">
      <span>1. 选择模式（云端 / 本地）</span>
      <span>2. 配置模型</span>
      <span>3. 打开项目并执行编码任务</span>
    </section>

    <main class="workbench" :class="{ single: !showSettings }">
      <section class="chat card">
        <div class="toolbar">
          <div class="session">会话：{{ sessionId || "未创建" }}</div>
          <div class="actions">
            <button @click="chooseWorkspace">打开项目</button>
            <button @click="createSession" :disabled="isBusy">新会话</button>
            <button class="danger" @click="stopMessage" :disabled="!isBusy">停止</button>
            <button @click="showSettings = !showSettings">{{ showSettings ? "隐藏设置" : "显示设置" }}</button>
          </div>
        </div>

        <div class="messages">
          <article v-for="m in messages" :key="m.id" class="msg" :class="m.role">
            <label>{{ roleLabel(m.role) }}</label>
            <pre>{{ m.text }}</pre>
          </article>
        </div>

        <div class="composer">
          <textarea
            v-model="inputText"
            :disabled="isBusy"
            placeholder="输入编码任务（Enter 发送，Shift+Enter 换行）"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="composer-foot">
            <span>{{ isBusy ? "执行中..." : "就绪" }}</span>
            <div>
              <button @click="clearMessages" :disabled="isBusy">清空</button>
              <button class="primary" @click="sendMessage" :disabled="isBusy">发送任务</button>
            </div>
          </div>
        </div>
      </section>

      <aside v-if="showSettings" class="settings card">
        <h2>快速配置</h2>

        <label class="field">
          <span>运行模式</span>
          <select v-model="runMode">
            <option value="cloud">云端（OpenRouter / Anthropic）</option>
            <option value="local-openai">本地 OpenAI 兼容</option>
            <option value="ollama">Ollama（本地）</option>
          </select>
        </label>

        <!-- 云端模式 -->
        <template v-if="runMode === 'cloud'">
          <label class="field">
            <span>API Key</span>
            <input v-model="apiKey" type="password" placeholder="输入你的 API Key" />
          </label>

          <label class="field">
            <span>云端模型（固定）</span>
            <input value="openrouter/auto" readonly />
          </label>
        </template>

        <!-- 本地 OpenAI 兼容模式 -->
        <template v-if="runMode === 'local-openai'">
          <label class="field">
            <span>Base URL</span>
            <input v-model="localOpenaiBaseUrl" placeholder="http://192.168.6.216:8889" />
          </label>
          <label class="field">
            <span>Model ID</span>
            <input v-model="localOpenaiModel" placeholder="例如 qwen3.5-35b" />
          </label>
          <label class="field">
            <span>API Key（可选）</span>
            <input v-model="localOpenaiApiKey" type="password" placeholder="输入 API Key（如果没有则留空）" />
          </label>
        </template>

        <!-- Ollama 模式 -->
        <template v-if="runMode === 'ollama'">
          <label class="field">
            <span>Ollama 地址</span>
            <input v-model="ollamaBaseUrl" placeholder="http://127.0.0.1:11434" />
          </label>
          <label class="field">
            <span>Ollama 模型</span>
            <input v-model="ollamaModel" placeholder="例如 qwen3:4b" />
          </label>
        </template>

        <div class="setting-actions">
          <button @click="clearModelFields" :disabled="isBusy">清空模型</button>
          <button class="primary" @click="saveSettings" :disabled="isBusy">保存并启用</button>
        </div>

        <p class="notice" :class="noticeType">{{ noticeText }}</p>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.page {
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  border-radius: 18px;
  border: 1px solid rgba(255, 175, 121, 0.2);
  background:
    radial-gradient(80% 120% at 0% 100%, rgba(169, 65, 31, 0.26), transparent 56%),
    radial-gradient(56% 110% at 88% 0%, rgba(112, 42, 24, 0.22), transparent 60%),
    linear-gradient(145deg, rgba(24, 14, 18, 0.95), rgba(14, 10, 16, 0.92));
  padding: 24px;
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #ffd6ba;
  border: 1px solid rgba(255, 152, 96, 0.35);
  background: rgba(118, 56, 33, 0.35);
}

.hero h1 {
  margin: 12px 0 8px;
  font-size: clamp(36px, 4.2vw, 58px);
  line-height: 1.08;
  color: #fff7ef;
}

.hero p {
  margin: 0;
  color: #cbb8aa;
  line-height: 1.6;
}

.path-chip {
  margin-top: 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 167, 112, 0.2);
  background: rgba(26, 18, 22, 0.56);
  color: #d8c1b2;
  font-size: 12px;
  padding: 9px 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flowbar {
  border-radius: 12px;
  border: 1px solid rgba(255, 165, 106, 0.18);
  background: rgba(24, 17, 23, 0.8);
  color: #d1b8a7;
  font-size: 13px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.workbench {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 12px;
}

.workbench.single {
  grid-template-columns: 1fr;
}

.card {
  border-radius: 14px;
  border: 1px solid rgba(255, 162, 97, 0.18);
  background: rgba(20, 14, 19, 0.78);
  backdrop-filter: blur(8px);
  min-height: 0;
}

.chat {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.session {
  color: #cfb8a9;
  font-size: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg {
  border-radius: 10px;
  border: 1px solid rgba(255, 165, 106, 0.18);
  padding: 8px 10px;
}

.msg.user {
  background: rgba(90, 47, 31, 0.28);
}

.msg.assistant {
  background: rgba(54, 30, 35, 0.34);
}

.msg.error {
  background: rgba(102, 36, 48, 0.36);
}

.msg label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #d2b4a2;
}

.msg pre {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #f4e6dc;
  font-family: inherit;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.composer textarea {
  width: 100%;
  min-height: 90px;
  max-height: 220px;
  resize: vertical;
}

.composer-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c8b0a2;
}

.composer-foot > div {
  display: flex;
  gap: 8px;
}

.settings {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.settings h2 {
  margin: 0;
  font-size: 18px;
  color: #fdebe0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  font-size: 12px;
  color: #cfb8aa;
}

.setting-actions,
.model-loader {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.notice {
  margin: 0;
  font-size: 12px;
  min-height: 16px;
}

.notice.ok {
  color: #f2c9a4;
}

.notice.warn {
  color: #ffb28a;
}

input,
textarea,
button,
select {
  border: 1px solid rgba(255, 164, 104, 0.2);
  border-radius: 8px;
  background: rgba(18, 12, 17, 0.82);
  color: #f4e7de;
  padding: 8px 10px;
}

button {
  cursor: pointer;
}

button.primary {
  border-color: rgba(255, 157, 89, 0.7);
  background: linear-gradient(130deg, #cf5f35, #e98f47);
  color: #2a130c;
  font-weight: 700;
}

button.danger {
  border-color: rgba(255, 125, 125, 0.7);
  background: rgba(112, 40, 48, 0.45);
}

button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .flowbar {
    grid-template-columns: 1fr;
  }

  .workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page {
    padding: 12px;
  }

  .toolbar,
  .composer-foot {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
