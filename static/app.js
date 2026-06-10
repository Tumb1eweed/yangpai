const state = {
  subject: "人物",
  mode: "text",
  history: [],
  polling: null,
  progressTimer: null,
  progress: 0,
};

const form = document.querySelector("#generate-form");
const promptField = document.querySelector("#prompt-field");
const promptInput = document.querySelector("#prompt");
const directSettings = document.querySelectorAll(".direct-setting");
const count = document.querySelector("#count");
const submit = document.querySelector("#submit");
const statusEl = document.querySelector("#status");
const resultImage = document.querySelector("#result-image");
const emptyPreview = document.querySelector("#empty-preview");
const download = document.querySelector("#download");
const thumbs = document.querySelector("#thumbs");
const historyList = document.querySelector("#history-list");
const health = document.querySelector("#health");
const comfyUrl = document.querySelector("#comfy-url");
const heroImage = document.querySelector("#hero-image");
const referenceGrid = document.querySelector("#reference-grid");
const progressOverlay = document.querySelector("#progress-overlay");
const progressRing = document.querySelector("#progress-ring");
const progressPercent = document.querySelector("#progress-percent");
const progressTitle = document.querySelector("#progress-title");
const progressDetail = document.querySelector("#progress-detail");

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function setProgress(value, title, detail) {
  state.progress = Math.max(0, Math.min(100, Math.round(value)));
  progressRing.style.setProperty("--progress", `${state.progress}%`);
  progressRing.setAttribute("aria-valuenow", String(state.progress));
  progressPercent.textContent = `${state.progress}%`;
  if (title) progressTitle.textContent = title;
  if (detail) progressDetail.textContent = detail;
}

function showProgress(title, detail) {
  clearInterval(state.progressTimer);
  progressOverlay.classList.remove("hidden");
  setProgress(8, title, detail);
  state.progressTimer = setInterval(() => {
    if (state.progress < 72) setProgress(state.progress + 3, "生成中", "正在绘制岩画肌理与画面细节");
    else if (state.progress < 92) setProgress(state.progress + 1, "生成中", "正在等待 ComfyUI 输出结果");
  }, 1200);
}

function hideProgress() {
  clearInterval(state.progressTimer);
  state.progressTimer = null;
  progressOverlay.classList.add("hidden");
}

function updateModeView() {
  const directMode = state.mode === "direct";
  promptField.classList.toggle("hidden", directMode);
  directSettings.forEach((item) => item.classList.toggle("hidden", !directMode));
}

function selectedValue(group) {
  return state[group];
}

function payload() {
  return {
    prompt: promptInput.value.trim(),
    mode: state.mode,
    subject: selectedValue("subject"),
    width: document.querySelector("#width").value,
    height: document.querySelector("#height").value,
    steps: document.querySelector("#steps").value,
    seed: document.querySelector("#seed").value || "random",
  };
}

function renderHistory() {
  const items = state.history.slice(0, 4);
  if (!items.length) {
    historyList.innerHTML = '<div class="empty-state">生成完成后，作品会按时间倒序显示在这里</div>';
    return;
  }
  historyList.innerHTML = items.map(cardTemplate).join("");
}

function renderResultThumbs(activeImage) {
  const items = state.history.slice(0, 4);
  if (!items.length) {
    thumbs.innerHTML = '<div class="empty-state">暂无生成结果</div>';
    return;
  }
  thumbs.innerHTML = items.map((item) => `
    <button class="thumb${item.image === activeImage ? " active" : ""}" type="button" data-image="${escapeHtml(item.image)}">
      <img src="${item.image}" alt="${escapeHtml(item.title)}" />
    </button>
  `).join("");
}

function renderReferences(items) {
  if (!referenceGrid) return;
  if (!items.length) {
    referenceGrid.innerHTML = '<div class="empty-state">未找到参考图册图片</div>';
    return;
  }
  referenceGrid.innerHTML = items.map((item) => `
    <article class="sample-item">
      <div class="sample-prompt">
        <span>提示词</span>
        <p>${escapeHtml(item.prompt || item.title)}</p>
      </div>
      <figure>
        <img src="${item.url}" alt="${escapeHtml(item.title)}" />
        <figcaption>${escapeHtml(item.title)}</figcaption>
      </figure>
    </article>
  `).join("");
}

