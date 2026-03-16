// // mailtmTempEmail.js
// // Mail.tm temp email generator + token + optional inbox fetch
// // Works with your existing DOM ids from the temp-mail form.
// //
// // Requires <script type="module"> import { initTempMailTM } ... </script>

// const API_BASE = "https://api.mail.tm";
// const TTL_SECONDS_UI = 15 * 60; // UI-only countdown. Mail.tm expiration is managed server-side.

// let countdownTimer = null;

// // -------------------- helpers --------------------
// function $(id) {
//   return document.getElementById(id);
// }

// function randomString(len = 8) {
//   const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
//   let out = "";
//   for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
//   return out;
// }

// function slugifyName(name) {
//   return (name || "")
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9]+/g, ".")
//     .replace(/^\.+|\.+$/g, "")
//     .slice(0, 24);
// }

// function buildAddress(displayName, purpose, domain) {
//   const name = slugifyName(displayName);
//   const p = (purpose || "newsletter").toLowerCase();
//   const rand = randomString(6);
//   const local = name ? `${name}.${p}.${rand}` : `${p}.${rand}`;
//   return `${local}@${domain}`;
// }

// function buildPassword() {
//   // strong-ish random password
//   return `CFX-${randomString(8)}-${randomString(8)}`;
// }

// function setLoading(isLoading) {
//   const spinner = $("genSpinner");
//   const btn = $("generateTempEmail");
//   if (spinner) spinner.classList.toggle("d-none", !isLoading);
//   if (btn) btn.disabled = isLoading;
// }

// function showStatus(message, type = "danger") {
//   // Creates (or reuses) a status area above the card.
//   let holder = $("tempMailStatus");
//   if (!holder) {
//     holder = document.createElement("div");
//     holder.id = "tempMailStatus";
//     holder.className = "mt-3";
//     // Put it under the headline in the temp-mail column
//     const col = document.querySelector("#temp-mail .col-12");
//     col?.prepend(holder);
//   }

//   holder.innerHTML = `
//     <div class="alert alert-${type} d-flex align-items-center" role="alert">
//       <div>${message}</div>
//     </div>
//   `;

//   // Clear after 6 seconds
//   setTimeout(() => {
//     if (holder) holder.innerHTML = "";
//   }, 6000);
// }

// function showChip(email) {
//   const chip = $("tempEmailChip");
//   const value = $("tempEmailValue");
//   if (value) value.textContent = email;
//   if (chip) chip.classList.remove("d-none");
// }

// function autofillNewsletter(email) {
//   const newsletterEmail = $("newsletterEmail");
//   if (newsletterEmail) newsletterEmail.value = email;
// }

// function startCountdown(seconds = TTL_SECONDS_UI) {
//   const countdown = $("countdown");
//   if (!countdown) return;

//   countdown.classList.remove("d-none");

//   if (countdownTimer) clearInterval(countdownTimer);
//   let remaining = seconds;

//   const tick = () => {
//     const m = String(Math.floor(remaining / 60)).padStart(2, "0");
//     const s = String(remaining % 60).padStart(2, "0");
//     countdown.textContent = `Expires in ${m}:${s}`;

//     remaining -= 1;
//     if (remaining < 0) {
//       clearInterval(countdownTimer);
//       countdownTimer = null;
//       countdown.textContent = "Expired — generate a new one";
//     }
//   };

//   tick();
//   countdownTimer = setInterval(tick, 1000);
// }

// // -------------------- Mail.tm API calls --------------------
// async function getDomains() {
//   const res = await fetch(`${API_BASE}/domains`, {
//     headers: { Accept: "application/json" },
//   });
//   if (!res.ok) throw new Error(`Domains request failed (${res.status})`);
//   const data = await res.json();

//   // mail.tm returns hydra format: { "hydra:member": [ { domain: "..." }, ... ] }
//   const domains = (data["hydra:member"] || [])
//     .map((d) => d.domain)
//     .filter(Boolean);

//   if (!domains.length) throw new Error("No available domains returned from mail.tm.");
//   return domains;
// }

// async function createAccount(address, password) {
//   const res = await fetch(`${API_BASE}/accounts`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//     body: JSON.stringify({ address, password }),
//   });

