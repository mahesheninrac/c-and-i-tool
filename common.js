/* Shared by index.html and details.html: helpers, data loading, record mapping and the page shell */
const DATA_URL = "./ec_projects.json";

const detailsUrl = (i, tab) =>
  "details.html?id=" + encodeURIComponent(i.id) + (tab ? "&tab=" + tab : "");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      c
      ],
  );
const icon = (n) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const initials = (n) =>
  n
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const thumb = (i) =>
  `<span class="thumb" style="background:linear-gradient(135deg,hsl(${i.hue} 62% 42%),hsl(${(i.hue + 40) % 360} 62% 32%))" aria-hidden="true">${initials(i.name)}</span>`;
const NA = '<span class="na" title="Not available in source data">—</span>';
const val = (v) => (v == null || v === "" ? NA : esc(v));
const coords = (i) =>
  i.lat != null && i.lng != null
    ? `${i.lat.toFixed(4)}, ${i.lng.toFixed(4)}`
    : '<span class="na">Lat, Long —</span>';
const ciBadge = (t) =>
  `<span class="badge ${t === "Commercial" ? "s-comm" : "s-ind"}">${esc(t)}</span>`;
const esgBadge = (v) =>
  `<span class="badge ${v === "Applicable" ? "s-active" : "s-archived"}">${esc(v)}</span>`;
const yn = (b) => (b ? "Yes" : "No");
const mapLink = (i) =>
  `<a class="map-link" href="${detailsUrl(i, "map")}" aria-label="View ${esc(i.name)} on map">${icon("pin")}Map</a>`;

/* Maps one scraped record to the card model */
function normalize(rec) {
  const d = rec.data || {},
    e = rec.enrichment || {};
  const c = (v) =>
    v == null || String(v).trim() === "" ? null : String(v).trim();
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const title = (s) =>
    s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
  const cap = (s) => s.split(/\s+/).slice(0, 30).join(" ");
  const name = c(d.company_name) || c(d.project_name) || "Unnamed company";
  const address = c(d.registered_address);
  const parts = address
    ? address
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
    : [];
  const city =
    c(e.city) || (parts.length > 1 ? title(parts[parts.length - 2]) : null);
  const act = c(d.major_project_activity);
  const m = act && act.match(/^(\d+)\s*\(\w\)\s*(.*)$/);
  const vertical = m ? m[2] : act;
  const ciType =
    c(e.ciType) || (m ? (m[1] === "8" ? "Commercial" : "Industrial") : null);
  const typeMap = {
    proprietor: "Proprietorship",
    owner: "Proprietorship",
    partner: "Partnership",
    director: "Company",
    ceo: "Company",
  };
  const companyType =
    c(e.companyType) ||
    c(d.legal_status) ||
    typeMap[(c(d.applicant_designation) || "").toLowerCase()] ||
    null;
  const contacts =
    e.contacts ??
    [
      [d.applicant_name, d.applicant_telephone, d.applicant_email],
      [
        d.eia_consultant_name,
        d.eia_consultant_mobile,
        d.eia_consultant_landline,
        d.eia_consultant_email,
      ],
    ].filter((g) => g.some((v) => c(v))).length;
  const kva = num(d.power_quantity_kva),
    men = num(d.total_manpower),
    dg = c(d.standby_dg_arrangement);
  let desc = `${vertical || "C&I consumer"} unit`;
  if (kva) desc += ` with a ${kva} kVA power requirement`;
  if (dg)
    desc += /^none$/i.test(dg) ? ", no standby DG set" : `, standby DG: ${dg}`;
  if (men) desc += ` and ${men} workers`;
  desc += ", a candidate for solar and efficient electrification.";
  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return {
    id: rec.file_id ?? rec.sno,
    name,
    group: c(e.group),
    esg:
      e.esg === true
        ? "Applicable"
        : e.esg === false
          ? "Not applicable"
          : c(e.esg),
    multi: typeof e.multi === "boolean" ? e.multi : null,
    companyType,
    ciType,
    vertical,
    city,
    contacts,
    description: cap(c(e.description) || desc),
    lat: e.lat ?? num(d.bounded_latitude_north),
    lng: e.lng ?? num(d.bounded_longitude_east),
    activity: act,
    kva,
    dg,
    manpower: men,
    cost: c(d.project_cost_crores),
    sourceUrl: c(rec.source && rec.source.url),
    applicant: {
      name: c(d.applicant_name),
      role: c(d.applicant_designation),
      phone: c(d.applicant_telephone),
      email: c(d.applicant_email),
    },
    consultant: {
      name: c(d.eia_consultant_name),
      role: "EIA consultant",
      phone: c(d.eia_consultant_mobile),
      alt: c(d.eia_consultant_landline),
      email: c(d.eia_consultant_email),
    },
    address,
    year: e.year ?? null,
    hue,
  };
}

