// /**
//  * tempEmailCreation.js (BROWSER / NO-NODE / SINGLE FILE)
//  * - Mail.tm client (domains -> accounts -> token -> messages -> me -> delete)
//  * - Simple console test runner that executes on page load
//  *
//  * Works when served from http://localhost (VS Code Live Server, etc.)
//  * Not compatible with file://
//  */

// (() => {
//   "use strict";

//   // ---------------------------
//   // Mail.tm Client (Browser-safe)
//   // ---------------------------
//   class Mailjs {
//     constructor({ rateLimitRetries } = {}) {
//       this.baseUrl = "https://api.mail.tm";
//       this.baseMercure = "https://mercure.mail.tm/.well-known/mercure"; // not used in browser version
//       this.listener = null; // not used
//       this.events = {};     // not used
//       this.token = "";
//       this.id = "";
//       this.address = "";
//       this.rateLimitRetries = rateLimitRetries ?? 3;
//     }

//     // ---- Account ----
//     register(address, password) {
//       return this._send("/accounts", "POST", { address, password });
//     }

//     async login(address, password) {
//       const res = await this._send("/token", "POST", { address, password });
//       if (res.status) {
//         this.token = res.data.token;
//         this.id = res.data.id || this.id;
//         this.address = address;
//       }
//       return res;
//     }

//     async loginWithToken(token) {
//       this.token = token;
//       const res = await this.me();
//       if (!res.status) return res;
//       this.id = res.data.id;
//       this.address = res.data.address;
//       return res;
//     }

//     me() {
//       return this._send("/me");
//     }

//     getAccount(accountId) {
//       return this._send(`/accounts/${accountId}`);
//     }

//     async deleteAccount(accountId) {
//       const delRes = await this._send(`/accounts/${accountId}`, "DELETE");
//       if (delRes.status) {
//         // clear session
//         this.token = "";
//         this.id = "";
//         this.address = "";
//         this.listener = null;
//         this.events = {};
//       }
//       return delRes;
//     }

//     deleteMe() {
//       return this.deleteAccount(this.id);
//     }

//     // ---- Domains ----
//     async getDomains() {
//       // Normalize Hydra collections so res.data becomes an array like the original library expected.
//       const res = await this._send("/domains?page=1");
//       if (res.status && res.data && Array.isArray(res.data["hydra:member"])) {
//         res.data = res.data["hydra:member"];
//       }
//       return res;
//     }

//     async getDomain(domainId) {
//       return this._send(`/domains/${domainId}`);
//     }

//     // ---- Messages ----
//     async getMessages(page = 1) {
//       // Normalize Hydra collections: res.data becomes array of messages.
//       const res = await this._send(`/messages?page=${page}`);
//       if (res.status && res.data && Array.isArray(res.data["hydra:member"])) {
//         res.data = res.data["hydra:member"];
//       }
//       return res;
//     }

//     getMessage(messageId) {
//       return this._send(`/messages/${messageId}`);
//     }

//     deleteMessage(messageId) {
//       return this._send(`/messages/${messageId}`, "DELETE");
//     }

//     setMessageSeen(messageId, seen = true) {
//       return this._send(`/messages/${messageId}`, "PATCH", { seen });
//     }

//     // ---- Source ----
//     getSource(sourceId) {
//       return this._send(`/sources/${sourceId}`);
//     }

//     // ---- Helper: Create random account (browser crypto) ----
//     async createOneAccount(useUUID = false) {
//       // 1) Get a domain
//       let domainRes = await this.getDomains();
//       if (!domainRes.status) return domainRes;

//       const domain = domainRes.data[0]?.domain;
//       if (!domain) {
//         return {
//           status: false,
//           statusCode: 0,
//           message: "No domain returned from /domains",
//           data: domainRes.data,
//         };
//       }

//       // 2) Generate username
//       const usernameLocal = useUUID && crypto.randomUUID
//         ? crypto.randomUUID()
//         : this._generateHash(8);

//       const username = `${usernameLocal}@${domain}`;

//       // 3) Generate password & register
//       const password = this._generateHash(10);
//       const registerRes = await this.register(username, password);
//       if (!registerRes.status) return registerRes;

//       // 4) Login
//       const loginRes = await this.login(username, password);
//       if (!loginRes.status) return loginRes;

//       return {
//         status: true,
//         statusCode: loginRes.statusCode,
//         message: "ok",
//         data: { username, password },
//       };
//     }

