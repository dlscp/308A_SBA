// newsletterDemoSend.js
// Demo "subscribe" to send a fake demo email to populate the temp inbox on the page.

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
  e.preventDefault(); 

  
  if ($("company")?.value?.trim()) return; // this will break my tests if removed, unsure why

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
    // Fake delay 
    await new Promise((r) => setTimeout(r, 600));

    setStatus("Subscribed! Check the inbox above", "success");

    // Trigger demo email appearing in inbox
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
