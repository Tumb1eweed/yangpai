const referenceGrid = document.querySelector("#reference-grid");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSamples(items) {
  if (!items.length) {
    referenceGrid.innerHTML = '<div class="empty-state">未找到生成样例</div>';
    return;
  }
  referenceGrid.innerHTML = items.map((item) => `
    <article class="sample-item">
      <div class="sample-prompt">
        <span>提示词</span>
        <p>${escapeHtml(item.prompt || item.title)}</p>
        <button class="copy-prompt" type="button" data-prompt="${escapeHtml(item.prompt || item.title)}">复制提示词</button>
      </div>
      <figure>
        <img src="${item.url}" alt="${escapeHtml(item.title)}" />
        <figcaption>${escapeHtml(item.title)}</figcaption>
      </figure>
    </article>
  `).join("");
}

async function copyPrompt(button) {
  const text = button.dataset.prompt || "";
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  const original = button.textContent;
  button.textContent = "已复制";
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1200);
}

async function loadSamples() {
  try {
    const response = await fetch("/api/references");
    const data = await response.json();
    renderSamples(data.references || []);
  } catch {
    renderSamples([]);
  }
}

referenceGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".copy-prompt");
  if (!button) return;
  copyPrompt(button);
});

loadSamples();
