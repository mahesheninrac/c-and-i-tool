/* Advanced Filter panel. It lives in the main workspace, next to the dashboard content (not beside the sidebar).
   Its fields come from FILTER_CONFIG (filter-config.js) for the active sidebar section.
   Layers:  group (+/-)  >  filter row (chevron, optional)  >  popup with options (third layer, optional).
     AdvancedFilter.mount({ section, onChange })  once, after initShell()
     AdvancedFilter.setSection(id)                when the sidebar selection changes
     AdvancedFilter.get()                         { section, values }  (see filter-config.js for value shapes)
   Also: clear(), open(), close(). Fires "advancedfilter:change" on document.
   Opened from the "Advanced Filter" button in the page header (starts closed). */
const AdvancedFilter = (() => {
  const state = { section: null, values: {} };
  const store = {};   /* values remembered per section */
  let root, trigger, badge, onChange = () => { };
  let fly = null, flyField = null, flyTrigger = null;   /* the popup (third layer) */
  const svg = (n, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const groupsFor = id => (typeof FILTER_CONFIG !== "undefined" && FILTER_CONFIG[id]) || [];
  /* every real field: items are flattened, "coming soon" items have no fields */
  const allFields = () => groupsFor(state.section).flatMap(g => g.fields.flatMap(f => f.type === "item" ? (f.soon ? [] : f.fields) : [f]));
  const fieldById = id => allFields().find(f => f.id === id);
  const q = sel => root.querySelector(sel);

  /* ---------- markup ---------- */
  const popupRowHtml = f => `<button type="button" class="af-row af-row--popup" data-popup="${f.id}" aria-haspopup="dialog" aria-expanded="false"><span class="af-row__label">${esc(f.label)}</span><span class="af-row__value" data-summary="${f.id}"></span>${svg("chevright", "af-chev")}</button>`;
  const itemHtml = f => f.soon
    ? `<div class="af-item is-soon"><div class="af-row af-row--item" aria-disabled="true" tabindex="0" data-tip="Coming soon" data-tip-pos="right"><span class="af-row__label">${esc(f.label)}</span><span class="af-soon">Soon</span></div></div>`
    : `<div class="af-item${f.open ? " is-open" : ""}" data-item="${f.id}">
         <button type="button" class="af-row af-row--item" id="af-i-${f.id}" aria-expanded="${!!f.open}" aria-controls="af-ip-${f.id}"><span class="af-row__label">${esc(f.label)}</span><span class="af-count" hidden></span>${svg("chevdown", "af-chev")}</button>
         <div class="af-item__panel" id="af-ip-${f.id}" role="region" aria-labelledby="af-i-${f.id}"><div class="af-item__inner">${f.fields.map(fieldHtml).join("")}</div></div>
       </div>`;
  function fieldHtml(f) {
    if (f.type === "item") return itemHtml(f);
    if (f.popup) return popupRowHtml(f);
    const label = esc(f.label || "Options");
    if (f.type === "select")
      return `<div class="af-field"><label class="af-field__label" for="af-f-${f.id}">${label}</label><select class="af-select" id="af-f-${f.id}" data-field="${f.id}">${f.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></div>`;
    if (f.type === "range")
      return `<div class="af-field"><span class="af-field__label" id="af-l-${f.id}">${label}</span><div class="af-range" role="group" aria-labelledby="af-l-${f.id}"><input class="af-input" type="number" inputmode="numeric" placeholder="Min" aria-label="${label} minimum" data-field="${f.id}" data-bound="min"><span aria-hidden="true">–</span><input class="af-input" type="number" inputmode="numeric" placeholder="Max" aria-label="${label} maximum" data-field="${f.id}" data-bound="max"></div></div>`;
    const type = f.type === "checkbox" ? "checkbox" : "radio";
    return `<fieldset class="af-field"><legend class="${f.label ? "af-field__label" : "sr"}">${label}</legend>${f.options.map(([v, l]) => `<label class="af-option"><input type="${type}" name="af-${f.id}" value="${esc(v)}"><span>${esc(l)}</span></label>`).join("")}</fieldset>`;
  }
  const groupHtml = g => `
    <section class="af-section${g.open ? " is-open" : ""}" data-section="${g.id}">
      <h3 class="af-section__heading">
        <button type="button" class="af-section__trigger" id="af-t-${g.id}" aria-expanded="${!!g.open}" aria-controls="af-p-${g.id}">
          ${svg(g.icon, "af-icon")}<span class="af-section__label">${esc(g.title)}</span>
          <span class="af-section__state" aria-hidden="true">${svg("plus-circle", "af-plus")}${svg("minus-circle", "af-minus")}</span>
        </button>
      </h3>
      <div class="af-section__panel" id="af-p-${g.id}" role="region" aria-labelledby="af-t-${g.id}">
        <div class="af-section__inner">${g.fields.map(fieldHtml).join("")}</div>
      </div>
    </section>`;
  const panelHtml = () => `
    <aside class="advanced-filter is-collapsed" id="advancedFilter" aria-label="Advanced filter">
      <header class="advanced-filter__header">
        <div class="advanced-filter__heading"><h2 class="advanced-filter__title">Advanced Filter</h2><p class="advanced-filter__for" id="afFor"></p></div>
        <button type="button" class="advanced-filter__clear" data-af-clear-all hidden>Clear all</button>
        <button type="button" class="advanced-filter__toggle" aria-label="Close advanced filter" title="Close advanced filter">${svg("panel")}</button>
      </header>
      <div class="advanced-filter__body" id="af-body"></div>
    </aside>`;

  /* ---------- values <-> DOM (popup fields keep their value in state, not in the DOM) ---------- */
  function readValues() {
    const v = {};
    allFields().forEach(f => {
      if (f.popup) { v[f.id] = state.values[f.id] !== undefined ? state.values[f.id] : (f.type === "checkbox" ? [] : null); return; }
      if (f.type === "select") v[f.id] = q(`select[data-field="${f.id}"]`).value || null;
      else if (f.type === "range") { const n = b => { const x = q(`input[data-field="${f.id}"][data-bound="${b}"]`).value; return x === "" ? null : Number(x); }; v[f.id] = { min: n("min"), max: n("max") }; }
      else if (f.type === "checkbox") v[f.id] = [...root.querySelectorAll(`input[name="af-${f.id}"]:checked`)].map(i => i.value);
      else { const c = q(`input[name="af-${f.id}"]:checked`); v[f.id] = c && c.value !== "" ? c.value : null; }
    });
    return v;
  }
  function writeValues(v) {
    allFields().forEach(f => {
      if (f.popup) return;
      const val = v[f.id];
      if (f.type === "select") q(`select[data-field="${f.id}"]`).value = val || "";
      else if (f.type === "range") ["min", "max"].forEach(b => { q(`input[data-field="${f.id}"][data-bound="${b}"]`).value = val && val[b] != null ? val[b] : ""; });
      else if (f.type === "checkbox") root.querySelectorAll(`input[name="af-${f.id}"]`).forEach(i => { i.checked = !!val && val.includes(i.value); });
      else root.querySelectorAll(`input[name="af-${f.id}"]`).forEach(i => { i.checked = val == null ? i.value === "" : i.value === val; });
    });
  }
  const isActive = (f, v) => { const x = v[f.id]; return f.type === "checkbox" ? !!(x && x.length) : f.type === "range" ? !!(x && (x.min != null || x.max != null)) : x != null; };
  const activeCount = v => allFields().filter(f => isActive(f, v)).length;
  const labelOf = (f, val) => { const o = f.options.find(o => o[0] === val); return o ? o[1] : val; };
  function summaryText(f, val) {
    if (f.type === "checkbox") return !val || !val.length ? "Any" : val.length === 1 ? labelOf(f, val[0]) : val.length + " selected";
    return val == null ? "Any" : labelOf(f, val);
  }
  function refreshChrome() {
    const n = activeCount(state.values);
    if (badge) { badge.textContent = n; badge.hidden = !n; }
    q("[data-af-clear-all]").hidden = !n;
    root.querySelectorAll("[data-summary]").forEach(el => {
      const f = fieldById(el.dataset.summary); if (f) el.textContent = summaryText(f, state.values[f.id]);
    });
    groupsFor(state.section).forEach(g => g.fields.forEach(it => {
      if (it.type !== "item" || it.soon) return;
      const c = q(`[data-item="${it.id}"] .af-count`), k = it.fields.filter(f => isActive(f, state.values)).length;
      if (c) { c.textContent = k; c.hidden = !k; }
    }));
  }

  function render() {
    closeFlyout(false);
    const groups = groupsFor(state.section);
    q("#af-body").innerHTML = groups.length ? groups.map(groupHtml).join("") : '<div class="af-slot"><p class="af-slot__empty">No filters configured for this section.</p></div>';
    q("#afFor").textContent = typeof sectionLabel === "function" ? sectionLabel(state.section) : state.section;
    state.values = { ...(store[state.section] || {}) };
    writeValues(state.values);
    state.values = readValues(); store[state.section] = state.values;
    refreshChrome();
    syncAvailability();
  }
  /* sections without filters: the header button is greyed out (with a tooltip) and the panel closes */
  function syncAvailability() {
    const has = groupsFor(state.section).length > 0;
    if (trigger) {
      trigger.setAttribute("aria-disabled", String(!has));
      if (has) { trigger.removeAttribute("data-tip"); trigger.removeAttribute("data-tip-pos"); }
      else { trigger.dataset.tip = "No advanced filters for this section"; trigger.dataset.tipPos = "bottom"; }
    }
    if (!has && isOpen()) setOpen(false);
  }
  function emit() {
    state.values = readValues(); store[state.section] = state.values;
    refreshChrome();
    onChange({ section: state.section, values: state.values });
    document.dispatchEvent(new CustomEvent("advancedfilter:change", { detail: { section: state.section, values: state.values } }));
  }

  /* ---------- third layer: popup with options ---------- */
  function openFlyout(btn) {
    const f = fieldById(btn.dataset.popup); if (!f) return;
    if (fly && flyTrigger === btn) { closeFlyout(true); return; }
    closeFlyout(false);
    const type = f.type === "checkbox" ? "checkbox" : "radio", cur = state.values[f.id];
    const checked = v => type === "checkbox" ? (cur || []).includes(v) : (cur == null ? v === "" : v === cur);
    fly = document.createElement("div");
    fly.className = "af-flyout"; fly.setAttribute("role", "dialog"); fly.setAttribute("aria-label", f.label);
    fly.innerHTML = `<fieldset class="af-options"><legend class="sr">${esc(f.label)}</legend>${f.options.map(([v, l]) => `<label class="af-option"><input type="${type}" name="af-fly" value="${esc(v)}"${checked(v) ? " checked" : ""}><span>${esc(l)}</span></label>`).join("")}</fieldset>`;
    root.appendChild(fly);
    flyField = f; flyTrigger = btn; btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect(), pr = root.getBoundingClientRect(), w = fly.offsetWidth, h = fly.offsetHeight;
    let left = pr.right - 4; if (left + w > innerWidth - 8) left = Math.max(8, innerWidth - w - 8);
    fly.style.left = left + "px";
    fly.style.top = Math.max(8, Math.min(r.top, innerHeight - h - 8)) + "px";
    (fly.querySelector("input:checked") || fly.querySelector("input")).focus();
  }
  function closeFlyout(refocus) {
    if (!fly) return;
    fly.remove(); fly = null;
    if (flyTrigger) { flyTrigger.setAttribute("aria-expanded", "false"); if (refocus) flyTrigger.focus(); }
    flyTrigger = flyField = null;
  }

  /* ---------- open / close ---------- */
  const shellEl = () => document.getElementById("shell");
  const drawerMq = matchMedia("(max-width:900px)");
  const isOpen = () => drawerMq.matches ? shellEl().classList.contains("af-open") : !root.classList.contains("is-collapsed");
  const syncTrigger = () => { if (trigger) trigger.setAttribute("aria-expanded", String(isOpen())); };
  function setOpen(open) {   /* desktop: show/hide the docked panel; small screens: open/close the drawer */
    const shell = shellEl();
    if (!open) closeFlyout(false);
    if (drawerMq.matches) { if (open) shell.classList.remove("open"); shell.classList.toggle("af-open", open); }
    else root.classList.toggle("is-collapsed", !open);
    syncTrigger();
  }
  function toggleBlock(el, triggerSel) {   /* group or filter row: independent expand/collapse */
    closeFlyout(false);
    const open = !el.classList.contains("is-open");
    el.classList.toggle("is-open", open);
    el.querySelector(triggerSel).setAttribute("aria-expanded", String(open));
  }
  function clearAll() { closeFlyout(false); state.values = {}; writeValues({}); emit(); }

  /* ---------- public ---------- */
  function mount(opts = {}) {
    const ws = document.getElementById("workspace"), shell = shellEl();
    if (!ws || document.getElementById("advancedFilter")) return null;
    onChange = opts.onChange || onChange;
    ws.insertAdjacentHTML("afterbegin", panelHtml());
    root = document.getElementById("advancedFilter");
    state.section = opts.section;

    const actions = document.getElementById("headerActions");
    if (actions) {
      actions.insertAdjacentHTML("beforeend", `<button type="button" class="af-trigger" id="afTrigger" aria-expanded="false" aria-controls="advancedFilter">${svg("filter")}<span class="af-trigger__label">Advanced Filter</span><span class="af-trigger__count" id="afCount" hidden>0</span></button>`);
      trigger = document.getElementById("afTrigger"); badge = document.getElementById("afCount");
      trigger.addEventListener("click", () => {
        if (trigger.getAttribute("aria-disabled") === "true") return;
        const open = !isOpen(); setOpen(open);
        if (open && drawerMq.matches) q(".advanced-filter__toggle").focus();
      });
    }
    new MutationObserver(syncTrigger).observe(shell, { attributes: true, attributeFilter: ["class"] });
    drawerMq.addEventListener("change", () => { closeFlyout(false); shell.classList.remove("af-open"); root.classList.add("is-collapsed"); syncTrigger(); });
    render();

    q("#af-body").addEventListener("scroll", () => closeFlyout(false));
    window.addEventListener("resize", () => closeFlyout(false));
    document.addEventListener("mousedown", e => { if (fly && !fly.contains(e.target) && !e.target.closest("[data-popup]")) closeFlyout(false); });

    root.addEventListener("click", e => {
      if (e.target.closest(".advanced-filter__toggle")) { setOpen(false); if (trigger) trigger.focus(); return; }
      if (e.target.closest("[data-af-clear-all]")) { clearAll(); return; }
      const p = e.target.closest("[data-popup]"); if (p) { openFlyout(p); return; }
      const it = e.target.closest("button.af-row--item"); if (it) { toggleBlock(it.closest(".af-item"), ".af-row--item"); return; }
      const t = e.target.closest(".af-section__trigger"); if (t) toggleBlock(t.closest(".af-section"), ".af-section__trigger");
    });
    root.addEventListener("change", e => {
      if (e.target.name === "af-fly") {   /* a choice made in the popup */
        const f = flyField;
        state.values[f.id] = f.type === "checkbox" ? [...fly.querySelectorAll("input:checked")].map(i => i.value) : (e.target.value || null);
        emit();
        if (f.type !== "checkbox") closeFlyout(true);
        return;
      }
      if (e.target.type !== "number") emit();
    });
    root.addEventListener("input", e => { if (e.target.type === "number") emit(); });
    root.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (fly) closeFlyout(true);
        else if (!drawerMq.matches) { setOpen(false); if (trigger) trigger.focus(); }
        return;
      }
      const t = e.target.closest(".af-section__trigger");   /* arrow-key navigation between group headers */
      if (!t || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const all = [...root.querySelectorAll(".af-section__trigger")], i = all.indexOf(t);
      const next = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
      all[next].focus(); e.preventDefault();
    });
    return root;
  }
  function setSection(id) { if (!root || id === state.section) return; state.section = id; render(); }

  return { mount, setSection, state, get: () => ({ section: state.section, values: state.values }), clear: clearAll, open: () => setOpen(true), close: () => setOpen(false) };
})();