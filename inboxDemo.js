// inboxDemo.js
// Demo inbox that shows fake emails without any sending API.
// Uses the same HTML IDs as your inbox UI:
// inboxList, inboxEmpty, inboxError, inboxAddress, emailModal, emailModalTitle, emailMeta, emailBody, emailLoading
// Somehow need to update this to not show the inbox on load

const STORE_KEY = "demo.inbox.messages";

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("mailtm.session") || "null");
  } catch {
    return null;
  }
}

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(msgs));
}

function makeId() {
  return (crypto.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "";
  }
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("d-none");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("d-none");
}

function ensureAddressLabel() {
  const session = getSession();
  setText("inboxAddress", session?.address || "demo-user@mail.tm");
}

function renderList() {
  const listEl = $("inboxList");
  if (!listEl) return;

  hide("inboxError");
  ensureAddressLabel();

  const msgs = loadMessages().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  listEl.innerHTML = "";

  if (!msgs.length) {
    show("inboxEmpty");
    return;
  }

  hide("inboxEmpty");

  for (const m of msgs) {
    const unread = !m.seen;
    const subject = m.subject || "(no subject)";
    const from = m.from || "no-reply@example.com";
    const when = formatDate(m.createdAt);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "list-group-item list-group-item-action bg-dark text-light border-secondary d-flex justify-content-between align-items-start gap-3";
    btn.dataset.id = m.id;

    btn.innerHTML = `
      <div class="me-auto text-start">
        <div class="d-flex align-items-center gap-2">
          <span class="fw-semibold">${escapeHtml(subject)}</span>
          ${unread ? `<span class="badge text-bg-primary">New</span>` : ``}
        </div>
        <div class="text-secondary small">
          From: <span class="font-monospace">${escapeHtml(from)}</span>
          • ${escapeHtml(when)}
        </div>
      </div>
      <div class="text-secondary small">Open</div>
    `;

    listEl.appendChild(btn);
  }
}

function openMessage(id) {
  const msgs = loadMessages();
  const msg = msgs.find((m) => m.id === id);
  if (!msg) return;

  // mark as seen
  msg.seen = true;
  saveMessages(msgs);
  renderList();

  // modal fields
  setText("emailModalTitle", msg.subject || "(no subject)");
  setText("emailMeta", `From: ${msg.from} • ${formatDate(msg.createdAt)}`);

  const loading = $("emailLoading");
  const body = $("emailBody");
  if (loading) loading.classList.add("d-none");
  if (body) body.innerHTML = msg.html || `<pre class="mb-0" style="white-space: pre-wrap;">${escapeHtml(msg.text || "")}</pre>`;

  // open bootstrap modal if available
  const modalEl = $("emailModal");
  if (modalEl && window.bootstrap?.Modal) {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  } else {
    // fallback if Bootstrap JS isn't loaded
    alert(`${msg.subject}\n\n${msg.text || ""}`);
  }
}

function addDemoEmail({
  subject = "Welcome! Your freebies are inside",
  from = "CipherFlux <no-reply@cipherflux.com>",
  html,
  text,
} = {}) {
  const session = getSession();
  const to = session?.address || "demo-user@mail.tm";

  const message = {
    id: makeId(),
    to,
    from,
    subject,
    createdAt: new Date().toISOString(),
    seen: false,
    html: html || `
      <h2>Welcome!</h2>
      <p>Thanks for subscribing. Here are your goodies:</p>
      <ul>
        <li>✅ Automation playbook (PDF)</li>
        <li>✅ Starter templates</li>
        <li>✅ Early access link</li>
      </ul>
      <p style="color:#888;font-size:12px;margin-top:16px;">
        Demo mode email (not actually sent).
      </p>
    `,
    text: text || `Welcome!\n\nThanks for subscribing. Demo mode email (not actually sent).`,
  };

  const msgs = loadMessages();
  msgs.unshift(message);
  saveMessages(msgs);
  renderList();
}

export function initDemoInbox({
  seedOnLoad = true,
  hookNewsletterEvent = true,
  demoToggleId = "inboxDemoMode",
  addDemoButtonId = "inboxAddDemo",
} = {}) {
  // wire list click (event delegation)
  const listEl = $("inboxList");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      openMessage(btn.dataset.id);
    });
  }

  // optional toggle
  const toggle = $(demoToggleId);
  if (toggle) {
    toggle.addEventListener("change", () => {
      // when turned off, just clear demo UI state (doesn't delete messages unless you want)
      renderList();
    });
  }

  // optional manual add button
  const addBtn = $(addDemoButtonId);
  if (addBtn) {
    addBtn.addEventListener("click", () => addDemoEmail());
  }

  // seed one email so your inbox isn’t empty
  if (seedOnLoad && loadMessages().length === 0) {
    addDemoEmail({
      subject: "Newsletter confirmation",
      html: `
        <h2>Confirm your subscription</h2>
        <p>This is a demo email that appears instantly for your presentation.</p>
        <p><strong>No real email was sent.</strong></p>
      `,
    });
  } else {
    renderList();
  }

  // when your newsletter module says it "sent"
  if (hookNewsletterEvent) {
    window.addEventListener("newsletter:sent", () => {
      addDemoEmail({
        subject: "Thanks for subscribing — freebies inside ",
      });
    });
  }

  // if temp email session changes, update address label
  window.addEventListener("storage", (evt) => {
    if (evt.key === "mailtm.session") {
      ensureAddressLabel();
      renderList();
    }
  });

  return {
    addDemoEmail,
    render: renderList,
    clear: () => {
      localStorage.removeItem(STORE_KEY);
      renderList();
    }
  };
}
