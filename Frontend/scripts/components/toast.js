let toastHost;

function ensureHost() {
  if (toastHost) return toastHost;
  toastHost = document.createElement("div");
  toastHost.className = "toast-stack";
  document.body.appendChild(toastHost);
  return toastHost;
}

export function showToast(message, tone = "default") {
  const host = ensureHost();
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 240);
  }, 2600);
}