//     _generateHash(size) {
//       // Browser-safe random hex
//       const bytes = new Uint8Array(size);
//       crypto.getRandomValues(bytes);
//       return Array.from(bytes, (val) => val.toString(16).padStart(2, "0")).join("");
//     }

//     async _send(path, method = "GET", body, retry = 0) {
//       const headers = { accept: "application/json" };

//       // Only set Authorization header if we have a token.
//       if (this.token) headers.authorization = `Bearer ${this.token}`;

//       const options = { method, headers };

//       if (method === "POST" || method === "PATCH") {
//         const contentType = method === "PATCH" ? "merge-patch+json" : "json";
//         headers["content-type"] = `application/${contentType}`;
//         options.body = JSON.stringify(body);
//       }

//       let res;
//       try {
//         res = await fetch(this.baseUrl + path, options);
//       } catch (networkErr) {
//         return {
//           status: false,
//           statusCode: 0,
//           message: `Network error: ${networkErr?.message || networkErr}`,
//           data: null,
//         };
//       }

//       // Basic rate-limit retry
//       if (res.status === 429 && retry < this.rateLimitRetries) {
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//         return this._send(path, method, body, retry + 1);
//       }

//       const contentType = res.headers.get("content-type") || "";
//       let data;
//       if (contentType.startsWith("application/json")) data = await res.json();
//       else data = await res.text();

//       const message =
//         res.ok ? "ok"
//           : (data && (data["hydra:description"] || data.message || data.detail)) || "Request failed";

//       return {
//         status: res.ok,
//         statusCode: res.status,
//         message,
//         data,
//       };
//     }
//   }

//   // Expose for debugging if you want:
//   window.Mailjs = Mailjs;

//   // ---------------------------
//   // Tiny Test Runner (browser)
//   // ---------------------------
//   const tests = [];
//   function test(name, fn) {
//     tests.push({ name, fn });
//   }

//   function groupLog(title) {
//     const style = "font-weight:700;color:#7c3aed";
//     console.groupCollapsed(`%c${title}`, style);
//   }

//   function passLog(name, ms) {
//     console.log(`✅ PASS: ${name} (${ms}ms)`);
//   }

//   function failLog(name, err, ms) {
//     console.error(`❌ FAIL: ${name} (${ms}ms)`);
//     console.error(err);
//   }

//   async function runTests() {
//     const mailjs = new Mailjs({ rateLimitRetries: 3 });
//     window.mailjs = mailjs; // handy for console use

//     console.clear?.();
//     groupLog("Mail.tm Browser Tests (runs on page load)");
//     console.log("Base URL:", mailjs.baseUrl);
//     console.log("Note: Mercure/SSE listener tests are skipped in browser (no auth headers in native EventSource).");
//     console.groupEnd();

//     // ---- Tests converted from node:test version ----

//     test("Get a domain, create an account and log in.", async () => {
//       const res = await mailjs.createOneAccount(false);
//       if (!res.status) throw new Error(res.message);
//       // store created creds on instance for later reference
//       mailjs._created = res.data;
//       return res.data;
//     });

//     test("Get account data (/me).", async () => {
//       const res = await mailjs.me();
//       if (!res.status) throw new Error(res.message);
//       return res.data;
//     });

//     test("List messages (/messages).", async () => {
//       const res = await mailjs.getMessages();
//       if (!res.status) throw new Error(res.message);
//       return res.data;
//     });

//     test("Log in with JWT token.", async () => {
//       const token = mailjs.token;
//       if (!token) throw new Error("No token set on mailjs instance.");
//       const res = await mailjs.loginWithToken(token);
//       if (!res.status) throw new Error(res.message);
//       return res.data;
//     });

//     test("Rate limit check (10 message calls; warn if any 429).", async () => {
//       let saw429 = false;
//       for (let i = 0; i < 10; i++) {
//         const res = await mailjs.getMessages();
//         if (res.statusCode === 429) saw429 = true;
//         // tiny pause to be polite
//         await new Promise((r) => setTimeout(r, 150));
//       }
//       if (saw429) {
//         // Not always a failure; depends on traffic.
//         console.warn("⚠️ Rate limit (429) was observed during test. Try again later if this causes issues.");
//       }
//       return { saw429 };
//     });

//     // Listener test SKIPPED for browser
//     test("Listener test (SKIPPED in browser)", async () => {
//       return "SKIPPED: Browser EventSource cannot send Authorization headers required by Mercure here.";
//     });

