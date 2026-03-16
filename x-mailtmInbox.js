// mailtmInbox.js
// Basic mail.tm inbox UI: list messages + open message in modal.
// Reads token/address from sessionStorage key "mailtm.session".

const API_BASE = "https://api.mail.tm";

function $(id) {
  return document.getElementById(id);
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

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("mailtm.session") || "null");
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", token = "", body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      (data && (data["hydra:description"] || data.message || data.detail)) ||
      (typeof data === "string" ? data : "Request failed");
    throw new Error(`${res.status} ${res.statusText}: ${msg}`);
  }

  return data;
}

function renderMessages(listEl, messages) {
  listEl.innerHTML = "";

  messages.forEach((m) => {
    const from = m.from?.address || "Unknown sender";
    const subject = m.subject || "(no subject)";
    const when = formatDate(m.createdAt);
    const unread = !m.seen;

    const item = document.createElement("button");
    item.type = "button";
    item.className =
      "list-group-item list-group-item-action bg-dark text-light border-secondary d-flex justify-content-between align-items-start gap-3";
    item.dataset.id = m.id;

    item.innerHTML = `
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

    listEl.appendChild(item);
  });
}

// Basic HTML escaping for text values (not email HTML body)
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmailBody(container, { html, text }) {
  // Prefer HTML when available, fallback to text.
  container.innerHTML = "";

  if (html) {
    // Display inside sandboxed iframe so newsletter HTML can't affect your page styling.
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.minHeight = "60vh";
    iframe.style.border = "1px solid rgba(255,255,255,.15)";
    iframe.setAttribute("sandbox", "allow-same-origin"); // prevents scripts, allows basic rendering
    container.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
    return;
  }

  // Text fallback
  const pre = document.createElement("pre");
  pre.className = "mb-0 text-light";
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = text || "(empty message)";
  container.appendChild(pre);
}

export function initMailTmInbox({
  pollMs = 5000,     // how often to refresh messages
  autoStart = true,  // start polling automatically
} = {}) {
  const listEl = $("inboxList");
  const refreshBtn = $("inboxRefresh");

  if (!listEl) {
    console.warn("Inbox UI not found (#inboxList). Did you paste the HTML?");
    return;
  }

  let currentToken = "";
  let currentAddress = "";
  let pollTimer = null;
  let modal = null;
  let openedMessageId = null;

  // Bootstrap modal instance (lazy)
  function getModal() {
    if (modal) return modal;
    const modalEl = $("emailModal");
    if (!modalEl || !window.bootstrap?.Modal) return null;
    modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    return modal;
  }

  async function loadMessages() {
    hide("inboxError");
    setText("inboxStatus", "Loading…");

    const session = getSession();
    const token = session?.token;
    const address = session?.address;

    // If there's no session yet, show a helpful state
    if (!token || !address) {
      currentToken = "";
      currentAddress = "";
      setText("inboxAddress", "—");
      listEl.innerHTML = "";
      hide("inboxStatus");
      show("inboxEmpty");
      return;
    }

    // Update current session
    currentToken = token;
    currentAddress = address;
    setText("inboxAddress", address);

    try {
      const data = await request("/messages?page=1", { token });

      const messages = data["hydra:member"] || [];
      if (!messages.length) {
        listEl.innerHTML = "";
        show("inboxEmpty");
      } else {
        hide("inboxEmpty");
        renderMessages(listEl, messages);
      }

      setText("inboxStatus", `Updated ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(err);
      listEl.innerHTML = "";
      hide("inboxEmpty");
      show("inboxError");
      $("inboxError").innerHTML =
        `Inbox error: <strong>${escapeHtml(err.message)}</strong>`;
      setText("inboxStatus", "");
    }
  }

  async function openMessage(messageId) {
    if (!currentToken) return;

    openedMessageId = messageId;
    setText("emailModalTitle", "Message");
    setText("emailMeta", "—");
    $("emailBody").innerHTML = "";
    $("emailLoading").classList.remove("d-none");

    // open modal first (nice UX)
    const m = getModal();
    m?.show();

    try {
      // 1) message detail
      const msg = await request(`/messages/${messageId}`, { token: currentToken });

      // 2) mark as seen (optional but makes your list update)
      try {
        await request(`/messages/${messageId}`, {
          method: "PATCH",
          token: currentToken,
          body: { seen: true },
        });
      } catch (_) {
        // ignore if it fails
      }

      // 3) fetch source for body content
      // msg.intro exists, but full content is in /sources/{id}
      let html = "";
      let text = "";

      if (msg?.source?.id) {
        const source = await request(`/sources/${msg.source.id}`, { token: currentToken });
        html = source?.data?.html || source?.html || "";
        text = source?.data?.text || source?.text || "";
      } else if (msg?.intro) {
        text = msg.intro;
      }

      setText("emailModalTitle", msg.subject || "(no subject)");
      const from = msg.from?.address || "Unknown sender";
      const when = formatDate(msg.createdAt);
      setText("emailMeta", `From: ${from} • ${when}`);

      $("emailLoading").classList.add("d-none");
      renderEmailBody($("emailBody"), { html, text });

      // refresh the list so "New" badge disappears
      loadMessages();
    } catch (err) {
      console.error(err);
      $("emailLoading").classList.add("d-none");
      $("emailBody").innerHTML =
        `<div class="alert alert-danger">Failed to open message: <strong>${escapeHtml(err.message)}</strong></div>`;
    }
  }

  async function deleteOpenedMessage() {
    if (!currentToken || !openedMessageId) return;

    try {
      await request(`/messages/${openedMessageId}`, {
        method: "DELETE",
        token: currentToken,
      });

      // close modal + refresh list
      getModal()?.hide();
      openedMessageId = null;
      await loadMessages();
    } catch (err) {
      console.error(err);
      $("emailBody").insertAdjacentHTML(
        "afterbegin",
        `<div class="alert alert-warning">Delete failed: <strong>${escapeHtml(err.message)}</strong></div>`
      );
    }
  }

  // Click on message list (event delegation)
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    openMessage(btn.dataset.id);
  });

  // Refresh button
  refreshBtn?.addEventListener("click", loadMessages);

  // Delete button in modal
  $("emailDelete")?.addEventListener("click", deleteOpenedMessage);

  // Start polling
  function start() {
    if (pollTimer) clearInterval(pollTimer);
    loadMessages();
    pollTimer = setInterval(loadMessages, pollMs);
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  // Optional: auto-start
  if (autoStart) start();

  // Optional: listen for session changes (when your temp email generator sets sessionStorage)
  window.addEventListener("storage", (evt) => {
    if (evt.key === "mailtm.session") loadMessages();
  });

  return { start, stop, refresh: loadMessages };
}
