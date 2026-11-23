(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scroll reveal: mantém os elementos observados para que a animação
  // volte ao estado inicial quando a pessoa rolar a página para cima.
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -7% 0px"
    });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // O CTA original migra para o topo direito depois que sai da primeira dobra.
  // Ele desaparece quando a chamada final para inscrição chega à tela.
  const floatingCta = document.querySelector(".hero-cta");
  const ctaOrigin = document.querySelector("#cta-origin");
  const finalCta = document.querySelector(".final-cta");

  if (floatingCta && ctaOrigin && finalCta && "IntersectionObserver" in window) {
    let originHasPassed = false;
    let finalIsVisible = false;

    const updateFloatingCta = () => {
      const shouldFloat = originHasPassed && !finalIsVisible;
      floatingCta.classList.toggle("is-floating", shouldFloat);
      floatingCta.classList.toggle("is-hidden", finalIsVisible);
    };

    const originObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      originHasPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      updateFloatingCta();
    }, { threshold: 0.08 });

    const finalObserver = new IntersectionObserver((entries) => {
      finalIsVisible = entries[0].isIntersecting;
      updateFloatingCta();
    }, { threshold: 0.12 });

    originObserver.observe(ctaOrigin);
    finalObserver.observe(finalCta);
  }

  // As imagens são configuradas em photos.json. Assim, novas fotos podem
  // ser adicionadas à pasta acampPics sem alterar o layout da página.
  const photoSlots = document.querySelectorAll("[data-photo-index]");
  fetch("./photos.json")
    .then((response) => {
      if (!response.ok) throw new Error("Não foi possível carregar photos.json");
      return response.json();
    })
    .then((photos) => {
      if (!Array.isArray(photos)) return;

      photoSlots.forEach((slot) => {
        const index = Number(slot.dataset.photoIndex);
        const photo = photos[index];
        if (!photo || !photo.src) return;

        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.alt || "Registro do último Acamp";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => image.remove(), { once: true });

        const placeholder = slot.querySelector(".photo-placeholder");
        image.addEventListener("load", () => {
          if (placeholder) placeholder.hidden = true;
        }, { once: true });
        slot.appendChild(image);

        if (photo.caption) {
          const caption = document.createElement("figcaption");
          caption.className = "photo-caption";
          caption.textContent = photo.caption;
          slot.appendChild(caption);
        }
      });
    })
    .catch(() => {
      // Sem fotos cadastradas, os cartões gráficos permanecem como fallback.
    });
})();
