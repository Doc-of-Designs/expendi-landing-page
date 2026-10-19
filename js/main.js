// Mobile navigation toggle
(function () {
  const button = document.querySelector(".nav__menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (!button || !menu) return;

  button.addEventListener("click", function () {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    button.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    menu.hidden = open;
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !menu.hidden) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
      button.focus();
    }
  });
})();

// Features: scroll-driven tabs + phone screens
//
// Desktop/tablet: the heading, tabs and phone pin while the page scrolls
// through one step per feature, like the Figma state frames.
// Phones: no pinning - each feature is a card with its own screen, and the
// cards fade in as they scroll into view.
(function () {
  const section = document.querySelector(".features");
  if (!section) return;

  const track = section.querySelector(".features__track");
  const pin = section.querySelector(".features__pin");
  const body = section.querySelector(".features__body");
  const visual = section.querySelector(".features__visual");
  const tabs = Array.from(section.querySelectorAll(".feature-tab"));
  const STEPS = tabs.length;
  const phone = window.matchMedia("(max-width: 767px)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let stepLength = 0;
  let pinTop = 0;
  let pinned = false;
  let current;

  // 0..3 = feature screens (starts on Programmable Budgets)
  function setStep(step) {
    if (step === current) return;
    current = step;
    section.dataset.step = String(step);

    tabs.forEach(function (tab, index) {
      const active = index === step;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
  }

  function layout() {
    section.classList.remove("is-pinned");
    section.style.removeProperty("--pin-gap");
    section.style.removeProperty("--visual-h");
    section.style.removeProperty("--body-gap");
    track.style.height = "";

    pinned = !phone.matches;
    if (!pinned) return; // phones: plain feature cards

    const viewport = window.innerHeight;
    // Space taken by the fixed glass nav once scrolled (12 + 8 + 64 + 8)
    const navSpace = 92;
    const available = viewport - navSpace;
    fitToViewport(available - 16);

    const pinHeight = pin.offsetHeight;
    stepLength = Math.max(viewport * 0.5, 320);
    // Centre heading + tabs + phone in the space below the nav; if it still
    // doesn't fit, keep the heading just under the nav and let the bottom of
    // the phone card crop instead.
    pinTop =
      pinHeight <= available - 16
        ? navSpace + Math.round((available - pinHeight) / 2)
        : navSpace + 8;

    section.style.setProperty("--pin-top", pinTop + "px");
    section.classList.add("is-pinned");
    track.style.height = pinHeight + stepLength * STEPS + "px";

    update();
  }

  // On short screens, tighten the heading gap (down to 24px) and then shorten
  // the phone card (down to 340px) so heading + tabs + phone fit on screen.
  function fitToViewport(available) {
    let excess = pin.offsetHeight - available;
    if (excess <= 0) return;

    const gap = parseFloat(window.getComputedStyle(pin).rowGap) || 0;
    const gapCut = Math.min(excess, Math.max(0, gap - 24));
    if (gapCut > 0) section.style.setProperty("--pin-gap", gap - gapCut + "px");

    excess = pin.offsetHeight - available;
    if (excess <= 0) return;

    // Stacked (tablet) layout: also tighten the gap between tabs and phone
    if (window.getComputedStyle(body).flexDirection === "column") {
      const bodyGap = parseFloat(window.getComputedStyle(body).rowGap) || 0;
      const bodyGapCut = Math.min(excess, Math.max(0, bodyGap - 24));
      if (bodyGapCut > 0) section.style.setProperty("--body-gap", bodyGap - bodyGapCut + "px");
      excess = pin.offsetHeight - available;
      if (excess <= 0) return;
    }

    const cardHeight = visual.offsetHeight;
    const cardCut = Math.min(excess, Math.max(0, cardHeight - 340));
    if (cardCut > 0) section.style.setProperty("--visual-h", cardHeight - cardCut + "px");
  }

  function update() {
    if (!pinned) return;
    const scrolled = pinTop - track.getBoundingClientRect().top;
    setStep(Math.min(STEPS - 1, Math.max(0, Math.floor(scrolled / stepLength))));
  }

  // Clicking a tab scrolls to that feature's step
  function goTo(index) {
    if (!pinned) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const target = trackTop - pinTop + (index + 0.5) * stepLength;
    window.scrollTo({ top: target, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      goTo(index);
    });
  });

  // Phones: fade each feature card in as it scrolls into view
  if ("IntersectionObserver" in window) {
    section.classList.add("has-reveal");
    const reveal = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    section.querySelectorAll(".features__list li").forEach(function (card) {
      reveal.observe(card);
    });
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);

  layout();
})();

// Testimonial: an orange highlight travels along the arc from avatar to
// avatar (left to right), showing each person's testimonial. After the last
// one it waits the same time, then starts again from the first.
(function () {
  const section = document.querySelector(".testimonial");
  if (!section) return;

  const arc = section.querySelector(".testimonial__arc");
  const highlight = section.querySelector(".testimonial__line-highlight");
  const avatars = Array.from(section.querySelectorAll(".testimonial-avatar"));
  const quote = section.querySelector(".testimonial__quote");
  const text = section.querySelector(".testimonial__text");
  const name = section.querySelector(".testimonial__name");
  const role = section.querySelector(".testimonial__role");

  const MOVE = 1400; // highlight travel time (matches the CSS transition)
  const HOLD = 4000; // time spent on each person
  const FADE = 400; // quote / highlight fade

  const VIEW_W = 1200;
  const VIEW_H = 271.833;

  let stops = []; // distance along the arc (SVG units) for each avatar
  let total = 0;
  let current = 0;
  let timer = null;
  let running = false;

  // Where each avatar's centre sits along the path
  function measure() {
    total = highlight.getTotalLength();
    stops = avatars.map(function (avatar) {
      const cx = (parseFloat(avatar.style.getPropertyValue("--cx")) / 100) * VIEW_W;
      const cy = (parseFloat(avatar.style.getPropertyValue("--cy")) / 100) * VIEW_H;
      let best = 0;
      let bestDistance = Infinity;
      for (let length = 0; length <= total; length += 2) {
        const point = highlight.getPointAtLength(length);
        const distance = (point.x - cx) ** 2 + (point.y - cy) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = length;
        }
      }
      return best;
    });
  }

  // Keep the line ~1.5px on screen whatever the arc's size
  function sizeLine() {
    const scale = VIEW_W / Math.max(arc.clientWidth, 1);
    arc.style.setProperty("--line-width", (1.5 * scale).toFixed(3));
  }

  // Orange segment runs from the previous avatar up to the active one, so
  // its leading end is the avatar whose ring is filling
  function placeHighlight(index) {
    const start = stops[Math.max(index - 1, 0)];
    const end = stops[index];
    highlight.style.strokeDasharray = end - start + " " + (total + 10);
    highlight.style.strokeDashoffset = String(-start);
  }

  // Start the orange ring filling round an avatar: it begins when the
  // highlight arrives (delay) and completes as it leaves (duration)
  function fillRing(avatar, delay, duration) {
    avatar.style.setProperty("--ring-delay", delay + "ms");
    avatar.style.setProperty("--ring-duration", duration + "ms");
    avatar.classList.remove("is-active");
    void avatar.offsetWidth; // restart the CSS animation
    avatar.classList.add("is-active");
  }

  function showPerson(index, animateQuote, ringDelay, ringDuration) {
    current = index;
    avatars.forEach(function (avatar, i) {
      if (i !== index) avatar.classList.remove("is-active");
    });
    fillRing(avatars[index], ringDelay, ringDuration);

    const person = avatars[index].dataset;
    if (!animateQuote) {
      text.textContent = person.quote;
      name.textContent = person.name;
      role.textContent = person.role;
      return;
    }
    quote.classList.add("is-changing");
    window.setTimeout(function () {
      text.textContent = person.quote;
      name.textContent = person.name;
      role.textContent = person.role;
      quote.classList.remove("is-changing");
    }, FADE);
  }

  function step() {
    const next = current + 1;

    if (next < avatars.length) {
      // Glide to the next person
      placeHighlight(next);
      showPerson(next, true, MOVE, HOLD);
    } else {
      // Back to the start: fade the highlight out, jump, fade it in
      highlight.classList.add("is-jumping");
      highlight.style.opacity = "0";
      window.setTimeout(function () {
        placeHighlight(0);
        showPerson(0, false, 0, MOVE + HOLD - FADE);
        highlight.getBoundingClientRect(); // apply the jump before fading in
        highlight.style.opacity = "1";
        window.setTimeout(function () {
          highlight.classList.remove("is-jumping");
        }, FADE);
      }, FADE);
      quote.classList.add("is-changing");
      window.setTimeout(function () {
        quote.classList.remove("is-changing");
      }, FADE * 2);
    }

    timer = window.setTimeout(step, MOVE + HOLD);
  }

  function start() {
    if (running) return;
    running = true;
    // (Re)start the current person's ring in step with the timer
    fillRing(avatars[current], 0, MOVE + HOLD);
    timer = window.setTimeout(step, MOVE + HOLD);
  }

  function stop() {
    running = false;
    window.clearTimeout(timer);
  }

  measure();
  sizeLine();
  highlight.classList.add("is-jumping"); // no transition for the first placement
  placeHighlight(0);
  showPerson(0, false, 0, MOVE + HOLD);
  avatars[0].style.setProperty("--ring-delay", "99999s"); // wait for start()
  highlight.getBoundingClientRect();
  highlight.classList.remove("is-jumping");

  window.addEventListener("resize", sizeLine);

  // Only run while the section is on screen and the tab is visible
  let inView = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !document.hidden) start();
        else stop();
      },
      { threshold: 0.3 }
    ).observe(section);
  } else {
    inView = true;
    start();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (inView) start();
  });
})();