async function loadRecords() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok)
    throw new Error("HTTP " + res.status + " while loading " + DATA_URL);
  const json = await res.json();
  const list = Array.isArray(json)
    ? json
    : Object.values(json).find(Array.isArray) || [];
  return list.filter((r) => r && typeof r === "object");
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}



/* ---------- Tooltip: any element with data-tip="text" (optional data-tip-pos="top|right|bottom") ---------- */
const Tooltip = (() => {
  let tip, owner;
  const ensure = () => {
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "tip";
      tip.id = "tooltip";
      tip.setAttribute("role", "tooltip");
      document.body.appendChild(tip);
    }
    return tip;
  };
  function show(el) {
    owner = el;
    const t = ensure();
    t.textContent = el.dataset.tip;
    el.setAttribute("aria-describedby", "tooltip");
    t.classList.remove("is-visible");
    t.style.left = "0px";
    t.style.top = "0px";
    const r = el.getBoundingClientRect(),
      w = t.offsetWidth,
      h = t.offsetHeight,
      gap = 8;
    let pos = el.dataset.tipPos || "top";
    if (pos === "right" && r.right + gap + w > innerWidth) pos = "top";
    let x, y;
    if (pos === "right") {
      x = r.right + gap;
      y = r.top + (r.height - h) / 2;
    } else if (pos === "bottom") {
      x = r.left + (r.width - w) / 2;
      y = r.bottom + gap;
    } else {
      x = r.left + (r.width - w) / 2;
      y = r.top - h - gap;
      if (y < 4) y = r.bottom + gap;
    }
    t.style.left = Math.max(4, Math.min(x, innerWidth - w - 4)) + "px";
    t.style.top = Math.max(4, Math.min(y, innerHeight - h - 4)) + "px";
    t.classList.add("is-visible");
  }
  function hide() {
    if (owner) {
      owner.removeAttribute("aria-describedby");
      owner = null;
    }
    if (tip) tip.classList.remove("is-visible");
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el) hide();
    else if (el !== owner) show(el);
  });
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) hide();
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el) show(el);
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
  window.addEventListener("scroll", hide, true);
  return { show, hide };
})();

const SPRITE =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></symbol><symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol><symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol><symbol id="i-more" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></symbol><symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol><symbol id="i-inbox" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></symbol><symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/></symbol><symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol><symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></symbol><symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></symbol><symbol id="i-building" viewBox="0 0 24 24"><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M2 21h20M8 8h2M8 12h2M8 16h2"/></symbol><symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol><symbol id="i-chevleft" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></symbol><symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></symbol><symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></symbol><symbol id="i-fit" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol><symbol id="i-panel" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M16 10l-2 2 2 2"/></symbol><symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></symbol><symbol id="i-signal" viewBox="0 0 24 24"><path d="M4.5 11.5a10 10 0 0 1 15 0M8 15a5 5 0 0 1 8 0M12 19h.01"/></symbol><symbol id="i-lines" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h13"/></symbol><symbol id="i-plus-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></symbol><symbol id="i-minus-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></symbol><symbol id="i-login" viewBox="0 0 24 24"><path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/></symbol><symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m16 8-2 6-6 2 2-6z"/></symbol><symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></symbol><symbol id="i-chevdown" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol><symbol id="i-scale" viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></symbol><symbol id="i-chart-no-axes-combined" viewBox="0 0 24 24"><path d="M12 16v5M16 14v7M20 10v11M4 18v3M8 14v7"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/></symbol><symbol id="i-chevright" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol><symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></symbol><symbol id="i-bookmark" viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></symbol><symbol id="i-book" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></symbol><symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol><symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></symbol><symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol><symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol><symbol id="i-star" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></symbol><symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></symbol><symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol><symbol id="i-list-plus" viewBox="0 0 24 24"><path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/></symbol><symbol id="i-settings" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></symbol></svg>';

