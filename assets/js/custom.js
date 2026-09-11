import PhotoSwipeLightbox from "./photoswipe/photoswipe-lightbox.esm.js";
import PhotoSwipe from "./photoswipe/photoswipe.esm.js";
import PhotoSwipeDynamicCaption from "./photoswipe/photoswipe-dynamic-caption-plugin.esm.min.js";
import * as params from "@params";

document.querySelectorAll('[id^="fs-gallery-"]').forEach(gallery => {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: ".gallery-item",
    showHideAnimationType: "zoom",
    bgOpacity: 1,
    pswpModule: PhotoSwipe,
    imageClickAction: "close",
    closeTitle: params.closeTitle,
    zoomTitle: params.zoomTitle,
    arrowPrevTitle: params.arrowPrevTitle,
    arrowNextTitle: params.arrowNextTitle,
    errorMsg: params.errorMsg,
  });

  new PhotoSwipeDynamicCaption(lightbox, {
    mobileLayoutBreakpoint: 700,
    type: "auto",
    mobileCaptionOverlapRatio: 1,
  });

  lightbox.init();
});

/* Fertigungsschritte carousel: arrows, progress bar and keyboard on top of CSS scroll-snap. */
document.querySelectorAll(".fs-carousel").forEach((carousel) => {
  const track = carousel.querySelector(".fs-track");
  const slides = [...track.querySelectorAll(".fs-slide")];
  const prev = carousel.querySelector(".fs-prev");
  const next = carousel.querySelector(".fs-next");
  const bar = carousel.querySelector(".fs-progress-bar");
  if (slides.length < 2) return;

  const offsetOf = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
  const current = () => {
    let best = 0;
    slides.forEach((_, i) => {
      if (Math.abs(offsetOf(i) - track.scrollLeft) < Math.abs(offsetOf(best) - track.scrollLeft)) best = i;
    });
    return best;
  };
  const goTo = (i) => {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: offsetOf(idx) });
  };
  const last = slides.length - 1;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // From the last slide, jump straight back to the first instead of scrolling past all of them.
  const restart = () => {
    const jump = () => {
      track.scrollTo({ left: 0, behavior: "instant" });
      track.classList.remove("is-restarting");
      update();
    };
    if (reduceMotion) return jump();
    track.classList.add("is-restarting");
    setTimeout(jump, 200);
  };
  const forward = () => (current() === last ? restart() : goTo(current() + 1));

  // Load the current slide's image and its neighbours before they scroll into view.
  const preload = (idx) => {
    for (let i = idx - 1; i <= idx + 2; i++) {
      const img = slides[i]?.querySelector("img[data-fs-src]");
      if (!img) continue;
      img.src = img.dataset.fsSrc;
      img.removeAttribute("data-fs-src");
    }
  };

  const update = () => {
    const idx = current();
    prev.disabled = idx === 0;
    const atEnd = idx === last;
    next.textContent = atEnd ? "↺" : "→";
    next.setAttribute("aria-label", atEnd ? "Zurück zum Anfang" : "Nächster Schritt");
    next.title = atEnd ? "Von vorn" : "";
    next.classList.toggle("fs-arrow--restart", atEnd);
    bar.style.width = `${((idx + 1) / slides.length) * 100}%`;
    preload(idx);
  };

  prev.addEventListener("click", () => goTo(current() - 1));
  next.addEventListener("click", forward);
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current() - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); forward(); }
  });

  let ticking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
});

/* Replace the header brand text with the active section name while scrolling. */
(() => {
  const brand = document.getElementById("nav-brand-text");
  const sections = [...document.querySelectorAll("[data-nav-title]")];
  if (!brand || sections.length === 0) return;

  const DEFAULT = brand.textContent;
  const HEADER = 70; // ~4rem fixed header
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setBrand = (text) => {
    if (brand.dataset.cur === text) return;
    brand.dataset.cur = text;
    if (reduceMotion) {
      brand.textContent = text;
      return;
    }
    brand.style.opacity = "0";
    clearTimeout(brand._swap);
    brand._swap = setTimeout(() => {
      brand.textContent = text;
      brand.style.opacity = "1";
    }, 180);
  };

  const update = () => {
    let best = null;
    let bestTop = -Infinity;
    for (const s of sections) {
      const top = s.getBoundingClientRect().top;
      if (top <= HEADER && top > bestTop) {
        bestTop = top;
        best = s;
      }
    }
    // The last section may sit too low on the page to ever reach the header band;
    // once scrolled to the very bottom, treat it as active.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      best = sections[sections.length - 1];
    }
    setBrand(best ? best.getAttribute("data-nav-title") : DEFAULT);
  };

  const io = new IntersectionObserver(update, {
    rootMargin: `-${HEADER}px 0px -55% 0px`,
    threshold: 0,
  });
  sections.forEach((s) => io.observe(s));

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  update();
})();