// FAQ accordion: one question open at a time
(function () {
  const items = Array.from(document.querySelectorAll(".faq-item"));
  if (!items.length) return;

  function setOpen(item, open) {
    item.classList.toggle("is-open", open);
    item.querySelector(".faq-item__trigger").setAttribute("aria-expanded", String(open));
  }

  items.forEach(function (item) {
    item.querySelector(".faq-item__trigger").addEventListener("click", function () {
      const opening = !item.classList.contains("is-open");
      items.forEach(function (other) {
        setOpen(other, other === item && opening);
      });
    });
  });
})();

// CTA: build a glow layer from the orange ribbon in the phone render.
// Pixels that are strongly orange (red well above blue) are kept, brightened
// and everything else made transparent; CSS then sweeps a band of it along.
(function () {
  const glow = document.querySelector(".cta__glow");
  const image = document.querySelector(".cta__visual img");
  if (!glow || !image) return;

  const cache = {};

  function build() {
    const src = image.currentSrc || image.src;
    if (!src || !image.naturalWidth) return;
    if (cache[src]) {
      glow.style.setProperty("--glow-src", cache[src]);
      glow.classList.add("is-ready");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);

    let pixels;
    try {
      pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      return; // e.g. opened from file:// — just skip the glow
    }

    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Orange: red high, blue low, green in between
      const orange = (r - b) / 255;
      const strength = Math.max(0, Math.min(1, orange * 3 - 1.25)) * (r > 170 ? 1 : 0);
      // Warm, brighter orange (kept orange rather than drifting to yellow)
      data[i] = 255;
      data[i + 1] = Math.min(255, g + 45);
      data[i + 2] = Math.min(255, b + 25);
      data[i + 3] = Math.round(strength * 255);
    }
    context.putImageData(pixels, 0, 0);

    cache[src] = 'url("' + canvas.toDataURL("image/png") + '")';
    glow.style.setProperty("--glow-src", cache[src]);
    glow.classList.add("is-ready");
  }

  // Runs on first load and again when <picture> swaps sources on resize
  image.addEventListener("load", build);
  if (image.complete) build();
})();