//   // Common: 201 Created OR 422 if address exists or invalid.
//   if (!res.ok) {
//     let msg = "";
//     try {
//       const body = await res.json();
//       msg = body?.["hydra:description"] || body?.message || JSON.stringify(body);
//     } catch {
//       msg = await res.text();
//     }
//     throw new Error(`Create account failed (${res.status}): ${msg}`);
//   }

//   return res.json(); // contains { id, address, ... }
// }

// async function getToken(address, password) {
//   const res = await fetch(`${API_BASE}/token`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//     body: JSON.stringify({ address, password }),
//   });

//   if (!res.ok) {
//     let msg = "";
//     try {
//       const body = await res.json();
//       msg = body?.message || body?.["hydra:description"] || JSON.stringify(body);
//     } catch {
//       msg = await res.text();
//     }
//     throw new Error(`Token request failed (${res.status}): ${msg}`);
//   }

//   // mail.tm returns: { token: "..." }
//   return res.json();
// }

// // const tokenObj = await getToken(account.address, password);
// // console.log("TOKEN OBJ:", tokenObj); // should show { token: "..." }

// // if (!tokenObj?.token) {
// //   throw new Error("Token missing from /token response");
// // }


// async function fetchMessages(token) {
//     // console.log("Using token:", tokenObj.token?.slice(0, 20), "...");
//   const res = await fetch(`${API_BASE}/messages`, {
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   if (!res.ok) throw new Error(`Fetch messages failed (${res.status})`);
//   return res.json(); // hydra collection
// }

// // -------------------- Public init --------------------
// export function initTempMailTM(options = {}) {
//   const {
//     // If you want to force a specific domain (optional)
//     preferredDomain = null,

//     // If true, after generating email it also fetches inbox and logs it
//     fetchInboxAfterCreate = false,
//   } = options;

//   const btn = $("generateTempEmail");
//   const copyBtn = $("copyTempEmail");

//   if (!btn) {
//     console.warn("initTempMailTM: #generateTempEmail button not found.");
//     return;
//   }

//   btn.addEventListener("click", async () => {
//     const consent = $("privacyConsent");
//     const displayName = $("displayName")?.value || "";
//     const purpose = $("purpose")?.value || "newsletter";

//     if (consent && !consent.checked) {
//       showStatus("Please agree to the Privacy Policy to generate a temporary email.", "warning");
//       return;
//     }

//     setLoading(true);

//     try {
//       // 1) domains
//       const domains = await getDomains();
//       const domain =
//         preferredDomain && domains.includes(preferredDomain)
//           ? preferredDomain
//           : domains[0];

//       // 2) create account
//       const address = buildAddress(displayName, purpose, domain);
//       const password = buildPassword();

//       const account = await createAccount(address, password);

//       // 3) get token
//       const tokenObj = await getToken(account.address, password);

//       // UI updates
//       showChip(account.address);
//       autofillNewsletter(account.address);
//       startCountdown(TTL_SECONDS_UI);

//       // Save session info
//       sessionStorage.setItem(
//         "mailtm.account",
//         JSON.stringify({
//           id: account.id,
//           address: account.address,
//           password,
//           token: tokenObj.token,
//           createdAt: account.createdAt,
//         })
//       );

//       showStatus("Temporary email created and authenticated ✅", "success");

//       // 4) optional inbox fetch
//       if (fetchInboxAfterCreate) {
//         const inbox = await fetchMessages(tokenObj.token);
//         console.log("mail.tm inbox:", inbox);
//       }
//     } catch (err) {
//       console.error(err);

//       // Helpful note: mail.tm supports CORS in many cases, but if it fails, user will see it here
//       showStatus(
//         `Could not generate temp email. <strong>${err.message}</strong>`,
//         "danger"
//       );
//     } finally {
//       setLoading(false);
//     }
//   });

//   if (copyBtn) {
//     copyBtn.addEventListener("click", async () => {
//       const email = $("tempEmailValue")?.textContent?.trim();
//       if (!email || email === "—") return;

//       try {
//         await navigator.clipboard.writeText(email);
//         showStatus("Copied to clipboard ✅", "success");
//       } catch {
//         showStatus("Could not copy. Please copy manually.", "warning");
//       }
//     });
//   }
// }

