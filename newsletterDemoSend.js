// newsletterDemoSend.js
// Demo "subscribe" flow that triggers the demo inbox injection event.

const $ = (id) => document.getElementById(id);

function setStatus(msg, type = "muted") {
  const el = $("newsletterStatus");
  if (!el) return;

  el.className =
    "small " +
    (type === "success" ? "text-success" :
     type === "danger"  ? "text-danger"  :
     type === "warning" ? "text-warning" : "text-secondary");

  el.textContent = msg;
}

function setLoading(isLoading) {
  const spinner = $("subSpinner");
  const btn = document.querySelector("#newsletterForm button[type='submit']");
  if (spinner) spinner.classList.toggle("d-none", !isLoading);
  if (btn) btn.disabled = isLoading;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleNewsletterSubmit(e) {
  e.preventDefault(); //  prevents page reload (super important)

  // Honeypot
  if ($("company")?.value?.trim()) return;

  const email = $("newsletterEmail")?.value?.trim() || "";
  const optIn = $("optIn")?.checked;

  if (!email || !isValidEmail(email)) {
    setStatus("Enter a valid email address.", "warning");
    return;
  }
  if (!optIn) {
    setStatus("Please check the consent box.", "warning");
    return;
  }

  setLoading(true);
  setStatus("Subscribing…", "muted");

  try {
    // Fake "success" delay for demo realism
    await new Promise((r) => setTimeout(r, 600));

    setStatus("Subscribed! Check the inbox below ", "success");

    // THIS is what triggers demo inbox injection
    window.dispatchEvent(new CustomEvent("newsletter:sent", {
      detail: { to: email }
    }));

    console.log("[newsletter] dispatched newsletter:sent", email);
  } catch (err) {
    console.error(err);
    setStatus("Subscribe failed.", "danger");
  } finally {
    setLoading(false);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const form = $("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", handleNewsletterSubmit);
});
