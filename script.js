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
  const filterSteps = [...filterPanel.querySelectorAll(".filter-step")];
  const filterInputs = [
    ...filterPanel.querySelectorAll('input[type="checkbox"]'),
  ];
  const filterProgress = document.querySelector("#shoe-filter-progress");
  const filterProgressBar = document.querySelector("#shoe-filter-progress-bar");
  const filterProgressText = document.querySelector("#shoe-filter-progress-text");
  const filterTitle = document.querySelector("#shoe-filter-title");
  const filterStepLabel = document.querySelector("#shoe-filter-step-label");
  const filterStepsWrap = document.querySelector("#shoe-filter-steps");
  const filterActions = document.querySelector("#shoe-filter-actions");
  const filterBack = document.querySelector("#shoe-filter-back");
  const filterSkip = document.querySelector("#shoe-filter-skip");
  const filterNext = document.querySelector("#shoe-filter-next");
  const filterComplete = document.querySelector("#shoe-filter-complete");
  const filterCompleteMeta = document.querySelector(
    "#shoe-filter-complete-meta",
  );
  const filterResults = document.querySelector("#shoe-filter-results");

  const DIMENSION_KEYS = [
    "playstyle",
    "weight",
    "budget",
    "court",
    "brand",
    "tech",
  ];

  const TOTAL_STEPS = filterSteps.length;
  const RING_LENGTH = 2 * Math.PI * 20;
  let currentStep = 0;

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
    filterSteps
      .map((step) => ({
        key: step.dataset.filterKey,
        values: [
          ...step.querySelectorAll('input[type="checkbox"]:checked'),
        ].map((item) => item.value),
      }))
      .filter((step) => step.values.length > 0);

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

  const setProgress = (completed) => {
    const ratio = TOTAL_STEPS === 0 ? 0 : completed / TOTAL_STEPS;
    const percent = Math.round(ratio * 100);
    filterProgressBar.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));
    filterProgressText.textContent = `${percent}%`;
    filterProgress.setAttribute("aria-valuenow", String(percent));
  };

  const renderStep = () => {
    filterSteps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });

    const step = filterSteps[currentStep];
    filterTitle.textContent = "定制搜索中";
    filterStepLabel.textContent = `第 ${currentStep + 1} / ${TOTAL_STEPS} 步 · ${step.dataset.label}`;
    filterBack.disabled = currentStep === 0;
    filterNext.textContent =
      currentStep === TOTAL_STEPS - 1 ? "完成" : "下一步";
    filterStepsWrap.hidden = false;
    filterActions.hidden = false;
    filterComplete.hidden = true;
    setProgress(currentStep);
  };

  const openWizard = () => {
    currentStep = 0;
    renderStep();
    setFilterOpen(true);
  };

  const completeWizard = () => {
    applyFilter();

    const filters = getActiveFilters();
    const selectedCount = filters.reduce(
      (total, step) => total + step.values.length,
      0,
    );
    const visibleCount = cards.filter((card) => !card.hidden).length;

    filterStepsWrap.hidden = true;
    filterActions.hidden = true;
    filterComplete.hidden = false;
    filterTitle.textContent = "定制完成";
    filterStepLabel.textContent = "全部维度已完成";
    filterCompleteMeta.textContent = `已选 ${selectedCount} 个条件 · 找到 ${visibleCount} 双`;
    setProgress(TOTAL_STEPS);
    requestAnimationFrame(() => filterResults.focus());
  };

  const advanceWizard = (skipCurrent) => {
    const step = filterSteps[currentStep];

    if (skipCurrent) {
      for (const item of step.querySelectorAll(
        'input[type="checkbox"]:checked',
      )) {
        item.checked = false;
      }
    }

    applyFilter();

    if (currentStep >= TOTAL_STEPS - 1) {
      completeWizard();
      return;
    }

    currentStep += 1;
    renderStep();
    requestAnimationFrame(() => {
      filterSteps[currentStep].querySelector("input")?.focus();
    });
  };

  const goBackStep = () => {
    if (currentStep === 0) return;

    currentStep -= 1;
    renderStep();
    requestAnimationFrame(() => {
      filterSteps[currentStep].querySelector("input")?.focus();
    });
  };

  const resetFilters = () => {
    for (const item of filterInputs) {
      item.checked = false;
    }

    applyFilter();
    currentStep = 0;
    renderStep();
  };

  const clearSearch = () => {
    input.value = "";
    applyFilter();
    input.focus();
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
    if (filterPanel.hidden) {
      openWizard();
    } else {
      setFilterOpen(false);
    }
  });

  filterClose.addEventListener("click", () => {
    setFilterOpen(false);
    filterToggle.focus();
  });

  filterBack.addEventListener("click", goBackStep);
  filterSkip.addEventListener("click", () => advanceWizard(true));
  filterNext.addEventListener("click", () => advanceWizard(false));
  filterReset.addEventListener("click", resetFilters);

  filterResults.addEventListener("click", () => {
    setFilterOpen(false);
    filterToggle.focus();
  });

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

