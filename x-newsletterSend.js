/**
 * newsletterSend.js
 * - On Subscribe click: sends a "Welcome / freebies" email to the address in #newsletterEmail
 * - Uses EmailJS REST API (no Node backend)
 * - Uses the temp email session stored by your temp email module in sessionStorage key: "mailtm.session"
 *
 * Requirements:
 * 1) Create EmailJS account + connect email service + create template
 * 2) Put your EmailJS keys below
 * 3) Run on http://localhost (Live Server)
 */

// // ======================
// // EmailJS configuration
// // ======================
// // Get these from EmailJS dashboard:
// // service_id, template_id, public key (user_id)
// const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
// const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
// const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

// // EmailJS REST endpoint (documented)
// const EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send";

// // ======================
// // DOM helpers
// // ======================
// const $ = (id) => document.getElementById(id);

// function setStatus(msg, type = "muted") {
//   const el = $("newsletterStatus");
//   if (!el) return;

//   // You can map to bootstrap text classes
//   const cls =
//     type === "success" ? "text-success" :
//     type === "danger" ? "text-danger" :
//     type === "warning" ? "text-warning" :
//     "text-secondary";

//   el.className = `small ${cls}`;
//   el.textContent = msg;
// }

// function setLoading(isLoading) {
//   const spinner = $("subSpinner");
//   const btn = document.querySelector("#newsletterForm button[type='submit']");
//   if (spinner) spinner.classList.toggle("d-none", !isLoading);
//   if (btn) btn.disabled = isLoading;
// }

// function getMailTmSession() {
//   try {
//     return JSON.parse(sessionStorage.getItem("mailtm.session") || "null");
//   } catch {
//     return null;
//   }
// }

// // ====================== NOT DOING THIS 
// // EmailJS send (REST)
// // ======================
// // EmailJS expects: { service_id, template_id, user_id, template_params }
// // Docs: POST https://api.emailjs.com/api/v1.0/email/send [3](https://www.emailjs.com/docs/rest-api/send/)
// async function sendWelcomeEmail({ toEmail, firstName, replyTo }) {
//   const payload = {
//     service_id: EMAILJS_SERVICE_ID,
//     template_id: EMAILJS_TEMPLATE_ID,
//     user_id: EMAILJS_PUBLIC_KEY,
//     template_params: {
//       // These keys must match your template variables in EmailJS
//       to_email: toEmail,
//       first_name: firstName || "",
//       reply_to: replyTo || "",
//       subject: "Welcome! Here are your freebies",
//       message_html: `
//         <h2>Welcome${firstName ? `, ${firstName}` : ""}!</h2>
//         <p>Thanks for subscribing. Here are your goodies:</p>
//         <ul>
//           <li>Free automation playbook PDF</li>
//           <li>Starter templates</li>
//           <li>Early access link</li>
//         </ul>
//         <p><strong>Tip:</strong> If you're using a temp email, this message should appear instantly in your inbox below.</p>
//       `
//     }
//   };

//   const res = await fetch(EMAILJS_SEND_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   // EmailJS returns 200 "OK" on success per docs [3](https://www.emailjs.com/docs/rest-api/send/)
//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(`Email send failed (${res.status}): ${text || res.statusText}`);
//   }

//   return true;
// }

// ======================
// Main handler
// ======================
async function handleNewsletterSubmit(e) {
  e.preventDefault();

  // Honeypot check
  const company = $("company");
  if (company && company.value.trim() !== "") {
    // silently ignore bots
    return;
  }

  const emailEl = $("newsletterEmail");
  const nameEl = $("firstName");
  const optIn = $("optIn");

  const toEmail = emailEl?.value?.trim();
  const firstName = nameEl?.value?.trim() || "";

  if (!toEmail) {
    setStatus("Please enter an email address.", "warning");
    return;
  }

  if (optIn && !optIn.checked) {
    setStatus("Please consent to receive emails.", "warning");
    return;
  }

  // Pull the temp email from session storage (created by your temp email module)
  const session = getMailTmSession();
  const tempAddress = session?.address || "";

  // You asked: "sent from the temp email created on page loading"
  // In practice we cannot truly send "from" that address using mail.tm.
  // But we can set Reply-To = temp address so replies go there. [2](https://learn.microsoft.com/en-us/answers/questions/5550446/avoiding-spf-failures-in-automated-emails-across-d)
  const replyTo = tempAddress;

  setLoading(true);
  setStatus("Sending welcome email…", "muted");

  try {
    // Send to the email in the newsletter field (likely the temp email)
    await sendWelcomeEmail({ toEmail, firstName, replyTo });

    setStatus("Subscribed! Check your inbox below ✅", "success");

    // Tell the inbox module to refresh sooner (optional)
    window.dispatchEvent(new CustomEvent("newsletter:sent"));
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`, "danger");
  } finally {
    setLoading(false);
  }
}

// ======================
// Init
// ======================
window.addEventListener("DOMContentLoaded", () => {
  const form = $("newsletterForm");
  if (!form) {
    console.warn("newsletterSend.js: #newsletterForm not found.");
    return;
  }

  // Hook submit
  form.addEventListener("submit", handleNewsletterSubmit);

  // Optional: auto-fill newsletter email with temp session if present
  const session = getMailTmSession();
  const emailEl = $("newsletterEmail");
  if (session?.address && emailEl && !emailEl.value) {
    emailEl.value = session.address;
  }
});
