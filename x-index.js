/* ==========================================================
   CipherFlux – Bootstrap v2
   - Temp email generator (demo mode)
   - Newsletter submit flow
   ========================================================== */

  // ---- TEMP EMAIL (demo) ----
  function demoGenerateTempEmail({ purpose }) {
    const domain = "tmp.cipherflux.dev"; // replace on deploy
    const adjs = ["stealth", "quant", "cipher", "nova", "zenith", "vault", "neon", "prism"];
    const nouns = ["node", "signal", "vector", "agent", "pulse", "flux", "matrix", "array"];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const salt = Math.random().toString(36).slice(2, 6);
    const tag = (purpose || "ux").slice(0, 3);
    const handle = `${adj}.${noun}.${salt}.${tag}`.replace(/[^a-z0-9.]/g, "");
    return { email: `${handle}@${domain}`.toLowerCase(), ttlMin: 10 };
  }

  async function createTempEmail() {
    const purpose = $("#purpose")?.value || "newsletter";
    // Swap this block for a real API call to your provider
    // const res = await fetch("/api/temp-mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose }) });
    // if (!res.ok) throw new Error("Temp-mail error");
    // const { email, ttlMin } = await res.json();
    const { email, ttlMin } = demoGenerateTempEmail({ purpose });

    state.tempEmail = email;
    state.expiryAt = Date.now() + ttlMin * 60 * 1000;

    // Show UI
    $("#tempEmailValue").textContent = email;
    $("#tempEmailChip").classList.remove("d-none");
    $("#countdown").classList.remove("d-none");

    // Prefill newsletter if empty
    const newsEmail = $("#newsletterEmail");
    if (newsEmail && !newsEmail.value) newsEmail.value = email;

    // Countdown
    if (state.expiryTimer) clearInterval(state.expiryTimer);
    state.expiryTimer = setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function updateCountdown() {
    const el = $("#countdown");
    if (!el || !state.expiryAt) return;
    const remaining = state.expiryAt - Date.now();
    if (remaining <= 0) {
      el.textContent = "Expired — generate a new address.";
      clearInterval(state.expiryTimer);
      state.expiryTimer = null;
      state.tempEmail = null;
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    el.textContent = `Expires in ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  $("#generateTempEmail")?.addEventListener("click", async () => {
    const consent = $("#privacyConsent")?.checked;
    if (!consent) {
      alert("Please select to generate a temporary email.");
      return;
    }
    const spinner = $("#genSpinner");
    spinner?.classList.remove("d-none");
    try {
      await createTempEmail();
    } catch (e) {
      console.error(e);
      alert("Could not generate a temporary email. Please try again.");
    } finally {
      spinner?.classList.add("d-none");
    }
  });

  $("#copyTempEmail")?.addEventListener("click", async () => {
    const email = $("#tempEmailValue")?.textContent?.trim();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      const btn = $("#copyTempEmail");
      const old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = old), 1200);
    } catch {
      alert("Copy failed. Select and copy manually.");
    }
  });

  // ---- NEWSLETTER ----
  $("#newsletterForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#newsletterStatus");
    const email = $("#newsletterEmail")?.value?.trim();
    const firstName = $("#firstName")?.value?.trim();
    const optIn = $("#optIn")?.checked;
    const honeypot = $("#company")?.value?.trim();
    const spinner = $("#subSpinner");

    if (honeypot) return;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = "Enter a valid email.";
      status.className = "small text-danger";
      $("#newsletterEmail")?.focus();
      return;
    }
    if (!optIn) {
      status.textContent = "Please consent to receive emails.";
      status.className = "small text-danger";
      return;
    }

    spinner?.classList.remove("d-none");
    status.textContent = "Subscribing…";
    status.className = "small text-secondary";

    try {
      // const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, firstName, source: "landing-bootstrap-v2" }) });
      // if (!res.ok) throw new Error("Subscribe failed");
      await new Promise((r) => setTimeout(r, 700));
      const subs = JSON.parse(localStorage.getItem("cf_subs") || "[]");
      subs.push({ email, firstName: firstName || null, t: Date.now() });
      localStorage.setItem("cf_subs", JSON.stringify(subs));

      status.textContent = "You're in! Check your inbox (or temp mailbox).";
      status.className = "small text-success";
      e.target.reset();
    } catch (err) {
      console.error(err);
      status.textContent = "Subscription failed. Please try again.";
      status.className = "small text-danger";
    } finally {
      spinner?.classList.add("d-none");
    }
  });

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  // Focus hash targets
  window.addEventListener("hashchange", () => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.setAttribute("tabindex", "-1"), el.focus();
    }
  });
})();