/* ---------- Sidebar navigation: groups collapse/expand independently ---------- */
const DEFAULT_SECTION = "entities";
/* items: [id, label, soon] rows, and/or nested groups { id, label, icon, items }.
   soon = "Coming soon": greyed with a tooltip, not selectable. */
/* ---------- My Lists store (saved in localStorage) ---------- */
const ListsStore = (() => {
  const KEY = "eninrac-lists";
  const now = () => new Date().toISOString();
  const seed = () => ({
    id: "watchlist",
    name: "Watchlist",
    description: "Companies and sites you are keeping an eye on.",
    entries: [],
    updated: now(),
    default: true,
  });
  const clean = (v) =>
    Array.isArray(v)
      ? v
        .filter((l) => l && l.id && l.name)
        .map((l) => ({
          id: String(l.id),
          name: String(l.name),
          description: String(l.description || ""),
          entries: Array.isArray(l.entries) ? l.entries : [],
          updated: l.updated || now(),
          default: !!l.default,
        }))
      : [];
  function load() {
    let lists = [];
    try {
      lists = clean(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch (e) { }
    if (!lists.some((l) => l.id === "watchlist")) lists.unshift(seed());
    return lists.sort(
      (a, b) => b.default - a.default,
    ); /* the default Watchlist always comes first */
  }
  let lists = load();
  const changed = () => document.dispatchEvent(new CustomEvent("lists:change"));
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(lists));
    } catch (e) { }
    changed();
  }
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      lists = load();
      changed();
    }
  }); /* other tabs */
  return {
    all: () => lists.slice(),
    get: (id) => lists.find((l) => l.id === id) || null,
    fmt: (iso) =>
      new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    taken: (name, exceptId) =>
      lists.some(
        (l) =>
          l.id !== exceptId &&
          l.name.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    has: (listId, entryId) => {
      const l = lists.find((x) => x.id === listId);
      return !!l && l.entries.includes(String(entryId));
    },
    toggle(listId, entryId) {
      /* adds the entry if it is not in the list, removes it if it is. Returns true when it is now in the list */
      const l = lists.find((x) => x.id === listId);
      if (!l) return false;
      const id = String(entryId),
        i = l.entries.indexOf(id);
      if (i >= 0) l.entries.splice(i, 1);
      else l.entries.push(id);
      l.updated = now();
      save();
      return i < 0;
    },
    addEntry(listId, entryId) {
      const l = lists.find((x) => x.id === listId),
        id = String(entryId);
      if (l && !l.entries.includes(id)) {
        l.entries.push(id);
        l.updated = now();
        save();
      }
    },
    add({ name, description }) {
      const l = {
        id:
          "l" +
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 5),
        name: name.trim(),
        description: (description || "").trim(),
        entries: [],
        updated: now(),
        default: false,
      };
      lists.push(l);
      save();
      return l;
    },
    update(id, { name, description }) {
      const l = lists.find((x) => x.id === id);
      if (!l || l.default) return null;
      l.name = name.trim();
      l.description = (description || "").trim();
      l.updated = now();
      save();
      return l;
    },
    remove(id) {
      const l = lists.find((x) => x.id === id);
      if (!l || l.default) return false;
      lists = lists.filter((x) => x.id !== id);
      save();
      return true;
    },
  };
})();

const ACCOUNT_LABEL =
  "MyINC42"; /* label of the account entry pinned at the bottom of the sidebar */