(() => {
  const track = document.querySelector("#shoe-showcase-track");
  if (!track) return;

  const cards = [...document.querySelectorAll("#shoe-grid .shoe-card")];
  if (!cards.length) return;

  const createItem = (card, isClone) => {
    const titleNode = card.querySelector(".card-title");
    const imageNode = card.querySelector(".card-media img");
    const kicker = card.querySelector(".kicker").textContent.trim();
    const title = titleNode.textContent.trim();
    const average = card.querySelector(".avg-badge b").textContent.trim();
    const brand = kicker.split("·")[0].trim();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-item";
    button.setAttribute("aria-label", `${title}：查看详情`);
    if (isClone) button.tabIndex = -1;

    const thumb = document.createElement("span");
    thumb.className = "showcase-thumb";

    const image = document.createElement("img");
    image.src = imageNode.currentSrc || imageNode.src;
    image.alt = "";
    if (card.querySelector(".card-media--ae2")) {
      image.classList.add("is-bright");
    }
    thumb.append(image);

    const copy = document.createElement("span");
    copy.className = "showcase-copy";

    const name = document.createElement("span");
    name.className = "showcase-name";
    name.textContent = title;

    const meta = document.createElement("span");
    meta.className = "showcase-meta";
    meta.textContent = brand;

    copy.append(name, meta);

    const score = document.createElement("span");
    score.className = "showcase-score";

    const value = document.createElement("b");
    value.textContent = average;

    const label = document.createElement("small");
    label.textContent = "平均";

    score.append(value, label);
    button.append(thumb, copy, score);

    button.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("shoe:open", {
          detail: { cardId: titleNode.id, trigger: button },
        }),
      );
    });

    return button;
  };

  const createGroup = (isClone) => {
    const group = document.createElement("div");
    group.className = "showcase-group";
    if (isClone) group.setAttribute("aria-hidden", "true");

    for (const card of cards) {
      group.append(createItem(card, isClone));
    }

    return group;
  };

  track.replaceChildren(createGroup(false), createGroup(true));
})();

