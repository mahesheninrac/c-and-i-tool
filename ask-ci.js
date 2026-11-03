/* Ask C&I page. It is embedded in index.html as the "ask" section (AskCI.html() + AskCI.bind(container))
   and also works on its own on ask-ci.html. Hook up your answer service by replacing AskCI.onSubmit. */
const AskCI = (() => {
    const svg = (body, sw = 1.7) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const BOLT = '<path d="M13 2 4.5 13h7L11 22l8.5-12h-7L13 2Z"/>';
    const CARDS = [   /* [icon paths, title, short text, prompt that is put in the box] */
        [BOLT, "Electricity Tariffs", "Understand industrial tariffs and demand charges.", "Explain industrial electricity tariffs and demand charges for C&I consumers in India."],
        ['<path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-7 10-16Z"/><path d="M4 21c3-5 7-8 12-11"/>', "Green Energy", "Explore renewable energy procurement options.", "Explain renewable energy procurement options for C&I consumers in India."],
        ['<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>', "Open Access", "Explore eligibility, charges and procedures.", "Explain open access eligibility, charges and procedures for C&I consumers in India."],
        ['<path d="M12 3 3 8h18l-9-5Z"/><path d="M5 9v8M9 9v8M15 9v8M19 9v8M3 19h18M2 22h20"/>', "Energy Regulations", "Explore CERC, SERC and policy updates.", "Explain CERC and SERC regulations affecting commercial and industrial electricity consumers in India."],
        ['<path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-5 5v5"/><path d="M5 7v4a7 7 0 0 0 14 0V7"/>', "Power Procurement", "Understand PPAs and power supply alternatives.", "Compare DISCOM supply, power purchase agreements and renewable energy procurement for C&I consumers in India."],
        ['<path d="m22 17-8-8-5 5-6-6"/><path d="M16 17h6v-6"/>', "Energy Cost Savings", "Discover ways to reduce electricity expenses.", "Suggest practical strategies to reduce electricity costs for industrial consumers in India."]
    ];

    const html = () => `
    <div class="ask-ci-page">
      <section class="ask-ci-content">
        <div class="ask-ci-logo">${svg(BOLT, 1.8)}</div>
        <span class="ask-ci-eyebrow">Ask C&amp;I</span>
        <h1 class="ask-ci-title">Your Energy Questions, Answered.</h1>
        <p class="ask-ci-subtitle">Your intelligent assistant for Commercial &amp; Industrial consumers. Explore electricity tariffs, renewable energy, open access, regulations and power procurement.</p>

        <form class="ask-ci-prompt-box" id="askCIForm">
          <textarea id="askCIInput" class="ask-ci-textarea" rows="2" maxlength="5000" placeholder="Ask anything about your energy requirements..." aria-label="Enter your energy question"></textarea>
          <button class="ask-ci-send" id="askCISend" type="submit" aria-label="Submit question" disabled>${svg('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>', 2)}</button>
        </form>

        <p class="ask-ci-disclaimer">AI-generated responses may contain inaccuracies. Please verify critical regulatory and tariff information with official sources.</p>

        <section class="ask-ci-suggestions">
          <h2 class="ask-ci-section-title">Explore what you can ask</h2>
          <div class="ask-ci-grid">${CARDS.map(([icon, title, text, prompt]) => `
            <button class="ask-ci-card" type="button" data-prompt="${escapeHtml(prompt)}">
              <span class="ask-ci-card-icon">${svg(icon)}</span>
              <span class="ask-ci-card-content"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></span>
            </button>`).join("")}
          </div>
        </section>

        <p class="ask-ci-status" id="askCIStatus" role="status" aria-live="polite"></p>
      </section>
    </div>`;

    function bind(root = document) {
        const form = root.querySelector("#askCIForm");
        if (!form || form.dataset.bound) return;
        form.dataset.bound = "1";
        const input = root.querySelector("#askCIInput"), send = root.querySelector("#askCISend"), status = root.querySelector("#askCIStatus");
        const sync = () => {   /* the send button is enabled only when there is text; the box grows with the text */
            send.disabled = !input.value.trim();
            input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 220) + "px";
        };
        input.addEventListener("input", sync);
        input.addEventListener("keydown", e => {   /* Enter sends, Shift+Enter adds a new line */
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                if (!send.disabled) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
            }
        });
        root.querySelectorAll(".ask-ci-card").forEach(card => card.addEventListener("click", () => {
            input.value = card.dataset.prompt; sync(); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
        }));
        form.addEventListener("submit", async e => {
            e.preventDefault();
            const question = input.value.trim(); if (!question) return;
            send.disabled = true; status.textContent = "Thinking…";
            try { status.textContent = await api.onSubmit(question); }
            catch (err) { status.textContent = "Something went wrong. Please try again."; }
            sync();
        });
    }

    const api = {
        html, bind,
        /* TODO: replace with your real call. Receives the question text, returns the text to show under the box.
           e.g. AskCI.onSubmit = async q => (await (await fetch("/api/ask", { method: "POST", body: JSON.stringify({ q }) })).json()).answer; */
        onSubmit: async q => `Ask C&I isn't connected to an answer service yet. Your question: “${q.length > 140 ? q.slice(0, 140) + "…" : q}”`
    };
    return api;
})();

if (document.getElementById("askCIForm")) AskCI.bind(document);   /* standalone ask-ci.html */