const NAV = [
  {
    id: "discover",
    label: "Discover",
    icon: "compass",
    items: [
      ["ask", "Ask C&I"],
      ["feed", "My Feed"],
      ["radar", "Opportunity Radar"],
      ["map", "Map View (GIS)", true],
      {
        id: "explore",
        label: "Explore",
        icon: "layers",
        items: [
          ["entities", "C&I Companies"],
          ["sites", "Sites / Facilities"],
          ["clusters", "Industries / Clusters"],
          ["zones", "Industrial Zones / Parks"],
          ["people", "People & Decision Makers"],
        ],
      },
      {
        id: "grid",
        label: "Grid & Power",
        icon: "bolt",
        items: [
          ["discom", "Discom & Territory"],
          ["substation", "Substation"],
          ["feeders", "Feeders", true],
          ["openaccess", "Open Access Register"],
          ["cpp", "CPP States"],
          ["dg", "DG Assets"],
          ["srt", "SRT Mapping", true],
          ["bess", "BESS Mapping", true],
        ],
      },
      {
        id: "policy",
        label: "Policy & Tariff",
        icon: "scale",
        items: [
          ["tariff", "Tariff Explorer"],
          ["oa-charges", "O/A Charges", true],
          ["reg-orders", "Regulatory & Orders", true],
          ["tribunal-orders", "Judicial & Appellate Tribunal Orders", true],
        ],
      },
      {
        id: "group-captive",
        label: "Group Captive",
        icon: "users",
        items: [
          ["gc-project-builder", "GC Project Builder"],
          ["compliance-monitor", "Compliance Monitor"],
          ["oa-gc-viability", "OA / GC Viability", true],
        ],
      },
      {
        id: "solutions",
        label: "Solutions",
        icon: "layers",
        items: [
          ["fit-matrix", "Fit Matrix", true],
          ["sustainability-cbam", "Sustainability & CBAM", true],
          ["carbon-certificates", "Carbon & Certificates", true],
          ["efficiency", "Efficiency", true],
          ["rec", "REC's & IREC", true],
        ],
      },
      {
        id: "market",
        label: "Market & Competition",
        icon: "chart-no-axes-combined",
        items: [
          ["power-market", "Power Market & Prices"],
          ["re-supply-pipeline", "RE Supply & Projects Pipeline"],
          ["competitors", "Competition & Market Players"],
          ["tenders", "Tenders & RFPs"],
        ],
      },
    ],
  },
  {
    id: "track",
    label: "Track",
    icon: "bookmark",
    items: [
      ["my-list", "My Lists", false, "lists"],
      ["pipeline-board", "Pipeline Board"],
      ["saved-searches", "Saved Searches"],
    ],
  },
  {
    id: "research",
    label: "Research",
    icon: "book",
    items: [
      ["reports", "Reports & Benchmarks"],
      ["data-dictionary", "Data Dictionary"],
    ],
  },
  /* pinned = shown at the bottom of the sidebar, under "Upgrade To Pro" (the Admin pages) */
  {
    id: "admin",
    label: ACCOUNT_LABEL,
    icon: "user",
    pinned: true,
    items: [
      ["scoring-weights", "Scoring & Weights"],
      ["data-governance", "Data Governance & Services"],
      ["my-account", "My Account"],
      ["my-membership", "My Membership"],
      ["email-us", "Email Us"],
    ],
  },
];

/* Flattens NAV (a group's items may be rows AND nested groups) into [{ id, label, soon, icon, trail[] }] */
function navLeaves(groups, trail = []) {
  return groups.flatMap((g) =>
    g.items.flatMap((it) =>
      Array.isArray(it)
        ? [
          {
            id: it[0],
            label: it[1],
            soon: !!it[2],
            icon: g.icon,
            trail: [...trail, g.label],
          },
        ]
        : navLeaves([it], [...trail, g.label]),
    ),
  );
}
const NAV_LEAVES = navLeaves(NAV);
const listOf = (id) =>
  typeof id === "string" && id.startsWith("list-")
    ? ListsStore.get(id.slice(5))
    : null; /* "list-<id>" = a saved list */
const sectionLabel = (id) => {
  const l = NAV_LEAVES.find((x) => x.id === id);
  if (l) return l.label;
  const u = listOf(id);
  return u ? u.name : "";
};
const currentSection = () => {
  const id = new URLSearchParams(location.search).get("section");
  return NAV_LEAVES.some((l) => l.id === id && !l.soon) || listOf(id)
    ? id
    : DEFAULT_SECTION;
};

const hasActive = (g, id) =>
  g.items.some((it) =>
    Array.isArray(it)
      ? it[0] === id || (it[3] === "lists" && !!listOf(id))
      : hasActive(it, id),
  );