// Newsletter: check the email locally. There's no backend yet, so this only
// validates the address and shows a note; wire it to your email provider.
(function () {
  const form = document.querySelector(".footer__form");
  if (!form) return;

  const input = form.querySelector(".footer__input");
  const message = form.querySelector(".footer__form-message");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!input.checkValidity() || !input.value.trim()) {
      input.setAttribute("aria-invalid", "true");
      message.textContent = "Please enter a valid email address.";
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    message.textContent = "Thanks! You're on the list.";
    form.reset();
  });

  input.addEventListener("input", function () {
    input.removeAttribute("aria-invalid");
    message.textContent = "";
  });
})();

// Nav: frosted-glass bar once the page has scrolled
(function () {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  let ticking = false;
  function update() {
    ticking = false;
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
})();

// Metrics: count each figure up from 0 the first time the section is seen.
// The final values stay in the HTML, so without JS they simply show as-is.
(function () {
  const section = document.querySelector(".metrics");
  const values = Array.from(document.querySelectorAll(".metric__value"));
  if (!section || !values.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  const DURATION = 1800;
  const STAGGER = 120;

  // "400+" → { prefix: "", target: 400, suffix: "+" }
  const counters = values.map(function (el) {
    const match = el.textContent.trim().match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return null;
    const counter = {
      el: el,
      prefix: match[1],
      target: parseFloat(match[2]),
      decimals: (match[2].split(".")[1] || "").length,
      suffix: match[3],
    };
    el.textContent = counter.prefix + (0).toFixed(counter.decimals) + counter.suffix;
    return counter;
  });

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function run(counter, delay) {
    let start = null;
    function frame(now) {
      if (start === null) start = now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / DURATION));
      const value = counter.target * easeOutCubic(t);
      counter.el.textContent = counter.prefix + value.toFixed(counter.decimals) + counter.suffix;
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(
    function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      counters.forEach(function (counter, index) {
        if (counter) run(counter, index * STAGGER);
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(section);
})();
