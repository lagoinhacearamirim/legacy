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
        image.loading = index < 2 ? "eager" : "lazy";
        if (index === 0) image.fetchPriority = "high";
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


  // Depoimentos: lê acamp/depoimentos.txt em blocos separados por "----".
  // Aceita imagem Markdown ![alt](url), link [alt](url) e também [alt]\\(url).
  const testimonialModal = document.querySelector("#testimonials-modal");
  const testimonialOpenButton = document.querySelector("[data-open-testimonials]");
  const testimonialCloseButton = document.querySelector("[data-close-testimonials]");
  const testimonialTitle = document.querySelector("#testimonials-modal-title");
  const testimonialQuote = document.querySelector("#testimonial-quote");
  const testimonialImageWrap = document.querySelector("#testimonial-image-wrap");
  const testimonialImage = document.querySelector("#testimonial-image");
  const testimonialCounter = document.querySelector("#testimonials-counter");
  const testimonialProgress = document.querySelector("#testimonial-progress");
  const testimonialPrev = document.querySelector("#testimonial-prev");
  const testimonialNext = document.querySelector("#testimonial-next");
  const testimonialEmptyNote = document.querySelector("#testimonial-empty-note");

  let testimonials = [];
  let testimonialIndex = 0;
  let previousFocus = null;

  function parseTestimonials(source) {
    const cleanSource = source.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (!cleanSource) return [];

    return cleanSource.split(/^----+\s*$/m).map((block) => {
      const heading = block.match(/^#\s+(.+)$/m);
      const quoteLines = Array.from(block.matchAll(/^>\s?(.*)$/gm), (match) => match[1]);
      const imageMatch = block.match(/!?\[([^\]]*)\]\s*\\?\(([^)]+)\)/);
      const quote = quoteLines.join("\n").trim();
      if (!heading || !quote) return null;

      let imageUrl = "";
      if (imageMatch) {
        try {
          const parsedUrl = new URL(imageMatch[2].trim(), window.location.href);
          if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") imageUrl = parsedUrl.href;
        } catch (_) {
          imageUrl = "";
        }
      }

      return {
        name: heading[1].trim(),
        quote,
        imageUrl,
        imageAlt: imageMatch ? imageMatch[1].trim() : ""
      };
    }).filter(Boolean);
  }

  function renderTestimonial() {
    const hasTestimonials = testimonials.length > 0;
    const item = hasTestimonials ? testimonials[testimonialIndex] : null;

    testimonialTitle.textContent = item ? item.name : "Depoimentos";
    testimonialQuote.textContent = item
      ? item.quote
      : "Estamos reunindo os depoimentos. Em breve você poderá conferir as histórias por aqui.";
    testimonialEmptyNote.hidden = hasTestimonials;

    if (item && item.imageUrl) {
      testimonialImage.onerror = () => { testimonialImageWrap.hidden = true; };
      testimonialImage.src = item.imageUrl;
      testimonialImage.alt = item.imageAlt || ("Foto de " + item.name);
      testimonialImageWrap.hidden = false;
    } else {
      testimonialImage.removeAttribute("src");
      testimonialImage.alt = "";
      testimonialImageWrap.hidden = true;
    }

    const total = testimonials.length;
    testimonialCounter.textContent = total ? String(testimonialIndex + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0") : "0 / 0";
    testimonialProgress.textContent = total ? "DEPOIMENTO " + (testimonialIndex + 1) + " DE " + total : "AINDA NÃO HÁ DEPOIMENTOS";
    testimonialPrev.disabled = total < 2;
    testimonialNext.disabled = total < 2;
  }

  function openTestimonials() {
    if (!testimonialModal) return;
    previousFocus = document.activeElement;
    renderTestimonial();
    testimonialModal.classList.add("is-open");
    testimonialModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("testimonials-locked");
    testimonialCloseButton.focus();
  }

  function closeTestimonials() {
    if (!testimonialModal || !testimonialModal.classList.contains("is-open")) return;
    testimonialModal.classList.remove("is-open");
    testimonialModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("testimonials-locked");
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  function moveTestimonial(direction) {
    if (testimonials.length < 2) return;
    testimonialIndex = (testimonialIndex + direction + testimonials.length) % testimonials.length;
    renderTestimonial();
  }

  if (testimonialOpenButton && testimonialModal) {
    testimonialOpenButton.addEventListener("click", openTestimonials);
    testimonialCloseButton.addEventListener("click", closeTestimonials);
    testimonialModal.addEventListener("click", (event) => {
      if (event.target === testimonialModal) closeTestimonials();
    });
    testimonialPrev.addEventListener("click", () => moveTestimonial(-1));
    testimonialNext.addEventListener("click", () => moveTestimonial(1));

    document.addEventListener("keydown", (event) => {
      if (!testimonialModal.classList.contains("is-open")) return;
      if (event.key === "Escape") closeTestimonials();
      if (event.key === "ArrowLeft") moveTestimonial(-1);
      if (event.key === "ArrowRight") moveTestimonial(1);
    });

    fetch("./depoimentos.txt")
      .then((response) => {
        if (!response.ok) throw new Error("Arquivo de depoimentos ainda não disponível.");
        return response.text();
      })
      .then((source) => {
        testimonials = parseTestimonials(source);
        testimonialIndex = 0;
        if (testimonialModal.classList.contains("is-open")) renderTestimonial();
      })
      .catch(() => {
        testimonials = [];
      });
  }

})();
