// app.js
import { createRandomAccount } from "./mailtmClient.js";

const els = {
  btn: document.getElementById("generateTempEmail"),
  spinner: document.getElementById("genSpinner"),
  consent: document.getElementById("privacyConsent"),
  displayName: document.getElementById("displayName"),
  purpose: document.getElementById("purpose"),
  chip: document.getElementById("tempEmailChip"),
  value: document.getElementById("tempEmailValue"),
  copyBtn: document.getElementById("copyTempEmail"),
  newsletterEmail: document.getElementById("newsletterEmail"),
  countdown: document.getElementById("countdown"),
};

function setLoading(isLoading) {
  if (els.spinner) els.spinner.classList.toggle("d-none", !isLoading);
  if (els.btn) els.btn.disabled = isLoading;
}

function startCountdown(seconds = 15 * 60) {
  if (!els.countdown) return;
  els.countdown.classList.remove("d-none");

  let remaining = seconds;
  const timer = setInterval(() => {
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    els.countdown.textContent = `Expires in ${m}:${s}`;
    remaining--;
    if (remaining < 0) {
      clearInterval(timer);
      els.countdown.textContent = "Expired — generate a new one";
    }
  }, 1000);
}

async function handleGenerateTempEmail() {
  if (els.consent && !els.consent.checked) {
    // Use Bootstrap alert/toast if you want — keeping it simple:
    alert("Please agree to the Privacy Policy first.");
    return;
  }

  const displayName = els.displayName?.value || "";
  const purpose = els.purpose?.value || "newsletter";

  setLoading(true);

  try {
    const session = await createRandomAccount({ displayName, purpose });

    // Update UI
    if (els.value) els.value.textContent = session.address;
    if (els.chip) els.chip.classList.remove("d-none");
    if (els.newsletterEmail) els.newsletterEmail.value = session.address;

    startCountdown();

    // Save if you want (token/password/id)
    sessionStorage.setItem("mailtm.session", JSON.stringify(session));

  } catch (err) {
    console.error(err);
    alert(`Failed to generate temp email: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

async function handleCopy() {
  const email = els.value?.textContent?.trim();
  if (!email || email === "—") return;

  try {
    await navigator.clipboard.writeText(email);
  } catch (e) {
    console.error(e);
    alert("Copy