let activeNav = DEFAULT_SECTION;
const listLinksHtml = (active) =>
  ListsStore.all()
    .map(
      (l) => `
            <li><a class="nav-sub__link nav-sub__link--list" href="index.html?section=list-${esc(l.id)}" data-section="list-${esc(l.id)}"${"list-" + l.id === active ? ' aria-current="page"' : ""}>${l.default ? icon("star") : ""}<span>${esc(l.name)}</span></a></li>`,
    )
    .join("");
const leafHtml = ([id, label, soon, kind], active) => {
  const link = `<a class="nav-sub__link${soon ? " is-soon" : ""}" href="index.html?section=${id}" data-section="${id}"${id === active ? ' aria-current="page"' : ""}${soon ? ' aria-disabled="true" data-tip="Coming soon" data-tip-pos="right"' : ""}>${esc(label)}${soon ? '<span class="nav-soon">Soon</span>' : ""}</a>`;
  /* kind "lists": "My Lists" with one child link per saved list */
  return kind === "lists"
    ? `\n          <li>${link}<ul class="nav-lists" id="navLists">${listLinksHtml(active)}</ul></li>`
    : `\n          <li>${link}</li>`;
};
function renderNavLists() {
  /* called whenever a list is created, renamed or deleted */
  const ul = document.getElementById("navLists");
  if (ul) ul.innerHTML = listLinksHtml(activeNav);
  const s = document.querySelector(".app-header__title span");
  if (s && listOf(activeNav)) s.textContent = sectionLabel(activeNav);
}
const groupHtml = (g, active, nested) => {
  const open = hasActive(g, active);
  return `
    <div class="nav-group${open ? " is-open" : ""}${nested ? " nav-group--nested" : ""}" data-group="${g.id}">
      <button type="button" class="nav-group__trigger" id="ng-t-${g.id}" aria-expanded="${open}" aria-controls="ng-p-${g.id}">
        ${icon(g.icon)}<span class="lbl">${esc(g.label)}</span><span class="nav-group__chev">${icon("chevdown")}</span>
      </button>
      <div class="nav-group__panel" id="ng-p-${g.id}" role="region" aria-labelledby="ng-t-${g.id}">
        <ul class="nav-sub">${g.items.map((it) => (Array.isArray(it) ? leafHtml(it, active) : `<li class="nav-sub__group">${groupHtml(it, active, true)}</li>`)).join("")}
        </ul>
      </div>
    </div>`;
};
const navHtml = (active) =>
  NAV.filter((g) => !g.pinned)
    .map((g) => groupHtml(g, active, false))
    .join("");
const accountHtml = (active) =>
  NAV.filter((g) => g.pinned)
    .map((g) => groupHtml(g, active, false))
    .join("");