//     test("Delete account (/accounts/{id})", async () => {
//       const res = await mailjs.deleteMe();
//       // mail.tm delete typically returns 204 with empty body
//       if (!res.status && res.statusCode !== 204) throw new Error(res.message);
//       return { deleted: true };
//     });

//     // ---- Execute tests ----
//     let pass = 0;
//     let fail = 0;

//     console.group("%cTest Results", "font-weight:700;color:#0ea5e9");

//     for (const t of tests) {
//       const start = performance.now();
//       try {
//         const result = await t.fn();
//         const ms = Math.round(performance.now() - start);
//         pass++;
//         passLog(t.name, ms);
//         if (result !== undefined) console.log("   ↳", result);
//       } catch (err) {
//         const ms = Math.round(performance.now() - start);
//         fail++;
//         failLog(t.name, err, ms);
//       }
//     }

//     console.log(`\nSummary: ${pass} passed, ${fail} failed`);
//     console.groupEnd();
//   }

//   // Run tests on load
//   window.addEventListener("DOMContentLoaded", () => {
//     runTests().catch((e) => console.error("Test runner crashed:", e));
//   });

// })();





///////////////////////////////////////////////////////////
/**
 * tempEmailCreation.js (BROWSER / NO NODE / SINGLE FILE)
 * - Mail.tm client (domains -> accounts -> token -> messages -> me -> delete)
 * - Console tests run on page load
 * - Button click creates temp email + updates your UI
 *
 * Requirements:
 * - Serve page from http://localhost (VS Code Live Server / any local server)
 */
///////////////////////////////////////////////////////////


