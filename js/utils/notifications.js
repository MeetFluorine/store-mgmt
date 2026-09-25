// =========================================================
// Toast notifications
// =========================================================

let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement("div");
  container.id = "toast-container";
  container.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; gap: 8px; z-index: 9999;
    width: min(360px, calc(100% - 32px));
  `;
  document.body.appendChild(container);
  return container;
}

const TONES = {
  success: { bg: "#E7F8EE", border: "#BCEBCF", color: "#17A24A" },
  error:   { bg: "#FDEAEA", border: "#F6C6C6", color: "#E23B3B" },
  info:    { bg: "#EAF1FE", border: "#C6DAFB", color: "#2563EB" }
};

export function showToast(message, tone = "info", duration = 3200) {
  const el = document.createElement("div");
  const t = TONES[tone] || TONES.info;
  el.textContent = message;
  el.style.cssText = `
    background: ${t.bg}; color: ${t.color}; border: 1px solid ${t.border};
    padding: 12px 16px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
    box-shadow: 0 8px 24px rgba(16,24,40,.12);
  `;
  ensureContainer().appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 250);
  }, duration);
}
