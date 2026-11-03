/* "Upgrade To Pro" modal: opened from the sidebar button. Needs common.js (esc, icon, toast).
   Edit PLAN below: all the text, the price, the feature tiles and the logo strip live there (values are placeholders). */
const UpgradeModal = (() => {
    const PLAN = {
        badge: "Upgrade to Pro",
        titleBefore: "Ready For",
        titleAccent: "Deeper Insight?",
        intro: "Eninrac Pro unlocks full load and tariff analytics, open access insights, verified contacts and export-ready data. Built for developers, IPPs, aggregators and energy teams.",
        features: [   /* [icon, title, description] */
            ["bolt", "Load & Tariff Analytics", "Contract demand, load factor and landed-cost views for every consumer."],
            ["scale", "Open Access Insights", "Charges, banking rules and the landed cost of RE after O/A charges."],
            ["upload", "Export-ready Data", "CSV, Excel, PDF. Credit-based (1-4 credits per export)."],
            ["users", "Verified Contacts", "Decision-maker emails + LinkedIn. 3 credits per contact."]
        ],
        price: "₹1,499", period: "month", billing: "Billed monthly",
        includes: ["Full load & tariff analytics", "Open access insights", "Verified contacts", "Exports + downloads", "100 credits/month"],
        cta: "Start 7-Day Pro Trial",
        fine: "Card required. Auto-charges ₹1,499 on Day 7",
        trusted: { title: "Trusted by teams at", logos: ["Partner logo", "Partner logo", "Partner logo", "Partner logo", "Partner logo", "Partner logo"] },   /* logos: [] hides the strip */
        onStart: null   /* optional: () => { ...start the trial... }  (if null, a "not connected yet" message is shown) */
    };
    let root, panel, opener;

    const html = () => `
    <div class="pm" id="upgradeModal" hidden>
      <div class="pm__panel" role="dialog" aria-modal="true" aria-labelledby="pmTitle" tabindex="-1">
        <button type="button" class="pm__close" id="pmClose" aria-label="Close">${icon("x")}</button>
        <div class="pm__main">
          <span class="pm__badge">${icon("clock")}${esc(PLAN.badge)}</span>
          <h2 class="pm__title" id="pmTitle">${esc(PLAN.titleBefore)} <span>${esc(PLAN.titleAccent)}</span></h2>
          <p class="pm__intro">${esc(PLAN.intro)}</p>
          <ul class="pm__features">${PLAN.features.map(([ic, t, d]) => `
            <li><span class="pm-tile" aria-hidden="true"><span class="pm-tile__in">${icon(ic)}</span></span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join("")}
          </ul>
          ${PLAN.trusted.logos.length ? `<div class="pm__trusted"><p>${esc(PLAN.trusted.title)}</p><div class="pm__logos">${PLAN.trusted.logos.map(l => `<span class="pm__logo">${esc(l)}</span>`).join("")}</div></div>` : ""}
        </div>
        <aside class="pm__side" aria-label="Pro plan">
          <p class="pm__price"><strong>${esc(PLAN.price)}</strong>/${esc(PLAN.period)}</p>
          <p class="pm__billing">${esc(PLAN.billing)}</p>
          <ul class="pm__list">${PLAN.includes.map(i => `<li>${icon("check")}<span>${esc(i)}</span></li>`).join("")}</ul>
          <div class="pm__buy">
            <button type="button" class="btn btn-primary pm__cta" id="pmStart">${esc(PLAN.cta)} ${icon("arrow")}</button>
            <p class="pm__fine">${esc(PLAN.fine)}</p>
          </div>
        </aside>
      </div>
    </div>`;

    function open() {
        if (!root) mount();
        if (!root.hidden) return;
        opener = document.activeElement;
        const shell = document.getElementById("shell"); if (shell) shell.classList.remove("open", "af-open");
        root.hidden = false; document.body.classList.add("sm-lock");
        document.getElementById("pmClose").focus();
    }
    function close() {
        if (!root || root.hidden) return;
        root.hidden = true; document.body.classList.remove("sm-lock");
        if (opener && opener.focus) opener.focus();
    }
    function mount() {
        if (document.getElementById("upgradeModal")) return;
        document.body.insertAdjacentHTML("beforeend", html());
        root = document.getElementById("upgradeModal"); panel = root.querySelector(".pm__panel");
        document.getElementById("pmClose").addEventListener("click", close);
        root.addEventListener("mousedown", e => { if (e.target === root) close(); });
        document.getElementById("pmStart").addEventListener("click", () => {
            if (PLAN.onStart) PLAN.onStart(); else toast("Pro trial sign-up isn't connected yet.");
            close();
        });
        root.addEventListener("keydown", e => {
            if (e.key === "Escape") { e.preventDefault(); close(); return; }
            if (e.key === "Tab") {   /* keep focus inside the dialog */
                const f = [...panel.querySelectorAll("button, a[href]")], first = f[0], last = f[f.length - 1];
                if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
    }
    return { mount, open, close, plan: PLAN };
})();