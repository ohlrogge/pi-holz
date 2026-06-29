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
