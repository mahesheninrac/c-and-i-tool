/* auth.js: shared by login.html and register.html. Icons, validation, password toggle, strength meter, submit. */

const Auth = {
  /* TODO: replace these placeholders with your real API calls, e.g.
       const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
       return res.ok ? { ok: true } : { ok: false, message: "Incorrect email or password." };            */
  login: async (data) => {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  },
  register: async (data) => {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  },
};

(() => {
  const sym = (id, body) =>
    `<symbol id="i-${id}" viewBox="0 0 24 24">${body}</symbol>`;
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    [
      sym(
        "grid",
        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      ),
      sym(
        "mail",
        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      ),
      sym(
        "lock",
        '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      ),
      sym(
        "user",
        '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      ),
      sym(
        "building",
        '<path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M2 21h20M8 8h2M8 12h2M8 16h2"/>',
      ),
      sym(
        "eye",
        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      ),
      sym(
        "eye-off",
        '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.5 7.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.9"/>',
      ),
      sym("check", '<path d="m5 12 5 5L20 7"/>'),
      sym(
        "alert",
        '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
      ),
    ].join("") +
    "</svg>",
  );

  const form = document.querySelector("form[data-auth]");
  if (!form) return;
  const mode = form.dataset.auth,
    $ = (id) => document.getElementById(id);
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    name: (v) => (v.trim().length < 2 ? "Enter your full name." : ""),
    email: (v) =>
      !v.trim()
        ? "Enter your email address."
        : !EMAIL.test(v.trim())
          ? "Enter a valid email address."
          : "",
    password: (v) =>
      mode === "login"
        ? !v
          ? "Enter your password."
          : ""
        : v.length < 8
          ? "Use at least 8 characters."
          : !/[A-Za-z]/.test(v) || !/\d/.test(v)
            ? "Include at least one letter and one number."
            : "",
    confirm: (v) =>
      !v
        ? "Confirm your password."
        : v !== $("password").value
          ? "Passwords don't match."
          : "",
    terms: (v, el) =>
      el.checked ? "" : "Please accept the terms to continue.",
  };
  const fields = [...form.querySelectorAll("[data-rule]")];

  function setError(el, msg) {
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    const p = $(el.id + "-err");
    if (p) {
      p.hidden = !msg;
      p.querySelector("span").textContent = msg || "";
    }
  }
  const check = (el) => {
    const msg = rules[el.dataset.rule](el.value, el);
    setError(el, msg);
    return !msg;
  };
  function banner(msg) {
    const b = $("formError");
    b.hidden = !msg;
    b.querySelector("span").textContent = msg || "";
  }

  fields.forEach((el) => {
    el.addEventListener("blur", () => {
      if (el.value) check(el);
    });
    el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
      if (el.getAttribute("aria-invalid") === "true") check(el);
      if (el.id === "password" && $("confirm") && $("confirm").value)
        check($("confirm"));
    });
  });

  document.querySelectorAll("[data-toggle-pw]").forEach((b) =>
    b.addEventListener("click", () => {
      const input = $(b.dataset.togglePw),
        show = input.type === "password";
      input.type = show ? "text" : "password";
      b.setAttribute("aria-pressed", String(show));
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      b.querySelector("use").setAttribute(
        "href",
        show ? "#i-eye-off" : "#i-eye",
      );
    }),
  );

  const meter = $("strength");
  if (meter)
    $("password").addEventListener("input", (e) => {
      const v = e.target.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (v.length >= 12) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      meter.dataset.level = v ? s : 0;
      meter
        .querySelectorAll("i")
        .forEach((bar, i) => bar.classList.toggle("on", !!v && i < s));
      $("strengthLabel").textContent = v
        ? ["Too weak", "Weak", "Fair", "Good", "Strong"][s]
        : "Use 8+ characters with a letter and a number";
    });

  if ($("notice") && new URLSearchParams(location.search).get("registered"))
    $("notice").hidden = false;
  const forgot = document.querySelector("[data-forgot]");
  if (forgot)
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      $("notice").querySelector("span").textContent =
        "Password reset isn't connected yet.";
      $("notice").hidden = false;
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    banner("");
    const bad = fields.filter((el) => !check(el));
    if (bad.length) {
      bad[0].focus();
      return;
    }
    const data = {};
    [...form.elements]
      .filter((el) => el.name && el.name !== "confirm")
      .forEach((el) => {
        data[el.name] =
          el.type === "checkbox"
            ? el.checked
            : el.value.trim
              ? el.type === "password"
                ? el.value
                : el.value.trim()
              : el.value;
      });
    const btn = form.querySelector(".auth-submit");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    try {
      const res = await Auth[mode](data);
      if (!res || !res.ok)
        throw new Error(
          (res && res.message) || "Something went wrong. Please try again.",
        );
      location.href =
        mode === "login" ? "index.html" : "login.html?registered=1";
    } catch (err) {
      banner(err.message || "Something went wrong. Please try again.");
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  });
})();