(() => {
  "use strict";

  // ---------------------------
  // Config
  // ---------------------------
  const UI_TTL_SECONDS = 15 * 60; // UI-only countdown
  const RUN_TESTS_ON_LOAD = true; // set false if you want to stop tests

  // ---------------------------
  // Mail.tm Client (Browser-safe)
  // ---------------------------
  class Mailjs {
    constructor({ rateLimitRetries } = {}) {
      this.baseUrl = "https://api.mail.tm";
      this.token = "";
      this.id = "";
      this.address = "";
      this.rateLimitRetries = rateLimitRetries ?? 3;
    }

    // ---- Account ----
    register(address, password) {
      return this._send("/accounts", "POST", { address, password });
    }

    async login(address, password) {
      const res = await this._send("/token", "POST", { address, password });
      if (res.status) {
        this.token = res.data.token;
        this.id = res.data.id || this.id;
        this.address = address;
      }
      return res;
    }

    async loginWithToken(token) {
      this.token = token;
      const res = await this.me();
      if (!res.status) return res;
      this.id = res.data.id;
      this.address = res.data.address;
      return res;
    }

    me() {
      return this._send("/me");
    }

    async deleteAccount(accountId) {
      const delRes = await this._send(`/accounts/${accountId}`, "DELETE");
      if (delRes.status || delRes.statusCode === 204) {
        this.token = "";
        this.id = "";
        this.address = "";
      }
      return delRes;
    }

    deleteMe() {
      return this.deleteAccount(this.id);
    }

    // ---- Domains ----
    async getDomains() {
      const res = await this._send("/domains?page=1");
      // normalize hydra collection into array
      if (res.status && res.data && Array.isArray(res.data["hydra:member"])) {
        res.data = res.data["hydra:member"];
      }
      return res;
    }

    // ---- Messages ----
    async getMessages(page = 1) {
      const res = await this._send(`/messages?page=${page}`);
      // normalize hydra collection into array
      if (res.status && res.data && Array.isArray(res.data["hydra:member"])) {
        res.data = res.data["hydra:member"];
      }
      return res;
    }

    // ---- Helper: Create random account (browser crypto) ----
    async createOneAccount(useUUID = false) {
      // 1) Get a domain
      const domainRes = await this.getDomains();
      if (!domainRes.status) return domainRes;

      const domain = domainRes.data?.[0]?.domain;
      if (!domain) {
        return {
          status: false,
          statusCode: 0,
          message: "No domain returned from /domains",
          data: domainRes.data,
        };
      }

      // 2) Generate username
      const usernameLocal =
        useUUID && crypto.randomUUID ? crypto.randomUUID() : this._generateHash(8);

      const username = `${usernameLocal}@${domain}`;

      // 3) Generate password & register
      const password = this._generateHash(10);
      const registerRes = await this.register(username, password);
      if (!registerRes.status) return registerRes;

      // 4) Login => token set on instance
      const loginRes = await this.login(username, password);
      if (!loginRes.status) return loginRes;

      return {
        status: true,
        statusCode: loginRes.statusCode,
        message: "ok",
        data: { username, password },
      };
    }

    _generateHash(size) {
      const bytes = new Uint8Array(size);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (val) => val.toString(16).padStart(2, "0")).join("");
    }

    async _send(path, method = "GET", body, retry = 0) {
      const headers = { accept: "application/json" };
      // only attach bearer if we have a token
      if (this.token) headers.authorization = `Bearer ${this.token}`;

      const options = { method, headers };

      if (method === "POST" || method === "PATCH") {
        const contentType = method === "PATCH" ? "merge-patch+json" : "json";
        headers["content-type"] = `application/${contentType}`;
        options.body = JSON.stringify(body);
      }

      let res;
      try {
        res = await fetch(this.baseUrl + path, options);
      } catch (networkErr) {
        return {
          status: false,
          statusCode: 0,
          message: `Network error: ${networkErr?.message || networkErr}`,
          data: null,
        };
      }

      // rate-limit retry
      if (res.status === 429 && retry < this.rateLimitRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this._send(path, method, body, retry + 1);
      }

      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.startsWith("application/json")) data = await res.json();
      else data = await res.text();

      const message =
        res.ok
          ? "ok"
          : (data && (data["hydra:description"] || data.message || data.detail)) ||
            "Request failed";

      return {
        status: res.ok,
        statusCode: res.status,
        message,
        data,
      };
    }
  }

  // ---------------------------
  // UI Wiring (your HTML IDs)
  // ---------------------------
  const els = {
    btn: null,
    spinner: null,
    chip: null,
    value: null,
    copyBtn: null,
    countdown: null,
    consent: null,
    displayName: null,
    purpose: null,
    newsletterEmail: null,
    statusHolder: null,
  };

  let countdownTimer = null;
  const mailjs = new Mailjs({ rateLimitRetries: 3 });
  window.mailjs = mailjs; // optional: debug from console

  function cacheEls() {
    els.btn = document.getElementById("generateTempEmail");
    els.spinner = document.getElementById("genSpinner");
    els.chip = document.getElementById("tempEmailChip");
    els.value = document.getElementById("tempEmailValue");
    els.copyBtn = document.getElementById("copyTempEmail");
    els.countdown = document.getElementById("countdown");
    els.consent = document.getElementById("privacyConsent");
    els.displayName = document.getElementById("displayName");
    els.purpose = document.getElementById("purpose");
    els.newsletterEmail = document.getElementById("newsletterEmail"); // optional (newsletter section)

    // Optional status container (we'll create it if missing)
    els.statusHolder = document.getElementById("tempMailStatus");
    if (!els.statusHolder) {
      els.statusHolder = document.createElement("div");
      els.statusHolder.id = "tempMailStatus";
      els.statusHolder.className = "mt-3";
      const col = document.querySelector("#temp-mail .col-12");
      col?.prepend(els.statusHolder);
    }
  }

  function setLoading(isLoading) {
    if (els.spinner) els.spinner.classList.toggle("d-none", !isLoading);
    if (els.btn) els.btn.disabled = isLoading;
  }

  function showStatus(message, type = "danger") {
    if (!els.statusHolder) return;
    els.statusHolder.innerHTML = `
      <div class="alert alert-${type} d-flex align-items-center" role="alert">
        <div>${message}</div>
      </div>
    `;
    setTimeout(() => {
      if (els.statusHolder) els.statusHolder.innerHTML = "";
    }, 5000);
  }

  function showEmail(email) {
    if (els.value) els.value.textContent = email;
    if (els.chip) els.chip.classList.remove("d-none");
    if (els.newsletterEmail) els.newsletterEmail.value = email;
  }

  function startCountdown(seconds = UI_TTL_SECONDS) {
    if (!els.countdown) return;
    els.countdown.classList.remove("d-none");

    if (countdownTimer) clearInterval(countdownTimer);
    let remaining = seconds;

    const tick = () => {
      const m = String(Math.floor(remaining / 60)).padStart(2, "0");
      const s = String(remaining % 60).padStart(2, "0");
      els.countdown.textContent = `Expires in ${m}:${s}`;

      remaining -= 1;
      if (remaining < 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        els.countdown.textContent = "Expired — generate a new one";
      }
    };

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  async function handleCopy() {
    const email = els.value?.textContent?.trim();
    if (!email || email === "—") return;

    const btn = els.copyBtn;
    const original = btn?.innerHTML || "Copy";

    try {
      await navigator.clipboard.writeText(email);

      if (btn) {
        btn.innerHTML = "Copied!";
        btn.classList.remove("btn-outline-light");
        btn.classList.add("btn-success");
        btn.disabled = true;

        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove("btn-success");
          btn.classList.add("btn-outline-light");
          btn.disabled = false;
        }, 1200);
      }
    } catch (e) {
      console.error("Clipboard failed:", e);
      showStatus("Copy failed. Please copy manually.", "warning");
    }
  }

  async function handleGenerateTempEmailClick() {
    // If privacy checkbox exists, enforce it
    if (els.consent && !els.consent.checked) {
      showStatus("Please agree to the Privacy Policy to generate a temporary email.", "warning");
      return;
    }

    setLoading(true);

    try {
      // Create temp account and login (token stored in mailjs.token)
      const res = await mailjs.createOneAccount(false);

      if (!res.status) {
        throw new Error(res.message || "Failed to create temp email");
      }

      const { username, password } = res.data;

      // Update UI
      showEmail(username);
      startCountdown(UI_TTL_SECONDS);

      // Save for later use (messages, etc.)
      sessionStorage.setItem(
        "mailtm.session",
        JSON.stringify({
          address: username,
          password,
          token: mailjs.token,
          id: mailjs.id,
          createdAt: new Date().toISOString(),
        })
      );

      showStatus("Temporary email created", "success");
    } catch (err) {
      console.error(err);
      showStatus(`Could not generate temp email: <strong>${err.message}</strong>`, "danger");
    } finally {
      setLoading(false);
    }
  }

  function wireUI() {
    if (els.btn) els.btn.addEventListener("click", handleGenerateTempEmailClick);
    if (els.copyBtn) els.copyBtn.addEventListener("click", handleCopy);
  }

  // ---------------------------
  // Console Tests (runs on load)
  // ---------------------------
  const tests = [];
  function test(name, fn) {
    tests.push({ name, fn });
  }

  async function runTests() {
    console.groupCollapsed("%cMail.tm Tests (browser)", "font-weight:700;color:#0ea5e9");
    console.log("Base URL:", mailjs.baseUrl);
    console.groupEnd();

    test("Domains available", async () => {
      const res = await mailjs.getDomains();
      if (!res.status) throw new Error(res.message);
      if (!res.data?.length) throw new Error("No domains returned");
      return res.data[0];
    });

    test("Create account + login (createOneAccount)", async () => {
      const res = await mailjs.createOneAccount(false);
      if (!res.status) throw new Error(res.message);
      return res.data;
    });

    test("Me endpoint works with token", async () => {
      const res = await mailjs.me();
      if (!res.status) throw new Error(res.message);
      return { id: res.data.id, address: res.data.address };
    });

    test("List messages (should be empty initially)", async () => {
      const res = await mailjs.getMessages();
      if (!res.status) throw new Error(res.message);
      return { count: res.data.length };
    });

    test("Rate limit check (5 calls, warn if 429)", async () => {
      let saw429 = false;
      for (let i = 0; i < 5; i++) {
        const res = await mailjs.getMessages();
        if (res.statusCode === 429) saw429 = true;
        await new Promise((r) => setTimeout(r, 150));
      }
      if (saw429) console.warn("⚠️ Observed 429 rate limit during test. Try again later if needed.");
      return { saw429 };
    });

    test("Delete account", async () => {
      const res = await mailjs.deleteMe();
      if (!res.status && res.statusCode !== 204) throw new Error(res.message);
      return { deleted: true };
    });

    let pass = 0, fail = 0;
    console.group("%cTest Results", "font-weight:700;color:#22c55e");

    for (const t of tests) {
      const start = performance.now();
      try {
        const result = await t.fn();
        const ms = Math.round(performance.now() - start);
        pass++;
        console.log(`PASS: ${t.name} (${ms}ms)`, result ?? "");
      } catch (err) {
        const ms = Math.round(performance.now() - start);
        fail++;
        console.error(`FAIL: ${t.name} (${ms}ms)`);
        console.error(err);
      }
    }

    console.log(`Summary: ${pass} passed, ${fail} failed`);
    console.groupEnd();
  }

  // ---------------------------
  // Init on DOM ready
  // ---------------------------
  window.addEventListener("DOMContentLoaded", async () => {
    cacheEls();
    wireUI();

    if (RUN_TESTS_ON_LOAD) {
      try {
        await runTests();
      } catch (e) {
        console.error("Test runner crashed:", e);
      }
    }
  });

})();
