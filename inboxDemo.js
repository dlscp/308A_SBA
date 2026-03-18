// inboxDemo.js 
// Demo inbox that shows fake emails with no real email connection.
//
// HTML IDs:
// inboxList, inboxEmpty, inboxError, inboxAddress,
// emailModal, emailModalTitle, emailMeta, emailBody, emailLoading
//
//
// - Starts EMPTY by default with alert message
// - Injects a demo email when "newsletter:sent" event fires
// - Clears inbox on refresh

const STORE_KEY = "demo.inbox.messages";
const $ = (id) => document.getElementById(id);

// helpers 
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
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs) {
  sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs));
}

function clearMessages() {
  sessionStorage.removeItem(STORE_KEY);
}

function makeId() {
  return crypto.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

// Page render
function renderList() {
  const listEl = $("inboxList");
  if (!listEl) return;

  hide("inboxError");

  const session = getSession();
  setText("inboxAddress", session?.address || "—");

  const msgs = loadMessages().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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

    // Empty inbox alert message
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

// Open message events
function openMessage(id) {
  const msgs = loadMessages();
  const msg = msgs.find((m) => m.id === id);
  if (!msg) return;

  // mark as seen
  msg.seen = true;
  saveMessages(msgs);
  renderList();

  setText("emailModalTitle", msg.subject || "(no subject)");
  setText("emailMeta", `From: ${msg.from} • ${formatDate(msg.createdAt)}`);

  const loading = $("emailLoading");
  const body = $("emailBody");
  if (loading) loading.classList.add("d-none");

  if (body) {
    
    body.innerHTML =
      msg.html ||
      `<pre class="mb-0" style="white-space: pre-wrap;">${escapeHtml(msg.text || "")}</pre>`;
  }

  const modalEl = $("emailModal");
  if (modalEl && window.bootstrap?.Modal) {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  } else {
    alert(`${msg.subject}\n\n${msg.text || ""}`);
  }
}

//  demo email + content
function addDemoEmail({
  subject = "Thanks for being part of the future! You gifts have arrived.",
  from = "CipherFlux <no-reply@cipherflux.example>",
  html,
  text,
} = {}) {
  const session = getSession();
  const to = session?.address || $("newsletterEmail")?.value?.trim() || "demo@demo";

  const message = {
    id: makeId(),
    to,
    from,
    subject,
    createdAt: new Date().toISOString(),
    seen: false,
    html: html || `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #eaeaea; background: #0b1220; padding: 18px; border-radius: 14px;">
  <!-- Header -->
  <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 14px;">
    <div>
      <div style="font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:#93c5fd;">
        CipherFlux Newsletter
      </div>
      <h2 style="margin:6px 0 0; font-size:22px;">
        Welcome aboard! 🎉
      </h2>
    </div>

    <!-- “Logo” chip -->
    <div style="background: rgba(147, 197, 253, 0.12); border: 1px solid rgba(147, 197, 253, 0.25); padding: 8px 10px; border-radius: 999px; font-size:12px; color:#bfdbfe;">
      CFx • Welcome Kit
    </div>
  </div>

  <!-- Intro -->
  <p style="margin: 0 0 12px; color:#cbd5e1;">
    Thanks for subscribing — you’re officially on the list. Below are your welcome gifts and quick links to get started on giving us your money.
  </p>

  <!-- Main CTA buttons -->
  <div style="display:flex; flex-wrap:wrap; gap:10px; margin: 14px 0 18px;">
    <a href="https://clickhole.com/i-read-a-book-and-the-book-was-327-pages-long-and-the-book-was-about-sailors/" style="text-decoration:none; background: linear-gradient(90deg,#22d3ee,#a78bfa); color:#0b1220; font-weight:700; padding:10px 14px; border-radius:10px; display:inline-block;">
      Open Welcome Kit
    </a>
    <a href="https://clickhole.com/give-mommys-jewelry-to-your-school-friends/" style="text-decoration:none; background: rgba(255,255,255,0.08); color:#e2e8f0; border: 1px solid rgba(255,255,255,0.18); padding:10px 14px; border-radius:10px; display:inline-block;">
      Manage Preferences
    </a>
    
  </div>

  <!-- Gift list -->
  <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px; margin-bottom: 14px;">
    <div style="font-weight:700; margin-bottom: 8px;">Your welcome gifts</div>

    <ul style="margin: 0; padding-left: 18px; color:#e2e8f0;">
      <li style="margin: 8px 0;">
        <strong>Automation Playbook (PDF)</strong>
        <span style="color:#94a3b8;">— best practices + quick wins for your gifted credits</span>
        <div style="margin-top:6px;">
          <a href="https://www.getcybersafe.gc.ca/sites/default/files/real-examples-of-fake-online-stores-e.pdf" style="color:#93c5fd; text-decoration: underline;">
            Download PDF
          </a>
        </div>
      </li>

      <li style="margin: 8px 0;">
        <strong>Starter Intake Form (Template)</strong>
        <span style="color:#94a3b8;">— give us your sensitive data here</span>
        <div style="margin-top:6px;">
          <a href="https://theonion.com/horoscopes/pisces/" style="color:#93c5fd; text-decoration: underline;">
            View Template
          </a>
        </div>
      </li>

      <li style="margin: 8px 0;">
        <strong>Early Access Portal</strong>
        <span style="color:#94a3b8;">— join the malicious waitlist</span>
        <div style="margin-top:6px;">
          <a href="https://clickhole.com/psst-hey-kid-heres-8-seconds-of-an-r-rated-movie-called-robocop/" style="color:#93c5fd; text-decoration: underline;">
            Request Access
          </a>
        </div>
      </li>
    </ul>
  </div>

  <!-- Attachments -->
  <div style="margin: 12px 0 6px; font-weight:700;">Attachments</div>
  <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 14px;">
    <div style="background: rgba(34, 211, 238, 0.10); border: 1px solid rgba(34, 211, 238, 0.22); padding: 10px 12px; border-radius: 12px; min-width: 220px;">
      <div style="font-weight:700;">📎 Automation_Playbook.pdf</div>
      <div style="font-size:12px; color:#94a3b8;">PDF • 1.2 MB • Gift attachment</div>
    </div>

    <div style="background: rgba(167, 139, 250, 0.10); border: 1px solid rgba(167, 139, 250, 0.22); padding: 10px 12px; border-radius: 12px; min-width: 220px;">
      <div style="font-weight:700;">📎 Starter_Form_Template.docx</div>
      <div style="font-size:12px; color:#94a3b8;">DOCX • 84 KB • Gift attachment</div>
    </div>

    <div style="background: rgba(250, 204, 21, 0.10); border: 1px solid rgba(250, 204, 21, 0.22); padding: 10px 12px; border-radius: 12px; min-width: 220px;">
      <div style="font-weight:700;">📎 Quick_Start_Checklist.txt</div>
      <div style="font-size:12px; color:#94a3b8;">Text • 4 KB • Gift attachment</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid rgba(255,255,255,0.12); padding-top: 12px; color:#94a3b8; font-size:12px;">
    <div style="margin-bottom:6px;">
      You’re receiving this because you subscribed to CipherFlux updates.
    </div>
    <div>
      © CipherFlux • <a href="https://clickhole.com/a-good-idea-you-should-draw-on-the-wall-with-a-marker-second/" style="color:#93c5fd;">Privacy</a> •
      <a href="https://clickhole.com/the-abcs-of-numbers/" style="color:#93c5fd;">Support</a>
    </div>
    
  </div>
</div>

    `,
    text: text || "Welcome! Thanks for subscribing. (Demo mode)",
  };

  const msgs = loadMessages();
  msgs.unshift(message);
  saveMessages(msgs);
  renderList();
}

// init demo inbox
export function initDemoInbox({
  clearOnRefresh = true,     // makes inbox empty after refresh
  hookNewsletterEvent = true // inject when Subscribe fires newsletter:sent
} = {}) {
  const listEl = $("inboxList");
  if (!listEl) {
    console.warn("initDemoInbox: #inboxList not found (did you paste the inbox HTML?)");
    return;
  }

  // Clear persisted demo messages each time page loads - so inbox starts empty (previously had issues with local storage)
  if (clearOnRefresh) clearMessages();

  // click-to-open
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    openMessage(btn.dataset.id);
  });

  // inject when newsletter says "sent"
  if (hookNewsletterEvent) {
    window.addEventListener("newsletter:sent", () => {
      addDemoEmail();
    });
  }

  // initial render: empty
  renderList();

  
  return {
    addDemoEmail,
    clear: () => {
      clearMessages();
      renderList();
    },
    render: renderList
  };
}
