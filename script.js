(() => {
  const dialog = document.querySelector("#shoe-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const ui = {
    image: dialog.querySelector("#shoe-dialog-image"),
    kicker: dialog.querySelector("#shoe-dialog-kicker"),
    title: dialog.querySelector("#shoe-dialog-title"),
    average: dialog.querySelector("#shoe-dialog-avg"),
    tags: dialog.querySelector("#shoe-dialog-tags"),
    radar: dialog.querySelector("#shoe-radar"),
    buy: dialog.querySelector("#shoe-dialog-buy"),
    buyLabel: dialog.querySelector("#shoe-dialog-buy span"),
    close: dialog.querySelector(".dialog-close"),
  };

  const SVG_NS = "http://www.w3.org/2000/svg";
  const RADAR_SIZE = 400;
  const RADAR_CENTER = RADAR_SIZE / 2;
  const RADAR_RADIUS = 116;
  const LABEL_RADIUS = 148;

  let lastTrigger = null;

  const svgNode = (name, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, String(value));
    }
    return node;
  };

  const readCard = (card) => {
    const scores = [...card.querySelectorAll(".scores li")].map((item) => ({
      label: item.querySelector(".score-label").textContent.trim(),
      value: Number(item.querySelector(".score-num").textContent.trim()) || 0,
    }));

    return {
      title: card.querySelector(".card-title").textContent.trim(),
      kicker: card.querySelector(".kicker").textContent.trim(),
      average: card.querySelector(".avg-badge b").textContent.trim(),
      image: card.querySelector(".card-media img"),
      buy: card.querySelector(".btn-buy"),
      tags: [...card.querySelectorAll(".tags li")].map((item) =>
        item.textContent.trim(),
      ),
      scores,
    };
  };

  const buildRadar = (title, scores) => {
    const titleNode = svgNode("title", { id: "radar-title" });
    titleNode.textContent = `${title} 十维评分雷达图`;

    const descNode = svgNode("desc", { id: "radar-desc" });
    descNode.textContent = scores
      .map((item) => `${item.label} ${item.value} 分`)
      .join("、");

    const point = (index, radius) => {
      const angle =
        (Math.PI * 2 * index) / scores.length - Math.PI / 2;
      return [
        RADAR_CENTER + Math.cos(angle) * radius,
        RADAR_CENTER + Math.sin(angle) * radius,
      ];
    };

    const pointsForRadius = (radius) =>
      scores
        .map((_, index) => point(index, radius).map((value) => value.toFixed(1)).join(","))
        .join(" ");

    const nodes = [titleNode, descNode];

    for (const level of [2, 4, 6, 8, 10]) {
      nodes.push(
        svgNode("polygon", {
          points: pointsForRadius((RADAR_RADIUS * level) / 10),
          class:
            level === 10
              ? "radar-ring radar-ring--outer"
              : "radar-ring",
        }),
      );
    }

    for (let index = 0; index < scores.length; index += 1) {
      const [x, y] = point(index, RADAR_RADIUS);
      nodes.push(
        svgNode("line", {
          x1: RADAR_CENTER,
          y1: RADAR_CENTER,
          x2: x.toFixed(1),
          y2: y.toFixed(1),
          class: "radar-axis",
        }),
      );
    }

    const shapePoints = scores
      .map((item, index) =>
        point(index, (RADAR_RADIUS * Math.min(item.value, 10)) / 10)
          .map((value) => value.toFixed(1))
          .join(","),
      )
      .join(" ");

    nodes.push(
      svgNode("polygon", {
        points: shapePoints,
        class: "radar-shape",
      }),
    );

    scores.forEach((item, index) => {
      const [x, y] = point(
        index,
        (RADAR_RADIUS * Math.min(item.value, 10)) / 10,
      );
      nodes.push(
        svgNode("circle", {
          cx: x.toFixed(1),
          cy: y.toFixed(1),
          r: 3.2,
          class: "radar-dot",
        }),
      );
    });

    scores.forEach((item, index) => {
      const angle =
        (Math.PI * 2 * index) / scores.length - Math.PI / 2;
      const x = RADAR_CENTER + Math.cos(angle) * LABEL_RADIUS;
      const y = RADAR_CENTER + Math.sin(angle) * LABEL_RADIUS;
      const horizontal = Math.cos(angle);
      const anchor =
        Math.abs(horizontal) < 0.15
          ? "middle"
          : horizontal > 0
            ? "start"
            : "end";

      const text = svgNode("text", {
        x: x.toFixed(1),
        y: y.toFixed(1),
        "text-anchor": anchor,
        "dominant-baseline": "middle",
        class: "radar-label",
      });

      const name = svgNode("tspan");
      name.textContent = `${item.label} `;
      const value = svgNode("tspan", { class: "radar-value" });
      value.textContent = String(item.value);

      text.append(name, value);
      nodes.push(text);
    });

    ui.radar.replaceChildren(...nodes);
  };

  const openCard = (card, trigger) => {
    const data = readCard(card);
    lastTrigger = trigger;

    ui.image.src = data.image.currentSrc || data.image.src;
    ui.image.alt = data.image.alt;
    ui.image.classList.toggle(
      "is-bright",
      Boolean(card.querySelector(".card-media--ae2")),
    );
    ui.kicker.textContent = data.kicker;
    ui.title.textContent = data.title;
    ui.average.textContent = data.average;

    ui.tags.replaceChildren(
      ...data.tags.map((tag) => {
        const item = document.createElement("li");
        item.textContent = tag;
        return item;
      }),
    );

    if (data.buy) {
      ui.buy.href = data.buy.href;
      const label = data.buy.querySelector("span");
      if (label && ui.buyLabel) {
        ui.buyLabel.textContent = label.textContent;
      }
      ui.buy.hidden = false;
    } else {
      ui.buy.hidden = true;
    }

    buildRadar(data.title, data.scores);

    if (!dialog.open) {
      dialog.showModal();
    }
    document.documentElement.classList.add("dialog-open");
    requestAnimationFrame(() => ui.close.focus());
  };

  for (const card of document.querySelectorAll(".shoe-card")) {
    const title = card.querySelector(".card-title")?.textContent.trim() ?? "球鞋";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-open";
    button.setAttribute("aria-label", `${title}：查看照片和十维雷达图`);
    button.setAttribute("aria-haspopup", "dialog");
    button.addEventListener("click", () => openCard(card, button));
    card.classList.add("is-clickable");
    card.prepend(button);
  }

  ui.close.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("dialog-open");
    if (lastTrigger) lastTrigger.focus();
  });
})();

