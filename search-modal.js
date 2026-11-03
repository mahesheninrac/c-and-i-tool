/* Global search modal: opened from the sidebar search field or Ctrl/Cmd + K.
   Needs common.js (esc, icon, initials, normalize, loadRecords, detailsUrl, NAV_LEAVES).
   Edit SUGGESTIONS, TRENDING and DISCOMS below. TRENDING keys: "discom:<code>", "section:<id>", "company:<id>". */
const SearchModal = (() => {
  const SUGGESTIONS = [
    "Discoms",
    "Open access",
    "BESS",
    "Substation",
    "Industrial",
  ];
  const TRENDING = [
    "discom:MSEDCL",
    "discom:BESCOM",
    "section:openaccess",
    "section:radar",
    "discom:UGVCL",
  ];
  const DISCOMS = [
    /* [code, full name, state] */
    ["MSEDCL", "Maharashtra State Electricity Distribution Co.", "Maharashtra"],
    ["BESCOM", "Bangalore Electricity Supply Company", "Karnataka"],
    ["TNPDCL", "Tamil Nadu Power Distribution Corporation", "Tamil Nadu"],
    ["TGSPDCL", "Southern Power Distribution Co. of Telangana", "Telangana"],
    ["UGVCL", "Uttar Gujarat Vij Company", "Gujarat"],
    ["DGVCL", "Dakshin Gujarat Vij Company", "Gujarat"],
    ["MGVCL", "Madhya Gujarat Vij Company", "Gujarat"],
    ["PGVCL", "Paschim Gujarat Vij Company", "Gujarat"],
    ["JVVNL", "Jaipur Vidyut Vitran Nigam", "Rajasthan"],
    [
      "WBSEDCL",
      "West Bengal State Electricity Distribution Co.",
      "West Bengal",
    ],
    [
      "APEPDCL",
      "Andhra Pradesh Eastern Power Distribution Co.",
      "Andhra Pradesh",
    ],
    [
      "APSPDCL",
      "Andhra Pradesh Southern Power Distribution Co.",
      "Andhra Pradesh",
    ],
    ["BRPL", "BSES Rajdhani Power", "Delhi"],
    ["BYPL", "BSES Yamuna Power", "Delhi"],
    ["TPDDL", "Tata Power Delhi Distribution", "Delhi"],
  ];
  const TYPE = { company: "Company", discom: "Discom", section: "Section" };
  const byKey = new Map();
  let index = [],
    current = [],
    active = -1,
    opened = false,
    loaded = false,
    root,
    input,
    body,
    trigger;

  const logoIcon = (n) => `<span class="sm-logo">${icon(n)}</span>`;
  const logoInit = (i) =>
    `<span class="sm-logo sm-logo--init" style="background:linear-gradient(135deg,hsl(${i.hue} 62% 42%),hsl(${(i.hue + 40) % 360} 62% 32%))" aria-hidden="true">${esc(initials(i.name))}</span>`;
  function add(key, type, title, sub, href, logo, extra, section, soon) {
    const e = {
      key,
      type,
      title,
      sub,
      href,
      logo,
      section: section || null,
      soon: !!soon,
      hay: [title, sub, extra || "", type].join(" ").toLowerCase(),
    };
    index.push(e);
    byKey.set(key, e);
  }
  function buildStatic() {
    NAV_LEAVES.forEach((l) =>
      add(
        "section:" + l.id,
        "section",
        l.label,
        l.trail.join(" › "),
        "index.html?section=" + l.id,
        logoIcon(l.icon),
        "",
        l.id,
        l.soon,
      ),
    );
    DISCOMS.forEach(([code, full, state]) =>
      add(
        "discom:" + code,
        "discom",
        code,
        full + " · " + state,
        "index.html?section=discom",
        logoIcon("bolt"),
        "",
        "discom",
      ),
    );
  }
  function setCompanies(records) {
    index = index.filter((e) => e.type !== "company");
    [...byKey.keys()]
      .filter((k) => k.startsWith("company:"))
      .forEach((k) => byKey.delete(k));
    records
      .map(normalize)
      .forEach((i) =>
        add(
          "company:" + i.id,
          "company",
          i.name,
          [i.vertical, i.city].filter(Boolean).join(" · ") || "Company",
          detailsUrl(i),
          logoInit(i),
          [i.group, i.ciType, i.companyType, i.address]
            .filter(Boolean)
            .join(" "),
        ),
      );
  }

  /* ---------- searching ---------- */
  function score(e, q) {
    const t = e.title.toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.split(/[\s/()&.,-]+/).some((w) => w.startsWith(q))) return 60;
    if (e.hay.includes(q)) return 40;
    const toks = q.split(/\s+/).filter(Boolean);
    const has = (k) =>
      e.hay.includes(k) ||
      (k.length > 3 && k.endsWith("s") && e.hay.includes(k.slice(0, -1)));
    return toks.length && toks.every(has) ? 30 : 0;
  }
  const search = (q) =>
    index
      .map((e) => [score(e, q), e])
      .filter((x) => x[0] > 0)
      .sort((a, b) => b[0] - a[0] || a[1].title.localeCompare(b[1].title))
      .slice(0, 20)
      .map((x) => x[1]);

  /* ---------- rendering ---------- */
  const itemHtml = (e, i) =>
    `<a class="sm-item${e.soon ? " is-soon" : ""}" role="option" id="sm-o-${i}" href="${esc(e.href)}" data-idx="${i}" aria-selected="false"${e.soon ? ' aria-disabled="true"' : ""}>${e.logo}<span class="sm-item__text"><span class="sm-item__title">${esc(e.title)}</span><span class="sm-item__sub">${esc(e.sub)}</span></span><span class="sm-tag sm-tag--${e.type}">${e.soon ? "Coming soon" : TYPE[e.type]}</span></a>`;
  function setActive(i) {
    active = i;
    body.querySelectorAll(".sm-item").forEach((a, n) => {
      a.classList.toggle("is-active", n === i);
      a.setAttribute("aria-selected", String(n === i));
    });
    if (i >= 0) {
      input.setAttribute("aria-activedescendant", "sm-o-" + i);
      const el = body.querySelector("#sm-o-" + i);
      if (el) el.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }
  function renderHome() {
    current = TRENDING.map((k) => byKey.get(k)).filter(Boolean);
    body.innerHTML = `<div class="sm-cols">
      <section class="sm-col sm-col--sug" aria-label="Suggestions"><h3 class="sm-h">Suggestions</h3><div class="sm-chips">${SUGGESTIONS.map((s) => `<button type="button" class="sm-chip" data-chip="${esc(s)}">${esc(s)}</button>`).join("")}</div></section>
      <section class="sm-col" aria-label="Trending"><h3 class="sm-h">Trending</h3><div class="sm-list" id="sm-list" role="listbox" aria-label="Trending">${current.map(itemHtml).join("")}</div></section>
    </div>`;
    setActive(-1);
  }
  function renderResults(q) {
    current = search(q.toLowerCase());
    body.innerHTML = current.length
      ? `<section class="sm-results" aria-label="Results"><h3 class="sm-h">Results <span>${current.length}</span></h3><div class="sm-list" id="sm-list" role="listbox" aria-label="Search results">${current.map(itemHtml).join("")}</div></section>`
      : `<div class="sm-empty"><p><strong>No results for “${esc(q)}”</strong></p><p>Try a company, discom or section name.</p></div>`;
    setActive(current.length ? 0 : -1);
  }
  function run() {
    const q = input.value.trim();
    if (q) renderResults(q);
    else renderHome();
  }

  /* ---------- open / close ---------- */
  function open() {
    if (opened) return;
    opened = true;
    const shell = document.getElementById("shell");
    if (shell) shell.classList.remove("open", "af-open");
    root.hidden = false;
    document.body.classList.add("sm-lock");
    input.value = "";
    renderHome();
    input.focus();
    if (!loaded) {
      loaded = true;
      loadRecords()
        .then((r) => {
          setCompanies(r);
          if (opened) run();
        })
        .catch(() => { });
    }
  }
  function close(returnFocus = true) {
    if (!opened) return;
    opened = false;
    root.hidden = true;
    document.body.classList.remove("sm-lock");
    if (returnFocus && trigger) trigger.focus();
  }
  function go(e) {
    if (e.soon) return; /* "Coming soon" entries are listed but not openable */
    close(false);
    if (e.section && typeof window.openSection === "function")
      window.openSection(
        e.section,
      ); /* stay on the page when index.html is open */
    else location.href = e.href;
  }

  function mount() {
    if (document.getElementById("searchModal")) return;
    buildStatic();
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div class="sm" id="searchModal" hidden>
        <div class="sm__panel" role="dialog" aria-modal="true" aria-label="Search">
          <div class="sm__bar">
            ${icon("search")}
            <input class="sm__input" id="smInput" type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="sm-list" placeholder="Search companies, discoms, sections…" autocomplete="off" spellcheck="false">
            <button type="button" class="sm__esc" id="smClose" aria-label="Close search">Esc</button>
          </div>
          <div class="sm__body" id="smBody"></div>
        </div>
      </div>`,
    );
    root = document.getElementById("searchModal");
    input = document.getElementById("smInput");
    body = document.getElementById("smBody");
    trigger = document.getElementById("sideSearch");
    if (trigger) trigger.addEventListener("click", open);
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    });
    document.getElementById("smClose").addEventListener("click", () => close());
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) close();
    });
    input.addEventListener("input", run);
    body.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-chip]");
      if (chip) {
        input.value = chip.dataset.chip;
        run();
        input.focus();
        return;
      }
      const a = e.target.closest(".sm-item");
      if (a && current[+a.dataset.idx]) {
        e.preventDefault();
        go(current[+a.dataset.idx]);
      }
    });
    body.addEventListener("mousemove", (e) => {
      const a = e.target.closest(".sm-item");
      if (a && +a.dataset.idx !== active) setActive(+a.dataset.idx);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (
        e.target === input &&
        ["ArrowDown", "ArrowUp"].includes(e.key) &&
        current.length
      ) {
        e.preventDefault();
        setActive(
          e.key === "ArrowDown"
            ? (active + 1) % current.length
            : (active - 1 + current.length) % current.length,
        );
      } else if (e.target === input && e.key === "Enter") {
        const it = current[active >= 0 ? active : 0];
        if (it && (input.value.trim() || active >= 0)) {
          e.preventDefault();
          go(it);
        }
      } else if (e.key === "Tab") {
        /* keep focus inside the dialog */
        const f = [...root.querySelectorAll("input, button, a[href]")],
          first = f[0],
          last = f[f.length - 1];
        console.log(f)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
  return { mount, open, close };
})();