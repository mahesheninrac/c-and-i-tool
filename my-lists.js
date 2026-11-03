/* "My Lists" page, the Create / Edit list modal and the list pages. Needs common.js (ListsStore, esc, icon, toast).
   Lists are saved in localStorage and shown as children of "My Lists" under Track in the sidebar (common.js).
   MyLists.mount({ current: () => section, goto: id => open section, rerender: () => redraw the page,
                   companies: ids => company objects, card: company => card html, loading: () => bool })
   MyLists.actionsHtml(id, name) -> the star + "Add to list" buttons for a company card */
const MyLists = (() => {
  const MAX_WORDS = 200;
  let opts = { current: () => "", goto: id => { location.href = "index.html?section=" + id; }, rerender: () => { } };
  let query = "", editing = null, opener = null, menuEl = null, root, nameEl, descEl;
  let pendingEntry = null, alMenu = null, alBtn = null, alEntry = null;   /* "Add to list" popover state */
  const $ = id => document.getElementById(id);
  const words = s => (s.trim().match(/\S+/g) || []).length;
  const handles = s => s === "my-list" || !!listOf(s);
  const countText = n => `${n} ${n === 1 ? "entry" : "entries"}`;

  /* ---------- page markup ---------- */
  const cardHtml = l => `
    <article class="ml-card${l.default ? " ml-card--default" : ""}" data-ml-open="${esc(l.id)}">
      <div class="ml-card__top">
        <h2 class="ml-card__title">${l.default ? icon("star") : ""}<a href="index.html?section=list-${esc(l.id)}">${esc(l.name)}</a></h2>
        ${l.default ? "" : `<button type="button" class="icon-btn" data-ml-gear="${esc(l.id)}" aria-label="Options for ${esc(l.name)}" aria-haspopup="menu" aria-expanded="false">${icon("settings")}</button>`}
      </div>
      <p class="ml-card__date">${icon("calendar")}Last Updated: ${ListsStore.fmt(l.updated)}</p>
      <p class="ml-card__desc">${l.description ? esc(l.description) : '<span class="ml-muted">No description</span>'}</p>
      <div class="ml-card__foot"><span>${countText(l.entries.length)}</span></div>
    </article>`;
  const addCardHtml = () => `
    <article class="ml-card ml-card--add">
      <span class="ml-add__icon" aria-hidden="true">${icon("plus-circle")}</span>
      <h2>Add New List</h2>
      <p>Create a new list to get started.</p>
      <button type="button" class="btn btn-primary" data-ml-create>${icon("plus")}Create New List</button>
    </article>`;
  function gridHtml() {
    const q = query.trim().toLowerCase();
    const shown = ListsStore.all().filter(l => !q || (l.name + " " + l.description).toLowerCase().includes(q));
    return (shown.length || !q ? shown.map(cardHtml).join("") : '<p class="ml-none">No lists match your search.</p>') + addCardHtml();
  }
  const pageHtml = () => `
    <section class="ml" aria-labelledby="mlTitle">
      <header class="ml-bar">
        <h1 class="ml-bar__title" id="mlTitle">${icon("list-plus")}My Lists</h1>
        <div class="ml-bar__tools">
          <label class="field ml-search"><span class="sr">Search your lists</span>${icon("search")}<input class="input" id="mlSearch" type="search" placeholder="Search your list" value="${esc(query)}" autocomplete="off"></label>
          <button type="button" class="btn btn-primary" data-ml-create>${icon("plus")}Create New List</button>
        </div>
      </header>
      <div class="ml-grid" id="mlGrid">${gridHtml()}</div>
    </section>`;
  function entriesHtml(l) {
    if (!l.entries.length) return `<div class="empty">${icon("inbox")}<h3>No entries yet</h3><p>Use the star or "Add to list" on a company card to add it here.</p></div>`;
    if (opts.loading && opts.loading()) return '<p class="ml-muted">Loading companies…</p>';
    const items = opts.companies && opts.card ? opts.companies(l.entries) : [], missing = l.entries.length - items.length;
    return (items.length ? `<div class="grid">${items.map(opts.card).join("")}</div>` : "") + (missing ? `<p class="ml-muted">${missing} saved ${missing === 1 ? "entry is" : "entries are"} not in the current data.</p>` : "");
  }
  function detailHtml(section) {
    const l = listOf(section);
    const back = `<nav class="crumbs" aria-label="Breadcrumb"><a class="back" href="index.html?section=my-list" data-ml-back>${icon("chevleft")}My Lists</a></nav>`;
    if (!l) return `<section class="ml">${back}<div class="empty"><h3>List not found</h3><p>It may have been deleted.</p></div></section>`;
    return `
      <section class="ml" aria-labelledby="mlTitle">
        ${back}
        <header class="ml-bar">
          <h1 class="ml-bar__title" id="mlTitle">${l.default ? icon("star") : ""}${esc(l.name)}</h1>
          ${l.default ? "" : `<div class="ml-bar__tools"><button type="button" class="btn" data-ml-edit="${esc(l.id)}">Edit list</button><button type="button" class="btn ml-danger" data-ml-delete="${esc(l.id)}">Delete list</button></div>`}
        </header>
        <p class="ml-card__date">${icon("calendar")}Last Updated: ${ListsStore.fmt(l.updated)} · ${countText(l.entries.length)}</p>
        ${l.description ? `<p class="ml-detail__desc">${esc(l.description)}</p>` : ""}
        ${entriesHtml(l)}
      </section>`;
  }
  const html = section => section === "my-list" ? pageHtml() : detailHtml(section);

  /* ---------- create / edit modal ---------- */
  const modalHtml = () => `
    <div class="lm" id="listModal" hidden>
      <div class="lm__panel" role="dialog" aria-modal="true" aria-labelledby="lmTitle">
        <header class="lm__head"><h2 id="lmTitle">Create New List</h2><button type="button" class="lm__close" id="lmClose" aria-label="Close">${icon("x")}</button></header>
        <form class="lm__form" id="lmForm" novalidate>
          <div class="lm__field">
            <label for="lmName">Name<span class="req" aria-hidden="true">*</span></label>
            <input class="lm__input" id="lmName" name="name" type="text" maxlength="60" placeholder="Name your list" autocomplete="off" required aria-describedby="lmNameErr">
            <p class="lm__err" id="lmNameErr" hidden></p>
          </div>
          <div class="lm__field">
            <label for="lmDesc">Description<span class="opt">(Optional)</span></label>
            <textarea class="lm__textarea" id="lmDesc" name="description" placeholder="A short note to remind you what's in this list." aria-describedby="lmCount"></textarea>
            <p class="lm__count" id="lmCount">0/${MAX_WORDS} words</p>
          </div>
          <button type="submit" class="btn btn-primary lm__submit" id="lmSubmit">Create List</button>
        </form>
      </div>
    </div>`;
  function updateCount() {
    const n = words(descEl.value), over = n > MAX_WORDS;
    $("lmCount").textContent = `${n}/${MAX_WORDS} words` + (over ? ". Please shorten it." : "");
    $("lmCount").classList.toggle("is-over", over);
    descEl.setAttribute("aria-invalid", String(over));
    return !over;
  }
  function nameError(msg) { nameEl.setAttribute("aria-invalid", msg ? "true" : "false"); const p = $("lmNameErr"); p.hidden = !msg; p.textContent = msg || ""; return !msg; }
  function openModal(id, entryId) {
    pendingEntry = entryId || null;
    editing = id ? ListsStore.get(id) : null;
    opener = document.activeElement;
    $("lmTitle").textContent = editing ? "Edit List" : "Create New List";
    $("lmSubmit").textContent = editing ? "Save Changes" : "Create List";
    nameEl.value = editing ? editing.name : ""; descEl.value = editing ? editing.description : "";
    nameError(""); updateCount();
    root.hidden = false; document.body.classList.add("sm-lock"); nameEl.focus();
  }
  function closeModal() {
    if (root.hidden) return;
    root.hidden = true; document.body.classList.remove("sm-lock"); pendingEntry = null;
    if (opener && document.contains(opener) && opener.focus) opener.focus();
  }
  function submit(e) {
    e.preventDefault();
    const name = nameEl.value.trim();
    const ok = nameError(!name ? "Enter a name for your list." : ListsStore.taken(name, editing && editing.id) ? "You already have a list with this name." : "");
    const okDesc = updateCount();
    if (!ok) { nameEl.focus(); return; }
    if (!okDesc) { descEl.focus(); return; }
    if (editing) { ListsStore.update(editing.id, { name, description: descEl.value }); toast("List updated."); }
    else {
      const l = ListsStore.add({ name, description: descEl.value });
      if (pendingEntry) { ListsStore.addEntry(l.id, pendingEntry); toast("List created and company added."); } else toast("List created.");
    }
    closeModal(); if (!pendingEntry) opener = null;
    if (handles(opts.current())) opts.rerender();
  }

  /* ---------- card options menu (edit / delete) ---------- */
  function closeMenu() {
    if (!menuEl) return;
    const g = menuEl.previousElementSibling; if (g) g.setAttribute("aria-expanded", "false");
    menuEl.remove(); menuEl = null;
  }
  function toggleMenu(btn) {
    const same = menuEl && menuEl.previousElementSibling === btn; closeMenu(); if (same) return;
    const id = esc(btn.dataset.mlGear);
    btn.insertAdjacentHTML("afterend", `<div class="ml-menu" role="menu"><button type="button" role="menuitem" data-ml-edit="${id}">Edit list</button><button type="button" role="menuitem" class="ml-danger" data-ml-delete="${id}">Delete list</button></div>`);
    menuEl = btn.nextElementSibling; btn.setAttribute("aria-expanded", "true"); menuEl.querySelector("button").focus();
  }
  function remove(id) {
    const l = ListsStore.get(id); if (!l) return;
    if (!window.confirm(`Delete "${l.name}"? This can't be undone.`)) return;
    const wasOpen = opts.current() === "list-" + id;
    ListsStore.remove(id); toast("List deleted.");
    if (wasOpen) opts.goto("my-list"); else opts.rerender();
  }

  /* ---------- star (Watchlist) and "Add to list" on company cards ---------- */
  function actionsHtml(id, name) {
    const on = ListsStore.has("watchlist", id), n = esc(name);
    return `<button type="button" class="al-star${on ? " is-on" : ""}" data-ml-star="${esc(id)}" data-name="${n}" aria-pressed="${on}" aria-label="${on ? "Remove " + n + " from" : "Add " + n + " to"} Watchlist" data-tip="${on ? "Remove from Watchlist" : "Add to Watchlist"}" data-tip-pos="bottom">${icon("star")}</button>`
      + `<button type="button" class="al-add" data-ml-addto="${esc(id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Add ${n} to a list">Add to list</button>`;
  }
  function syncStars(id) {
    const on = ListsStore.has("watchlist", id);
    document.querySelectorAll(`[data-ml-star="${id}"]`).forEach(b => {
      const n = b.dataset.name;
      b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", `${on ? "Remove " + n + " from" : "Add " + n + " to"} Watchlist`);
      b.dataset.tip = on ? "Remove from Watchlist" : "Add to Watchlist";
      if (typeof Tooltip !== "undefined" && b === document.activeElement || b.matches(":hover")) Tooltip.show(b);
    });
  }
  function refreshIfOpen(listId) {   /* the list page that is open lost or gained a company */
    if (opts.current() === "list-" + listId) { closeAddMenu(false); opts.rerender(); }
  }
  function toggleWatch(id) {
    const on = ListsStore.toggle("watchlist", id);
    syncStars(id); toast(on ? "Added to Watchlist." : "Removed from Watchlist."); refreshIfOpen("watchlist");
  }
  const addMenuHtml = id => {
    const mine = ListsStore.all().filter(l => !l.default);
    return `<div class="al-menu" role="menu" aria-label="Add to list"><p class="al-menu__title">Add to list</p>
      ${mine.length ? `<ul class="al-menu__list">${mine.map(l => `<li><button type="button" role="menuitemcheckbox" class="al-item" aria-checked="${ListsStore.has(l.id, id)}" data-al-list="${esc(l.id)}"><span class="al-check">${icon("check")}</span><span class="al-name">${esc(l.name)}</span></button></li>`).join("")}</ul>` : '<p class="al-empty">You have not created any lists yet.</p>'}
      <button type="button" class="al-create" data-al-new>${icon("plus")}Create new list</button></div>`;
  };
  function closeAddMenu(refocus) {
    if (!alMenu) return;
    alMenu.remove(); alMenu = null;
    if (alBtn) { alBtn.setAttribute("aria-expanded", "false"); if (refocus) alBtn.focus(); }
    alBtn = null; alEntry = null;
  }
  function openAddMenu(btn) {
    const same = alBtn === btn; closeAddMenu(false); if (same) return;
    alEntry = btn.dataset.mlAddto; alBtn = btn; btn.setAttribute("aria-expanded", "true");
    document.body.insertAdjacentHTML("beforeend", addMenuHtml(alEntry)); alMenu = document.body.lastElementChild;
    const r = btn.getBoundingClientRect(), w = alMenu.offsetWidth, h = alMenu.offsetHeight;
    alMenu.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
    alMenu.style.top = (r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6) + "px";
    alMenu.querySelector("button").focus();
  }
  function toggleMember(btn) {
    const listId = btn.dataset.alList, l = ListsStore.get(listId); if (!l) return;
    const on = ListsStore.toggle(listId, alEntry);
    btn.setAttribute("aria-checked", String(on)); toast(on ? `Added to ${l.name}.` : `Removed from ${l.name}.`);
    refreshIfOpen(listId);
  }

  function mount(o) {
    if ($("listModal")) return;
    opts = Object.assign(opts, o || {});
    document.body.insertAdjacentHTML("beforeend", modalHtml());
    root = $("listModal"); nameEl = $("lmName"); descEl = $("lmDesc");
    $("lmForm").addEventListener("submit", submit);
    $("lmClose").addEventListener("click", closeModal);
    root.addEventListener("mousedown", e => { if (e.target === root) closeModal(); });
    descEl.addEventListener("input", updateCount);
    nameEl.addEventListener("input", () => { if (nameEl.getAttribute("aria-invalid") === "true") nameError(""); });
    root.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
      if (e.key === "Tab") {   /* keep focus inside the dialog */
        const f = [...root.querySelectorAll("input, textarea, button")], first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && menuEl) { const g = menuEl.previousElementSibling; closeMenu(); if (g) g.focus(); } });
    document.addEventListener("input", e => { if (e.target.id === "mlSearch") { query = e.target.value; const g = $("mlGrid"); if (g) g.innerHTML = gridHtml(); } });
    document.addEventListener("keydown", e => {   /* "Add to list" popover keyboard support */
      if (!alMenu) return;
      if (e.key === "Escape") { e.preventDefault(); closeAddMenu(true); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const b = [...alMenu.querySelectorAll("button")], i = b.indexOf(document.activeElement);
        e.preventDefault(); b[(i + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length].focus();
      } else if (e.key === "Tab") closeAddMenu(false);
    });
    window.addEventListener("scroll", e => { if (alMenu && !alMenu.contains(e.target)) closeAddMenu(false); }, true);
    window.addEventListener("resize", () => closeAddMenu(false));
    document.addEventListener("click", e => {
      const t = e.target;
      const star = t.closest("[data-ml-star]"); if (star) { toggleWatch(star.dataset.mlStar); return; }
      const addTo = t.closest("[data-ml-addto]"); if (addTo) { openAddMenu(addTo); return; }
      const member = t.closest("[data-al-list]"); if (member) { toggleMember(member); return; }
      if (t.closest("[data-al-new]")) { const id = alEntry; closeAddMenu(false); openModal(null, id); return; }
      if (alMenu && !t.closest(".al-menu")) closeAddMenu(false);
      const gear = t.closest("[data-ml-gear]"); if (gear) { toggleMenu(gear); return; }
      const ed = t.closest("[data-ml-edit]"); if (ed) { closeMenu(); openModal(ed.dataset.mlEdit); return; }
      const del = t.closest("[data-ml-delete]"); if (del) { closeMenu(); remove(del.dataset.mlDelete); return; }
      if (menuEl && !t.closest(".ml-menu")) closeMenu();
      if (t.closest("[data-ml-create]")) { openModal(); return; }
      if (t.closest("[data-ml-back]")) { e.preventDefault(); opts.goto("my-list"); return; }
      const title = t.closest(".ml-card__title a");
      if (title) { e.preventDefault(); opts.goto("list-" + title.closest(".ml-card").dataset.mlOpen); return; }
      const card = t.closest(".ml-card[data-ml-open]");
      if (card && !t.closest("a, button")) opts.goto("list-" + card.dataset.mlOpen);
    });
  }
  return { mount, handles, html, actionsHtml };
})();