(() => {
  const input = document.querySelector("#shoe-search");
  const grid = document.querySelector("#shoe-grid");
  if (!input || !grid) return;

  const cards = [...grid.querySelectorAll(".shoe-card")];
  const count = document.querySelector("#shoe-search-count");
  const emptyState = document.querySelector("#shoe-search-empty");
  const emptyTerm = document.querySelector("#shoe-search-term");
  const clearButton = document.querySelector("#shoe-search-clear");
  const resetButton = document.querySelector("#shoe-search-reset");

  const normalize = (value) =>
    value.trim().toLowerCase().replace(/\s+/g, "");

  const names = new Map(
    cards.map((card) => [
      card,
      normalize(card.querySelector(".card-title").textContent),
    ]),
  );

  const applyFilter = () => {
    const query = normalize(input.value);
    const visibleCards = [];

    for (const card of cards) {
      const matches = !query || names.get(card).includes(query);
      card.hidden = !matches;
      if (matches) visibleCards.push(card);
    }

    for (const card of cards) {
      card.classList.remove("is-last-odd");
    }

    if (visibleCards.length % 2 === 1) {
      visibleCards[visibleCards.length - 1].classList.add("is-last-odd");
    }

    count.textContent = query
      ? `找到 ${visibleCards.length} 双`
      : `共 ${cards.length} 双`;

    emptyState.hidden = visibleCards.length !== 0;
    if (visibleCards.length === 0) {
      emptyTerm.textContent = input.value.trim();
    }

    clearButton.hidden = input.value.length === 0;
  };

  const clearSearch = () => {
    input.value = "";
    applyFilter();
    input.focus();
  };

  let composing = false;

  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    applyFilter();
  });
  input.addEventListener("input", () => {
    if (!composing) applyFilter();
  });
  input.addEventListener("search", applyFilter);
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape" && input.value) {
      event.preventDefault();
      clearSearch();
    }
  });

  clearButton.addEventListener("click", clearSearch);
  resetButton.addEventListener("click", clearSearch);

  applyFilter();
})();