const SHELL = (active) => `
<div class="shell" id="shell">
  <aside class="side" id="side" aria-label="Sidebar">
    <div class="brand"><span class="brand-mark">${icon("grid")}</span><span class="lbl">Eninrac</span></div>
    <button type="button" class="side-search" id="sideSearch" aria-haspopup="dialog" aria-label="Search">${icon("search")}<span class="side-search__text">Search…</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"}</kbd></button>
    <nav class="nav" aria-label="Main">${navHtml(active)}</nav>
    <div class="side-bottom"><button type="button" class="upgrade-btn" id="upgradeBtn">${icon("lock")}<span>Upgrade To Pro</span></button>${accountHtml(active)}</div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <div class="main">
    <button class="icon-btn menu-fab" id="menuFab" aria-label="Open menu">${icon("menu")}</button>
    <header class="topbar app-header">
      <button class="icon-btn menu-btn" id="menu" aria-label="Open menu">${icon("menu")}</button>
      <div class="app-header__title"><strong>C&amp;I consumers</strong><span>${esc(sectionLabel(active))}</span></div>
      <div class="app-header__actions">
        <div class="app-header__slot" id="headerActions"></div>
        <a class="btn btn-primary signin-btn" href="login.html">${icon("login")}<span>Sign in</span></a>
      </div>
    </header>
    <div class="workspace" id="workspace"><div class="wrap" id="app"></div></div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;

function setGroup(g, open) {
  g.classList.toggle("is-open", open);
  g.querySelector(".nav-group__trigger").setAttribute(
    "aria-expanded",
    String(open),
  );
}
/* Accordion: opening a group closes all the others (clicking an open group closes it) */
function toggleGroup(g, open) {
  open = open === undefined ? !g.classList.contains("is-open") : open;
  if (open) {
    /* accordion: nested groups close their siblings; top-level groups close each other */
    const nested = g.classList.contains("nav-group--nested");
    const sibs = nested
      ? [...g.closest("li").parentElement.children].map(
        (el) => el.firstElementChild,
      )
      : [...document.querySelectorAll(".nav-group:not(.nav-group--nested)")];
    sibs.forEach((o) => {
      if (o && o !== g && o.classList.contains("nav-group")) setGroup(o, false);
    });
  }
  setGroup(g, open);
}
/* ---------- Top header: hide it on some pages ---------- */
/* Section ids (pages inside index.html) that hide the header. "*" at the end matches a prefix. Example: ["my-list", "list-*"] */
const HEADERLESS_SECTIONS = [
  "my-list",
  "ask",
]; /* My Lists page has its own top bar. Add "list-*" to hide it on every saved list page too */
let pageHeader = true; /* initShell({ header: false }) turns the header off for a whole HTML page */
/* true if the section id is in the list ("*" at the end of an entry matches a prefix) */
const sectionIn = (list, id) =>
  list.some((s) =>
    s.endsWith("*") ? String(id).startsWith(s.slice(0, -1)) : s === id,
  );
const headerHidden = (id) => !pageHeader || sectionIn(HEADERLESS_SECTIONS, id);
function applyHeader(id) {
  const shell = document.getElementById("shell");
  if (!shell) return;
  const hide = headerHidden(id);
  shell.classList.toggle("no-header", hide);
  if (hide && typeof AdvancedFilter !== "undefined") {
    try {
      AdvancedFilter.close();
    } catch (e) { }
  } /* its button lives in the header */
}

/* Highlights a sidebar item, opens its group and updates the header subtitle */
function setActiveNav(id) {
  activeNav = id;
  applyHeader(id);
  document.querySelectorAll(".nav-sub__link").forEach((a) => {
    if (a.dataset.section === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const a = document.querySelector(`.nav-sub__link[data-section="${id}"]`);
  if (a) {
    const chain = [];
    for (
      let g = a.closest(".nav-group");
      g;
      g = g.parentElement.closest(".nav-group")
    )
      chain.unshift(g);
    chain.forEach((g) => toggleGroup(g, true));
  }
  const s = document.querySelector(".app-header__title span");
  if (s) s.textContent = sectionLabel(id);
}

/* Call once at the top of each page. opts: { active, onNavigate(id), header: false (hide the top header on this page) }. Returns the #app container.
   Without onNavigate, sidebar links simply open index.html?section=<id>. */
function initShell(opts = {}) {
  activeNav = opts.active || DEFAULT_SECTION;
  pageHeader = opts.header !== false;
  document.body.insertAdjacentHTML("afterbegin", SPRITE + SHELL(activeNav));
  document.addEventListener("lists:change", renderNavLists);
  const shell = document.getElementById("shell");
  ["menu", "menuFab"].forEach((id) =>
    document.getElementById(id).addEventListener("click", () => {
      shell.classList.remove("af-open");
      shell.classList.add("open");
    }),
  );
  applyHeader(activeNav);
  document
    .getElementById("scrim")
    .addEventListener("click", () => shell.classList.remove("open", "af-open"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") shell.classList.remove("open", "af-open");
  });
  document.getElementById("upgradeBtn").addEventListener("click", () => {
    if (typeof UpgradeModal !== "undefined") UpgradeModal.open();
    else toast("Upgrade to Pro isn't available yet.");
  });
  document.getElementById("side").addEventListener("click", (e) => {
    const t = e.target.closest(".nav-group__trigger");
    if (t) {
      toggleGroup(t.closest(".nav-group"));
      return;
    }
    const a = e.target.closest(".nav-sub__link");
    if (!a) return;
    if (a.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
      return;
    }
    shell.classList.remove("open");
    if (opts.onNavigate) {
      e.preventDefault();
      opts.onNavigate(a.dataset.section);
    }
  });
  if (typeof SearchModal !== "undefined") SearchModal.mount();
  if (typeof UpgradeModal !== "undefined") UpgradeModal.mount();
  return document.getElementById("app");
}
