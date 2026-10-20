(() => {
  const dialog = document.querySelector("#shoe-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const ui = {
    image: dialog.querySelector("#shoe-dialog-image"),
    kicker: dialog.querySelector("#shoe-dialog-kicker"),
    title: dialog.querySelector("#shoe-dialog-title"),
    average: dialog.querySelector("#shoe-dialog-avg"),
    tags: dialog.querySelector("#shoe-dialog-tags"),
    intro: dialog.querySelector("#shoe-dialog-intro"),
    desc: dialog.querySelector("#shoe-dialog-desc"),
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
      desc: card.querySelector(".desc")?.textContent.trim() ?? "",
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

    ui.desc.textContent = data.desc;
    ui.intro.hidden = data.desc.length === 0;

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

  document.addEventListener("shoe:open", (event) => {
    const cardId = event.detail?.cardId;
    const card = cardId
      ? document.getElementById(cardId)?.closest(".shoe-card")
      : null;
    if (card) openCard(card, event.detail?.trigger ?? null);
  });

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
  const emptyTitle = document.querySelector("#shoe-search-empty-title");
  const clearButton = document.querySelector("#shoe-search-clear");
  const resetButton = document.querySelector("#shoe-search-reset");
  const filterToggle = document.querySelector("#shoe-filter-toggle");
  const filterPanel = document.querySelector("#shoe-filter-panel");
  const filterCount = document.querySelector("#shoe-filter-count");
  const filterClose = document.querySelector("#shoe-filter-close");
  const filterReset = document.querySelector("#shoe-filter-reset");
  const filterApply = document.querySelector("#shoe-filter-apply");
  const filterGroups = [...filterPanel.querySelectorAll(".filter-group")];
  const filterInputs = [
    ...filterPanel.querySelectorAll('input[type="checkbox"]'),
  ];

  const DIMENSION_KEYS = [
    "playstyle",
    "weight",
    "budget",
    "court",
    "brand",
    "tech",
  ];

  const normalize = (value) =>
    value.trim().toLowerCase().replace(/\s+/g, "");

  const names = new Map(
    cards.map((card) => [
      card,
      normalize(card.querySelector(".card-title").textContent),
    ]),
  );

  const cardFilterValues = new Map(
    cards.map((card) => [
      card,
      Object.fromEntries(
        DIMENSION_KEYS.map((key) => [
          key,
          new Set(
            (card.dataset[key] || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ]),
      ),
    ]),
  );

  const getActiveFilters = () =>
    filterGroups
      .map((group) => ({
        key: group.dataset.filterKey,
        values: [
          ...group.querySelectorAll('input[type="checkbox"]:checked'),
        ].map((item) => item.value),
      }))
      .filter((group) => group.values.length > 0);

  const cardMatchesFilters = (card, filters) => {
    const values = cardFilterValues.get(card);
    return filters.every(({ key, values: selected }) =>
      selected.some((value) => values[key].has(value)),
    );
  };

  const updateFilterBadge = (filters) => {
    const selectedCount = filters.reduce(
      (total, group) => total + group.values.length,
      0,
    );
    filterCount.textContent = String(selectedCount);
    filterCount.hidden = selectedCount === 0;
    filterToggle.classList.toggle("has-filters", selectedCount > 0);
    filterToggle.setAttribute(
      "aria-label",
      selectedCount > 0 ? `筛选，已选 ${selectedCount} 个条件` : "筛选",
    );
  };

  const setFilterOpen = (open) => {
    filterPanel.hidden = !open;
    filterToggle.setAttribute("aria-expanded", String(open));
  };

  const emptyMessage = (queryText, hasFilters) => {
    if (!queryText) return "没有找到符合筛选条件的球鞋";
    if (hasFilters) {
      return `没有找到「${queryText}」及符合筛选条件的球鞋`;
    }
    return `没有找到「${queryText}」`;
  };

  const applyFilter = () => {
    const rawQuery = input.value;
    const query = normalize(rawQuery);
    const filters = getActiveFilters();
    const visibleCards = [];

    for (const card of cards) {
      const matchesName = !query || names.get(card).includes(query);
      const matchesFilters = cardMatchesFilters(card, filters);
      const matches = matchesName && matchesFilters;
      card.hidden = !matches;
      if (matches) visibleCards.push(card);
    }

    for (const card of cards) {
      card.classList.remove("is-last-odd");
    }

    if (visibleCards.length % 2 === 1) {
      visibleCards[visibleCards.length - 1].classList.add("is-last-odd");
    }

    const hasFilters = filters.length > 0;
    count.textContent =
      query || hasFilters
        ? `找到 ${visibleCards.length} 双`
        : `共 ${cards.length} 双`;

    emptyState.hidden = visibleCards.length !== 0;
    if (visibleCards.length === 0) {
      emptyTitle.textContent = emptyMessage(rawQuery.trim(), hasFilters);
    }

    clearButton.hidden = rawQuery.length === 0;
    updateFilterBadge(filters);
  };

  const clearSearch = () => {
    input.value = "";
    applyFilter();
    input.focus();
  };

  const clearFilters = () => {
    for (const item of filterInputs) {
      item.checked = false;
    }
    applyFilter();
  };

  const resetAll = () => {
    input.value = "";
    for (const item of filterInputs) {
      item.checked = false;
    }
    applyFilter();
    setFilterOpen(false);
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
  resetButton.addEventListener("click", resetAll);

  for (const item of filterInputs) {
    item.addEventListener("change", applyFilter);
  }

  filterToggle.addEventListener("click", () => {
    setFilterOpen(filterPanel.hidden);
  });

  filterClose.addEventListener("click", () => {
    setFilterOpen(false);
    filterToggle.focus();
  });

  filterApply.addEventListener("click", () => {
    setFilterOpen(false);
    filterToggle.focus();
  });

  filterReset.addEventListener("click", clearFilters);

  filterPanel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setFilterOpen(false);
      filterToggle.focus();
    }
  });

  applyFilter();
})();

(() => {
  const homeView = document.querySelector("#home-view");
  const brandsView = document.querySelector("#brands-view");
  if (!homeView || !brandsView) return;

  const brandsHero = document.querySelector("#brands-hero");
  const brandIndex = document.querySelector("#brand-index");
  const brandDetail = document.querySelector("#brand-detail");
  const brandDetailIcon = document.querySelector("#brand-detail-icon");
  const brandDetailTitle = document.querySelector("#brand-detail-title");
  const brandDetailMeta = document.querySelector("#brand-detail-meta");
  const brandModels = document.querySelector("#brand-models");
  const navLinks = [...document.querySelectorAll("[data-view-link]")];

  const BRANDS = {
    jordan: { name: "Jordan" },
    nike: { name: "Nike" },
    adidas: { name: "Adidas" },
    lining: { name: "李宁" },
  };

  const BRAND_ALIASES = {
    Jordan: "jordan",
    Nike: "nike",
    Adidas: "adidas",
    "李宁": "lining",
  };

  const cards = [...document.querySelectorAll("#shoe-grid .shoe-card")];
  const brandCards = [...document.querySelectorAll(".brand-card")];
  const brandCardMap = new Map(
    brandCards.map((card) => [card.dataset.brand, card]),
  );
  const defaultTitle = document.title;

  const brandKeysFor = (card) =>
    (card.dataset.brand || "")
      .split(",")
      .map((value) => BRAND_ALIASES[value.trim()] || value.trim().toLowerCase())
      .filter(Boolean);

  const modelsFor = (key) =>
    cards.filter((card) => brandKeysFor(card).includes(key));

  const modelsByBrand = new Map(
    Object.keys(BRANDS).map((key) => [key, modelsFor(key)]),
  );

  for (const card of brandCards) {
    const models = modelsByBrand.get(card.dataset.brand) || [];
    const count = card.querySelector("[data-brand-count]");
    if (count) count.textContent = `${models.length} 款鞋型`;
  }

  const createModelTile = (card) => {
    const titleNode = card.querySelector(".card-title");
    const imageNode = card.querySelector(".card-media img");
    const average = card.querySelector(".avg-badge b")?.textContent.trim() ?? "—";
    const title = titleNode?.textContent.trim() ?? "球鞋";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "brand-model";
    button.setAttribute("aria-label", `${title}：查看详情`);
    button.setAttribute("aria-haspopup", "dialog");

    const media = document.createElement("span");
    media.className = "brand-model-media";

    const image = document.createElement("img");
    image.src = imageNode.currentSrc || imageNode.src;
    image.alt = imageNode.alt;
    image.loading = "lazy";
    image.decoding = "async";
    if (card.querySelector(".card-media--ae2")) {
      image.classList.add("is-bright");
    }

    media.append(image);

    const info = document.createElement("span");
    info.className = "brand-model-info";

    const name = document.createElement("span");
    name.className = "brand-model-name";
    name.textContent = title;

    const score = document.createElement("span");
    score.className = "brand-model-score";
    score.textContent = `平均 ${average}`;

    info.append(name, score);
    button.append(media, info);

    button.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("shoe:open", {
          detail: { cardId: titleNode?.id, trigger: button },
        }),
      );
    });

    return button;
  };

  const scrollTop = () => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = previous;
  };

  const showView = (view) => {
    homeView.hidden = view !== "home";
    brandsView.hidden = view !== "brands";

    for (const link of navLinks) {
      if (link.dataset.viewLink === view) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };

  const showBrandIndex = () => {
    brandsHero.hidden = false;
    brandIndex.hidden = false;
    brandDetail.hidden = true;
    document.title = "品牌分类 · 422球鞋网";
  };

  const showBrandDetail = (key) => {
    const brand = BRANDS[key];
    const brandCard = brandCardMap.get(key);
    const models = modelsByBrand.get(key) || [];

    if (!brand || !brandCard) return false;

    const sourceIcon = brandCard.querySelector(".brand-icon");
    brandsHero.hidden = true;
    brandIndex.hidden = true;
    brandDetail.hidden = false;

    brandDetailIcon.className = `${sourceIcon.className} brand-icon--detail`;
    brandDetailIcon.innerHTML = sourceIcon.innerHTML;
    brandDetailTitle.textContent = brand.name;

    const average = models.length
      ? models.reduce(
          (total, card) =>
            total +
            (Number(card.querySelector(".avg-badge b")?.textContent) || 0),
          0,
        ) / models.length
      : 0;

    brandDetailMeta.textContent = models.length
      ? `${models.length} 款鞋型 · 平均 ${average.toFixed(1)} 分`
      : "暂无鞋款";

    brandModels.replaceChildren(...models.map(createModelTile));
    document.title = `${brand.name} · 品牌分类 · 422球鞋网`;
    return true;
  };

  const route = () => {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));

    if (hash.startsWith("brand/")) {
      const key = hash.slice("brand/".length);
      showView("brands");

      if (!showBrandDetail(key)) {
        showBrandIndex();
        history.replaceState(null, "", "#brands");
      }

      scrollTop();
      return;
    }

    if (hash === "brands") {
      showView("brands");
      showBrandIndex();
      scrollTop();
      return;
    }

    if (hash === "top") {
      scrollTop();
      return;
    }

    showView("home");
    document.title = defaultTitle;

    if (hash === "home") {
      scrollTop();
      return;
    }

    if (!hash) return;

    const target = document.getElementById(hash);
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ block: "start" }),
      );
    }
  };

  window.addEventListener("hashchange", route);
  route();
})();