// // Optional helper you can import elsewhere
// export function getSavedMailTmSession() {
//   try {
//     return JSON.parse(sessionStorage.getItem("mailtm.account") || "null");
//   } catch {
//     return null;
//   }
// }




//////////////////////////////////////////////////////////////////////////////////////////

// mailtmClient.js (BROWSER VERSION)
// Minimal mail.tm client: domains -> create account -> token.
// No EventSource. No Node imports.


// const API_BASE = "https://api.mail.tm";

// // ---------- small utilities ----------
// function sleep(ms) {
//   return new Promise((r) => setTimeout(r, ms));
// }

// function bytesToHex(bytes) {
//   return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
// }

// function randomHex(size = 8) {
//   const arr = new Uint8Array(size);
//   crypto.getRandomValues(arr);
//   return bytesToHex(arr);
// }

// function randomUsername({ displayName = "", purpose = "newsletter" } = {}) {
//   const cleaned = (displayName || "")
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9]+/g, ".")
//     .replace(/^\.+|\.+$/g, "")
//     .slice(0, 24);

//   const p = (purpose || "newsletter").toLowerCase();
//   const suffix = randomHex(3); // 6 hex chars
//   return cleaned ? `${cleaned}.${p}.${suffix}` : `${p}.${suffix}`;
// }

// function parseErrorPayload(payload) {
//   // mail.tm often returns hydra errors or {message: "..."}
//   if (!payload) return "Unknown error";
//   if (typeof payload === "string") return payload;
//   return (
//     payload["hydra:description"] ||
//     payload.message ||
//     payload.detail ||
//     JSON.stringify(payload)
//   );
// }

// // ---------- core request helper ----------
// async function request(path, { method = "GET", token = "", body } = {}, retry = 0, maxRetries = 3) {
//   const headers = { Accept: "application/json" };

//   // Only attach Bearer if you actually have a token.
//   if (token) headers.Authorization = `Bearer ${token}`;

//   // JSON body for POST/PATCH
//   if (body !== undefined) {
//     headers["Content-Type"] = "application/json";
//   }

//   const res = await fetch(`${API_BASE}${path}`, {
//     method,
//     headers,
//     body: body !== undefined ? JSON.stringify(body) : undefined,
//   });

//   // Handle rate limiting (429)
//   if (res.status === 429 && retry < maxRetries) {
//     await sleep(900);
//     return request(path, { method, token, body }, retry + 1, maxRetries);
//   }

//   const contentType = res.headers.get("content-type") || "";
//   const data = contentType.includes("application/json") ? await res.json() : await res.text();

//   if (!res.ok) {
//     throw new Error(`${res.status} ${res.statusText}: ${parseErrorPayload(data)}`);
//   }

//   return data;
// }

// // ---------- exported API ----------
// export async function getDomains() {
//   // mail.tm returns hydra collections; grab domains from hydra:member
//   const data = await request("/domains?page=1");
//   const members = data["hydra:member"] || [];
//   const domains = members.map(d => d.domain).filter(Boolean);

//   if (!domains.length) throw new Error("No domains returned from mail.tm");
//   return domains;
// }

// export async function createAccount(address, password) {
//   // POST /accounts (no auth required)
//   return request("/accounts", {
//     method: "POST",
//     body: { address, password },
//   });
// }

// export async function getToken(address, password) {
//   // POST /token (no auth required)
//   // returns { token: "...", id: "..." } typically
//   return request("/token", {
//     method: "POST",
//     body: { address, password },
//   });
// }

// export async function createRandomAccount({
//   displayName = "",
//   purpose = "newsletter",
//   useUUID = false,
// } = {}) {
//   // 1) domains
//   const domains = await getDomains();
//   const domain = domains[0];

//   // 2) username local part
//   const local = useUUID && crypto.randomUUID
//     ? crypto.randomUUID()
//     : randomUsername({ displayName, purpose });

//   const address = `${local}@${domain}`;
//   const password = `CFX-${randomHex(8)}`;

//   // 3) create account
//   const account = await createAccount(address, password);

//   // 4) token
//   const tokenObj = await getToken(address, password);

//   if (!tokenObj?.token) {
//     throw new Error("Token response did not include a token.");
//   }

//   return {
//     address,
//     password,
//     token: tokenObj.token,
//     id: tokenObj.id || account.id,
//     account,
//     tokenObj,
//   };
// }

