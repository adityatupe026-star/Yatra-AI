import { isMobile } from "../utils/helpers.js";

function initReveal() {
  document.body.classList.add("page-ready");
  const revealTargets = document.querySelectorAll(".feature-card, .route-card, .sidebar-card, .workflow-card, .destination-card, .event-card, .mini-destination-card, .route-spotlight-card, .inspiration-card, .message, .chat-session-item, .reveal-on-scroll, .stat-block, .wishlist-card");
  revealTargets.forEach((item, index) => {
    item.classList.add("reveal-on-scroll");
    item.style.setProperty("--reveal-delay", `${Math.min(index * 45, 260)}ms`);
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((item) => observer.observe(item));
}

function initCursorGlow() {
  if (isMobile()) return;
  let glow = document.querySelector(".cursor-glow");
  if (!glow) {
    glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);
  }
  window.addEventListener("pointermove", (event) => {
    glow.style.transform = `translate(${event.clientX - 120}px, ${event.clientY - 120}px)`;
  });
  document.querySelectorAll(".feature-card, .route-card, .destination-card, .sidebar-card, .button, .nav-link").forEach((item) => {
    item.addEventListener("mouseenter", () => glow.classList.add("intense"));
    item.addEventListener("mouseleave", () => glow.classList.remove("intense"));
  });
}

function initParallax() {
  const hero = document.querySelector(".hero-parallax");
  if (!hero || isMobile()) return;
  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 12;
    hero.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
  });
}

function initCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  counters.forEach((counter) => {
    const target = Number(counter.getAttribute("data-counter") || 0);
    let current = 0;
    const step = Math.max(1, Math.round(target / 40));
    const tick = () => {
      current = Math.min(target, current + step);
      counter.textContent = current.toLocaleString("en-IN");
      if (current < target) requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tick();
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(counter);
  });
}

function initScrollProgress() {
  let bar = document.querySelector(".scroll-progress");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
  }
  const sync = () => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = height > 0 ? (window.scrollY / height) * 100 : 0;
    bar.style.width = `${ratio}%`;
  };
  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

export function initMotion() {
  initReveal();
  initCursorGlow();
  initParallax();
  initCounters();
  initScrollProgress();
}
