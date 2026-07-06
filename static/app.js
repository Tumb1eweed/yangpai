const state = {
  subject: "人物",
  mode: "direct",
  history: [],
  polling: null,
  progressTimer: null,
  progress: 0,
  heroParticleCleanup: null,
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
const heroImage = document.querySelector("#hero-image");
const heroParticles = document.querySelector("#hero-particles");
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

function initHeroParticles() {
  const host = heroImage?.closest(".hero-art");
  if (!host || !heroImage || !heroParticles) return;
  if (state.heroParticleCleanup) state.heroParticleCleanup();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = heroParticles.getContext("2d", { willReadFrequently: true });
  if (!ctx || reduceMotion) {
    host.classList.remove("is-particle-ready");
    return;
  }

  const alphaThreshold = 95;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mouse = { x: -9999, y: -9999, on: false };
  const particles = [];
  const hoverState = { active: false };
  let width = 0;
  let height = 0;
  let raf = 0;
  let resizeTimer = 0;
  let startedAt = performance.now();

  const isBackground = (r, g, b, a) => {
    if (a < alphaThreshold) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (max + min) / 2 > 232 && max - min < 24;
  };

  const colorFor = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const warmth = r - b;
    if (warmth > 28 && r > 78) {
      const f = Math.max(0.82, Math.min(1.24, light / 126));
      return [Math.min(255, 205 * f) | 0, Math.min(255, 68 * f) | 0, Math.min(255, 38 * f) | 0];
    }
    const f = Math.max(0.76, Math.min(1.22, light / 82));
    return [(88 * f) | 0, (55 * f) | 0, (35 * f) | 0];
  };

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function measure() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    heroParticles.width = Math.round(width * dpr);
    heroParticles.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function sampleImage() {
    particles.length = 0;
    const naturalWidth = heroImage.naturalWidth;
    const naturalHeight = heroImage.naturalHeight;
    if (!naturalWidth || !naturalHeight) return;

    const sampleWidth = Math.min(window.innerWidth < 760 ? 280 : 420, naturalWidth);
    const sampleHeight = Math.max(1, Math.round(sampleWidth * height / width));
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const sourceWidth = Math.min(naturalWidth, width / scale);
    const sourceHeight = Math.min(naturalHeight, height / scale);
    const positionX = 0.66;
    const positionY = 0.24;
    const sourceX = Math.max(0, Math.min(naturalWidth - sourceWidth, (naturalWidth - sourceWidth) * positionX));
    const sourceY = Math.max(0, Math.min(naturalHeight - sourceHeight, (naturalHeight - sourceHeight) * positionY));

    const offscreen = document.createElement("canvas");
    offscreen.width = sampleWidth;
    offscreen.height = sampleHeight;
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    offCtx.drawImage(heroImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sampleWidth, sampleHeight);

    const imageData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let subjectPixels = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      if (!isBackground(imageData[i], imageData[i + 1], imageData[i + 2], imageData[i + 3])) subjectPixels += 1;
    }

    const target = window.innerWidth < 760 ? 6200 : 16000;
    const step = Math.max(2, Math.round(Math.sqrt(Math.max(1, subjectPixels) / target)));
    for (let y = 0; y < sampleHeight; y += step) {
      for (let x = 0; x < sampleWidth; x += step) {
        const index = (y * sampleWidth + x) * 4;
        if (isBackground(imageData[index], imageData[index + 1], imageData[index + 2], imageData[index + 3])) continue;
        const color = colorFor(imageData[index], imageData[index + 1], imageData[index + 2]);
        const nx = x / sampleWidth;
        const ny = y / sampleHeight;
        const tx = nx * width;
        const ty = ny * height;
        particles.push({
          tx,
          ty,
          sx: -width * (0.18 + Math.random() * 0.64),
          sy: ty + (Math.random() - 0.5) * height * 0.72,
          r: color[0],
          g: color[1],
          b: color[2],
          size: 0.86 + Math.random() * 1.28,
          delay: nx * 520 + Math.random() * 240,
          duration: 760 + Math.random() * 520,
          phase: Math.random() * Math.PI * 2,
          drift: Math.max(0, (0.16 - nx) / 0.16),
          life: Math.random(),
        });
      }
    }
  }

  function draw(now) {
    const elapsed = now - startedAt;
    const settled = elapsed > 1680;
    ctx.clearRect(0, 0, width, height);
    const time = now * 0.001;

    for (const particle of particles) {
      let x;
      let y;
      let alpha;
      let hoverBoost = hoverState.active ? 0.08 : 0;
      if (!settled) {
        const local = (elapsed - particle.delay) / particle.duration;
        const progress = local <= 0 ? 0 : local >= 1 ? 1 : easeOut(local);
        x = particle.sx + (particle.tx - particle.sx) * progress;
        y = particle.sy + (particle.ty - particle.sy) * progress;
        alpha = Math.max(0, Math.min(1, local + 0.12));
      } else {
        particle.life = (particle.life + 0.0055) % 1;
        x = particle.tx - 10 * particle.drift * particle.life + Math.sin(time + particle.phase) * 0.45;
        y = particle.ty + Math.cos(time * 0.78 + particle.phase) * 0.55;
        alpha = 1;
        if (mouse.on) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const distanceSquared = dx * dx + dy * dy;
          const radius = Math.max(130, Math.min(220, width * 0.24));
          if (distanceSquared < radius * radius) {
            const distance = Math.sqrt(distanceSquared) || 1;
            const hover = 1 - distance / radius;
            const force = hover * 48;
            hoverBoost = hover;
            x += (dx / distance) * force + Math.sin(time * 8 + particle.phase) * hover * 5;
            y += (dy / distance) * force + Math.cos(time * 7 + particle.phase) * hover * 5;
          }
        }
      }
      if (alpha <= 0.01) continue;
      const drawSize = particle.size * (1 + hoverBoost * 0.9);
      ctx.fillStyle = `rgb(${particle.r},${particle.g},${particle.b})`;
      ctx.globalAlpha = alpha * (hoverState.active ? 0.16 : 0.1);
      ctx.fillRect(x - 0.32, y - 0.32, drawSize + 0.64, drawSize + 0.64);
      ctx.globalAlpha = alpha * (hoverState.active ? 0.72 : 0.62);
      ctx.fillRect(x, y, drawSize, drawSize);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function rebuild() {
    cancelAnimationFrame(raf);
    measure();
    sampleImage();
    startedAt = performance.now();
    host.classList.toggle("is-particle-ready", particles.length > 0);
    raf = requestAnimationFrame(draw);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 160);
  }

  function onPointerMove(event) {
    const rect = heroParticles.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.on = mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
    hoverState.active = mouse.on;
  }

  function onPointerLeave() {
    mouse.on = false;
    hoverState.active = false;
  }

  window.addEventListener("resize", onResize);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerleave", onPointerLeave);

  state.heroParticleCleanup = () => {
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerleave", onPointerLeave);
    ctx.clearRect(0, 0, width, height);
    host.classList.remove("is-particle-ready");
    state.heroParticleCleanup = null;
  };

  rebuild();
}

function scheduleHeroParticles() {
  if (!heroImage) return;
  if (heroImage.complete && heroImage.naturalWidth) {
    initHeroParticles();
    return;
  }
  heroImage.addEventListener("load", initHeroParticles, { once: true });
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    health.classList.toggle("ok", Boolean(data.ok));
    health.classList.toggle("error", !data.ok);
    health.querySelector("b").textContent = data.ok ? "本地服务正常" : "服务异常";
    document.querySelector("#comfy-url")?.replaceChildren(data.comfyui_url.replace(/^https?:\/\//, ""));
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
      scheduleHeroParticles();
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
scheduleHeroParticles();