function cardTemplate(item) {
  return `
    <article class="history-card">
      <img src="${item.image}" alt="${escapeHtml(item.title)}" />
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    health.classList.toggle("ok", Boolean(data.ok));
    health.classList.toggle("error", !data.ok);
    health.querySelector("b").textContent = data.ok ? "本地服务正常" : "服务异常";
    comfyUrl.textContent = data.comfyui_url.replace(/^https?:\/\//, "");
  } catch {
    health.classList.remove("ok");
    health.classList.add("error");
    health.querySelector("b").textContent = "服务异常";
  }
}

async function loadReferences() {
  try {
    const response = await fetch("/api/references");
    const data = await response.json();
    if (data.hero) {
      heroImage.src = data.hero.url;
    }
    if (referenceGrid) renderReferences(data.references || []);
  } catch {
    if (referenceGrid) renderReferences([]);
  }
}

async function generate(event) {
  event.preventDefault();
  const body = payload();
  if (state.mode === "text" && !body.prompt) {
    promptInput.focus();
    setStatus("请输入画面描述", "warn");
    return;
  }

  clearInterval(state.polling);
  showProgress("提交中", "正在提交到 ComfyUI");
  submit.disabled = true;
  download.classList.add("disabled");
  download.removeAttribute("href");
  setStatus("提交到 ComfyUI 中");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "生成请求失败");
    setProgress(18, "排队中", `已进入队列，种子 ${data.meta.seed}`);
    setStatus(`已进入队列，种子 ${data.meta.seed}`);
    pollResult(data.prompt_id, data.meta.prompt, data.meta);
  } catch (error) {
    hideProgress();
    setStatus(error.message, "error");
    submit.disabled = false;
  }
}

function pollResult(promptId, title, meta) {
  let attempts = 0;
  state.polling = setInterval(async () => {
    attempts += 1;
    setStatus(`生成中 ${Math.min(state.progress, 95)}%`);
    if (attempts === 1) setProgress(Math.max(state.progress, 28), "生成中", "ComfyUI 正在执行工作流");
    try {
      const response = await fetch(`/api/status/${encodeURIComponent(promptId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "读取结果失败");
      if (data.done && data.images.length) {
        clearInterval(state.polling);
        setProgress(100, "生成完成", "正在载入生成图片");
        const image = data.images[0].url;
        resultImage.src = image;
        resultImage.classList.remove("hidden");
        emptyPreview.classList.add("hidden");
        download.href = image;
        download.classList.remove("disabled");
        submit.disabled = false;
        setStatus("生成完成");
        setTimeout(hideProgress, 450);
        const completedItem = {
          title: title || "杨派岩画作品",
          image,
          meta: `${meta.width}x${meta.height} · seed ${meta.seed}`,
        };
        state.history = [completedItem, ...state.history.filter((item) => item.image !== image)];
        renderHistory();
        renderResultThumbs(image);
      }
      if (attempts > 180) {
        throw new Error("生成超时，请稍后查看 ComfyUI 输出目录");
      }
    } catch (error) {
      clearInterval(state.polling);
      hideProgress();
      submit.disabled = false;
      setStatus(error.message, "error");
    }
  }, 2000);
}

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".chips").dataset.group;
    state[group] = button.dataset.value;
    button.closest(".chips").querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    updateModeView();
    if (state.mode === "direct") setStatus("将使用预设提示词直接生成");
    else setStatus("等待输入画面描述");
  });
});

promptInput.addEventListener("input", () => {
  count.textContent = promptInput.value.length;
});

document.querySelector("#random-seed").addEventListener("click", () => {
  document.querySelector("#seed").value = Math.floor(Math.random() * 10_000_000);
});

document.querySelector("#clear-history").addEventListener("click", () => {
  renderHistory();
});

thumbs.addEventListener("click", (event) => {
  const button = event.target.closest(".thumb");
  if (!button) return;
  const image = button.dataset.image;
  resultImage.src = image;
  resultImage.classList.remove("hidden");
  emptyPreview.classList.add("hidden");
  download.href = image;
  download.classList.remove("disabled");
  thumbs.querySelectorAll(".thumb").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  setStatus("已切换生成结果");
});

form.addEventListener("submit", generate);

renderHistory();
renderResultThumbs();
count.textContent = promptInput.value.length;
updateModeView();
checkHealth();
loadReferences();