// export async function getMessages(token, page = 1) {
//   // GET /messages requires Bearer token
//   return request(`/messages?page=${page}`, { token });
// }

// export async function me(token) {
//   // GET /me requires Bearer token
//   return request("/me", { token });
// }

////////////////////////////////////////////////////////////////////////
// import EventSource from 'eventsource';
// import { randomUUID, getRandomValues } from 'node:crypto';

class Mailjs {
    events;
    baseUrl;
    baseMercure;
    listener;
    token;
    rateLimitRetries;
    id;
    address;
    constructor({ rateLimitRetries } = {}) {
        this.baseUrl = "https://api.mail.tm";
        this.baseMercure = "https://mercure.mail.tm/.well-known/mercure";
        this.listener = null;
        this.events = {};
        this.token = "";
        this.id = "";
        this.address = "";
        this.rateLimitRetries = rateLimitRetries ?? 3;
    }
    // Account
    /** Creates an Account resource. */
    register(address, password) {
        const data = {
            address,
            password,
        };
        return this._send("/accounts", "POST", data);
    }
    /** Get an Account resource by its id. */
    async login(address, password) {
        const data = {
            address,
            password,
        };
        const res = await this._send("/token", "POST", data);
        if (res.status) {
            this.token = res.data.token;
            this.id = res.data.id;
            this.address = address;
        }
        return res;
    }
    /** Login with user JWT token */
    async loginWithToken(token) {
        this.token = token;
        const res = await this.me();
        if (!res.status)
            return res;
        this.id = res.data.id;
        this.address = res.data.address;
        return res;
    }
    /** Retrieves a Account resource. */
    me() {
        return this._send("/me");
    }
    /** Retrieves a Account resource. */
    getAccount(accountId) {
        return this._send("/accounts/" + accountId);
    }
    /** Deletes the Account resource. */
    async deleteAccount(accountId) {
        const delRes = await this._send("/accounts/" + accountId, "DELETE");
        if (delRes.status) {
            this.off();
            this.token = "";
            this.id = "";
            this.address = "";
            this.listener = null;
            this.events = {};
        }
        return delRes;
    }
    /** Deletes the logged in account. */
    deleteMe() {
        return this.deleteAccount(this.id);
    }
    // Domain
    /** Returns a list of domains. */
    getDomains() {
        return this._send("/domains?page=1");
    }
    /** Retrieve a domain by its id. */
    getDomain(domainId) {
        return this._send("/domains/" + domainId);
    }
    // Message
    /** Gets all the Message resources of a given page. */
    getMessages(page = 1) {
        return this._send(`/messages?page=${page}`);
    }
    /** Retrieves a Message resource with a specific id */
    getMessage(messageId) {
        return this._send("/messages/" + messageId);
    }
    /** Deletes the Message resource. */
    deleteMessage(messageId) {
        return this._send("/messages/" + messageId, "DELETE");
    }
    /** Sets a message as readed or unreaded. */
    setMessageSeen(messageId, seen = true) {
        return this._send("/messages/" + messageId, "PATCH", { seen });
    }
    // Source
    /** Gets a Message's Source resource */
    getSource(sourceId) {
        return this._send("/sources/" + sourceId);
    }
    // Events
    /** Open an event listener to messages and error */
    // on(event, callback) {
    //     if (!EventSource) {
    //         console.error("EventSourcePolyfill is required for this feature. https://github.com/cemalgnlts/Mailjs/#quickstart");
    //         return;
    //     }
    //     // Checking if valid events.
    //     if (!["seen", "delete", "arrive", "error", "open"].includes(event)) {
    //         console.error("Unknown event name:", event);
    //         return;
    //     }
    //     if (!this.listener) {
    //         this.listener = new EventSource(`${this.baseMercure}?topic=/accounts/${this.id}`, {
    //             headers: { Authorization: `Bearer ${this.token}` },
    //         });
    //         this.events = {
    //             arrive: () => { },
    //             seen: () => { },
    //             delete: () => { },
    //             error: () => { },
    //         };
    //         const onMessage = async (msg) => {
    //             let data = JSON.parse(msg.data);
    //             // We don't want account details.
    //             // This event is triggered when an account is created or deleted.
    //             if (data["@type"] === "Account")
    //                 return;
    //             let eventType = "arrive";
    //             if (data.isDeleted)
    //                 eventType = "delete";
    //             else if (data.seen)
    //                 eventType = "seen";
    //             // Sometimes the SSE server gives an error and the number 2 is returned
    //             // instead of an object. If this happens, we receive message manually.
    //             // GitHub issues: #23, #24
    //             if (eventType === "arrive" && !data["@type"]) {
    //                 const listRes = await this.getMessages();
    //                 if (!listRes.status)
    //                     this.events["error"]?.(listRes.message);
    //                 data = listRes.data[0];
    //             }
    //             this.events[eventType]?.(data);
    //         };
    //         const onError = (err) => {
    //             this.events["error"](err);
    //         };
    //         this.listener.onmessage = onMessage;
    //         this.listener.onerror = onError;
    //         if (event === "open")
    //             this.listener.onopen = callback;
    //     }
    //     if (event !== "open")
    //         this.events[event] = callback;
    // }
    // /** Clears the events and safely closes event listener. */
    // off() {
    //     if (this.listener)
    //         this.listener.close();
    //     this.events = {};
    //     this.listener = null;
    // }
    // Helper
    /** Create random account. */
    async createOneAccount(useUUID = false) {
        // 1) Get a domain name.
        let domain = await this.getDomains();
        if (!domain.status)
            return domain;
        else
            domain = domain.data[0].domain;
        // 2) Generate a username (test@domain.com).
        const username = `${useUUID ? randomUUID() : this._generateHash(8)}@${domain}`;
        // 3) Generate a password and register.
        const password = this._generateHash(8);
        let registerRes = await this.register(username, password);
        if (!registerRes.status)
            return registerRes;
        // 4) Login.
        let loginRes = await this.login(username, password);
        if (!loginRes.status)
            return loginRes;
        return {
            status: true,
            statusCode: loginRes.statusCode,
            message: "ok",
            data: {
                username,
                password,
            },
        };
    }
    _generateHash(size) {
        return Array.from(getRandomValues(new Uint8Array(size)), (val) => val.toString(16).padStart(2, "0")).join("");
    }
    /** @private */
    async _send(path, method = "GET", body, retry = 0) {
        const options = {
            method,
            headers: {
                accept: "application/json",
                authorization: `Bearer ${this.token}`,
            },
        };
        if (method === "POST" || method === "PATCH") {
            const contentType = method === "PATCH" ? "merge-patch+json" : "json";
            options.headers["content-type"] = `application/${contentType}`;
            options.body = JSON.stringify(body);
        }
        const res = await fetch(this.baseUrl + path, options);
        let data;
        if (res.status === 429 && retry < this.rateLimitRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return this._send(path, method, body, retry + 1);
        }
        const contentType = res.headers.get("content-type");
        if (contentType?.startsWith("application/json"))
            data = await res.json();
        else
            data = await res.text();
        return {
            status: res.ok,
            statusCode: res.status,
            message: res.ok ? "ok" : data.message || data.detail,
            data: data,
        };
    }
}

// export { Mailjs as default };

import test from "node:test";
import Mailjs from "./dist/mailjs.mjs";

const mailjs = new Mailjs();

test("Get a domain, create an account and log in.", async () => {
    const { status, message } = await mailjs.createOneAccount();

    if (!status) throw message;
});

test("Get account data.", async () => {
    const { status, message } = await mailjs.me();

    if (!status) throw message;
});

test("List messages.", async () => {
    const { status, message } = await mailjs.getMessages();

    if (!status) throw message;
});

test("Log in with JWT token.", async () => {
    const token = mailjs.token;

    const { status, message } = await mailjs.loginWithToken(token);

    if (!status) throw message;
});

test("Test listener.", (_, done) => {
    const onOpen = () => {
        mailjs.off();
        done();
    };

    const onError = (err) => {
        throw err;
    }

    mailjs.on("open", onOpen);
    mailjs.on("error", onError);
});

test("Rate limit exceeding.", async () => {
    for (let i = 0; i < 10; i++) {
        const { statusCode } = await mailjs.getMessages();

        if (statusCode === 429) throw Error("A rate limit error occurred.");
    }
});

test("Delete account.", async () => {
    const { status, message } = await mailjs.deleteMe();

    if (!status) throw message;
});