(() => {
  const stage = document.querySelector("#memory-stage");
  if (!stage) return;

  const MEMORIES = [
    {
      src: "images/memories/jordan-1998.jpg",
      kicker: "1998 · The Last Shot",
      title: "Michael Jordan",
      note: "所有压力都落在这最后一投里；时间停了一下，历史发生。",
      layout: "wide",
      position: "center 30%",
    },
    {
      src: "images/memories/kobe-2006.jpg",
      kicker: "2006 · 81 Points",
      title: "Kobe Bryant",
      note: "对猛龙砍下 81 分；极致的专注，是把一件事做到没有退路。",
      layout: "left",
      position: "center 38%",
    },
    {
      src: "images/memories/bird-1985.jpg",
      kicker: "1985 · Lakers vs Celtics",
      title: "Larry Bird",
      note: "湖凯宿敌同处一个回合；伟大的对手，也会成就彼此。",
      layout: "right",
      position: "center 45%",
    },
    {
      src: "images/memories/lebron-2016.jpg",
      kicker: "2016 · The Block",
      title: "LeBron James",
      note: "总决赛抢七，追身封盖；决定胜负的，有时是回防的那一步。",
      layout: "left",
      position: "center 35%",
    },
    {
      src: "images/memories/kawhi-2019.jpg",
      kicker: "2019 · The Buzzer Beater",
      title: "Kawhi Leonard",
      note: "抢七底角压哨，球在篮筐上弹了四下；等待也是一种意志。",
      layout: "wide",
      position: "center 45%",
    },
    {
      src: "images/memories/hongkong-court.jpg",
      kicker: "香港 · 彩虹邨",
      title: "城市里的球场",
      note: "楼宇之间留着一块球场；城市再密，也容得下日常的热爱。",
      layout: "portrait-right",
      position: "center 58%",
    },
    {
      src: "images/memories/night-court.jpg",
      kicker: "夜场 · 灯光亮着",
      title: "再打一局",
      note: "球馆熄灯之前，总还有人舍不得走；灯亮着，就还能再来。",
      layout: "portrait-left",
      position: "center 45%",
    },
    {
      src: "images/memories/community-court.jpg",
      kicker: "社区 · 看台边",
      title: "一场普通的比赛",
      note: "看台离球员只有一步；一场普通比赛，也是一次社区聚会。",
      layout: "portrait-right",
      position: "center 38%",
    },
    {
      src: "images/memories/street-jump.jpg",
      kicker: "街头 · 一次起跳",
      title: "热爱不分场地",
      note: "一个普通下午，一次全力以赴的起跳；快乐有时很简单。",
      layout: "portrait-left",
      position: "center 42%",
    },
    {
      src: "images/memories/abu-dhabi-dunk.jpg",
      kicker: "阿布扎比 · 表演赛",
      title: "篮球在世界流动",
      note: "不同城市的灯光下，篮球继续把人们连在一起。",
      layout: "wide",
      position: "center 45%",
    },
    {
      src: "images/memories/practice-solitude.jpg",
      kicker: "独处 · 球馆熄灯前",
      title: "一个人的练习",
      note: "没有观众，也要把每个动作做完；热爱先对自己成立。",
      layout: "portrait-left",
      position: "center 40%",
    },
    {
      src: "images/memories/dusk-hoop.jpg",
      kicker: "黄昏 · 篮筐剪影",
      title: "还不想走",
      note: "天色暗下来，总有人想再投最后一个；舍不得的是那口气。",
      layout: "portrait-right",
      position: "center 45%",
    },
    {
      src: "images/memories/empty-court.jpg",
      kicker: "空场 · 午后",
      title: "球场在等",
      note: "没有人来的下午，篮板也替谁守着位置；球场从不催人。",
      layout: "portrait-left",
      position: "center 45%",
    },
    {
      src: "images/memories/first-ball.jpg",
      kicker: "少年 · 第一颗球",
      title: "抱紧一点",
      note: "他抱着的也许不是球，是一个很远的梦；梦想先从手里开始。",
      layout: "portrait-right",
      position: "center 40%",
    },
    {
      src: "images/memories/street-crowd.jpg",
      kicker: "露天球场 · 社区",
      title: "一条街的观众",
      note: "场边站满了人，篮球把一条街聚在一起；比赛是大家的。",
      layout: "portrait-left",
      position: "center 45%",
    },
    {
      src: "images/memories/respect.jpg",
      kicker: "球场 · 对手之间",
      title: "比赛之外",
      note: "终场之后，还有握手和彼此看见；竞争不必带走尊重。",
      layout: "portrait-right",
      position: "center 45%",
    },
    {
      src: "images/memories/look-up.jpg",
      kicker: "仰望 · 蓝天",
      title: "继续的理由",
      note: "有时候，抬头看一眼篮筐，就够了；人需要一点向上的东西。",
      layout: "portrait-left",
      position: "center 40%",
    },
    {
      src: "images/memories/after-school.jpg",
      kicker: "放学后 · 野球场",
      title: "没有裁判的比赛",
      note: "规则是临时的，快乐不是；少年们在场上自己长大。",
      layout: "left",
      position: "center 45%",
    },
    {
      src: "images/memories/old-hoop.jpg",
      kicker: "旧篮筐 · 时间",
      title: "锈迹与裂缝",
      note: "它老了一点，但还接得住下一次出手；坚持不总是响亮。",
      layout: "portrait-right",
      position: "center 50%",
    },
    {
      src: "images/memories/last-light.jpg",
      kicker: "日落 · 最后一投",
      title: "再投一个",
      note: "天色将暗，热爱还没有收工；有些告别要拖到最后一球。",
      layout: "wide",
      position: "center 45%",
    },
    {
      src: "images/memories/accra-street.jpg",
      kicker: "阿克拉 · 街头联赛",
      title: "街道就是球场",
      note: "没有看台，整条街的人都是观众；篮球把社区围成一个圈。",
      layout: "portrait-left",
      position: "center 45%",
    },
    {
      src: "images/memories/morning-court.jpg",
      kicker: "清晨 · 空场",
      title: "第一缕光",
      note: "篮板先醒来，等一个早到的人；自律常常发生在没人看见时。",
      layout: "portrait-right",
      position: "center 45%",
    },
    {
      src: "images/memories/her-ball.jpg",
      kicker: "她与球 · 安静",
      title: "一个人的陪伴",
      note: "篮球不总是喧闹，也可以陪人坐一会儿；热爱有安静的样子。",
      layout: "left",
      position: "center 45%",
    },
    {
      src: "images/memories/wheelchair-court.jpg",
      kicker: "轮椅篮球 · 同一片场地",
      title: "想赢的心",
      note: "身体有边界，想赢的心没有；同一片场地，同样的竞争。",
      layout: "wide",
      position: "center 45%",
    },
    {
      src: "images/memories/wheelchair-joy.jpg",
      kicker: "轮椅篮球 · 笑一个",
      title: "快乐不需要定义",
      note: "球进不进都笑，下一球再来；快乐本身就很完整。",
      layout: "portrait-right",
      position: "center 40%",
    },
    {
      src: "images/memories/sky-jump.jpg",
      kicker: "街头 · 起跳",
      title: "飞一会儿",
      note: "地面留不住想往上走的人；哪怕只有一秒。",
      layout: "portrait-left",
      position: "center 40%",
    },
    {
      src: "images/memories/indoor-rhythm.jpg",
      kicker: "室内 · 球落地",
      title: "把一天收回来",
      note: "球落地的声音，替人把一天慢慢收好；明天再来。",
      layout: "left",
      position: "center 45%",
    },
  ];

  const ORDER = [
    0, 5, 1, 6, 2, 20, 3, 23, 4, 13,
    7, 10, 18, 25, 22, 11, 12, 15, 24, 17,
    14, 16, 21, 19, 26, 8, 9,
  ];
  ORDER.splice(13, 0, 0);
  ORDER.splice(24, 0, 1);

  const createSlide = (memory, index) => {
    const slide = document.createElement("div");
    slide.className = `memory-slide memory-slide--${memory.layout}`;
    slide.dataset.index = String(index);

    const frame = document.createElement("div");
    frame.className = "memory-frame";
    frame.dataset.src = memory.src;
    frame.style.backgroundPosition = memory.position;

    const copy = document.createElement("div");
    copy.className = "memory-copy";

    const kicker = document.createElement("p");
    kicker.className = "memory-kicker";
    kicker.textContent = memory.kicker;

    const title = document.createElement("p");
    title.className = "memory-title";
    title.textContent = memory.title;

    const note = document.createElement("p");
    note.className = "memory-note";
    note.textContent = memory.note;

    copy.append(kicker, title, note);
    slide.append(frame, copy);
    return slide;
  };

  const slides = ORDER.map((memoryIndex, slideIndex) =>
    createSlide(MEMORIES[memoryIndex], slideIndex),
  );

  const prepare = (index) => {
    const slide = slides[index];
    if (!slide) return;

    const frame = slide.querySelector(".memory-frame");
    if (frame && !frame.style.backgroundImage) {
      frame.style.backgroundImage = `url("${frame.dataset.src}")`;
    }
  };

  const show = (index) => {
    prepare(index);
    prepare((index + 1) % slides.length);
    prepare((index + 2) % slides.length);

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
    });
  };

  const build = () => {
    if (stage.childElementCount) return;
    stage.append(...slides);
    show(0);
  };

  build();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const homeView = document.querySelector("#home-view");
  let index = 0;

  setInterval(() => {
    if (
      document.hidden ||
      !stage.childElementCount ||
      homeView?.hidden ||
      document.documentElement.classList.contains("dialog-open")
    ) {
      return;
    }

    index = (index + 1) % slides.length;
    show(index);
  }, 6500);
})();
