const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "a1-plastering";
const BUSINESS_NAME = "A1 Plastering";

const EMAILJS_SERVICE_ID = "service_zzjha2e";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";

// Swap this for the real link once A1 Plastering's Google Business Profile
// is set up and verified — see "Ask for reviews" on the profile.
const GOOGLE_REVIEW_LINK = "PASTE_YOUR_GOOGLE_REVIEW_LINK_HERE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) await enterDashboard(session);
}

async function enterDashboard(session) {
  const { data: ownerRows, error } = await supabaseClient
    .from("business_owners")
    .select("business_id")
    .eq("business_id", BUSINESS_ID)
    .eq("owner_user_id", session.user.id);

  if (error || !ownerRows || ownerRows.length === 0) {
    document.getElementById("login-message").textContent = "This account isn't linked to A1 Plastering.";
    await supabaseClient.auth.signOut();
    return;
  }

  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  document.getElementById("signed-in-as").textContent = `Signed in as ${session.user.email}`;

  loadQuotes();
  await loadBusyPeriods();
  initCalendar();
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");

  if (!email || !password) {
    message.textContent = "Enter both email and password.";
    return;
  }

  message.textContent = "Signing in…";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    message.textContent = "Sign in failed — check your email and password.";
    return;
  }

  message.textContent = "";
  await enterDashboard(data.session);
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

async function loadQuotes() {
  const listEl = document.getElementById("quotes-list");
  listEl.innerHTML = "<p class=\"page-note\">Loading…</p>";

  const { data, error } = await supabaseClient
    .from("quote_requests")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"page-note\">No quote requests yet.</p>";
    return;
  }

  listEl.innerHTML = "";
  data.forEach(row => {
    const el = document.createElement("div");
    el.className = "appointment-row";
    el.innerHTML = `
      <div>
        <strong>${row.customer_name}</strong> — ${row.service_type || "General enquiry"}<br>
        ${row.property_address || "No address given"}<br>
        ${row.customer_phone} · ${row.customer_email}<br>
        ${row.details ? `<em>${row.details}</em>` : ""}
      </div>
      <button class="secondary-btn cancel-btn" data-id="${row.id}">Remove</button>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => removeQuote(btn.dataset.id));
  });
}

async function removeQuote(id) {
  if (!confirm("Remove this quote request? This can't be undone.")) return;
  const { error } = await supabaseClient.from("quote_requests").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  loadQuotes();
}

async function handleBlockPeriod() {
  const startInput = document.getElementById("busy-start");
  const endInput = document.getElementById("busy-end");
  const nameInput = document.getElementById("busy-customer-name");
  const addressInput = document.getElementById("busy-address");
  const emailInput = document.getElementById("busy-email");
  const phoneInput = document.getElementById("busy-phone");
  const reasonInput = document.getElementById("busy-reason");
  const message = document.getElementById("busy-message");

  if (!startInput.value || !endInput.value) {
    message.textContent = "Choose both a start and end date.";
    return;
  }
  if (endInput.value < startInput.value) {
    message.textContent = "End date must be after the start date.";
    return;
  }

  const { error } = await supabaseClient.from("busy_periods").insert({
    business_id: BUSINESS_ID,
    start_date: startInput.value,
    end_date: endInput.value,
    customer_name: nameInput.value.trim() || null,
    property_address: addressInput.value.trim() || null,
    customer_email: emailInput.value.trim() || null,
    customer_phone: phoneInput.value.trim() || null,
    reason: reasonInput.value.trim() || null,
  });

  if (error) {
    message.textContent = "Something went wrong — please try again.";
    console.error(error);
    return;
  }

  const customerEmail = emailInput.value.trim();
  if (customerEmail && window.emailjs) {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: customerEmail,
      to_name: nameInput.value.trim() || "there",
      business_name: BUSINESS_NAME,
      email_subject: `Your job is booked in — ${BUSINESS_NAME}`,
      email_body: `Hi ${nameInput.value.trim() || "there"},\n\nYour job with ${BUSINESS_NAME} is booked in.\n\nDates: ${startInput.value} to ${endInput.value}\n${addressInput.value.trim() ? `Address: ${addressInput.value.trim()}\n` : ""}${reasonInput.value.trim() ? `Job: ${reasonInput.value.trim()}\n` : ""}\nWe'll see you then. If anything needs to change, just get in touch.`,
    }).catch(err => console.error("Job confirmation email failed to send:", err));
  }

  message.textContent = "Blocked.";
  startInput.value = "";
  endInput.value = "";
  nameInput.value = "";
  addressInput.value = "";
  emailInput.value = "";
  phoneInput.value = "";
  reasonInput.value = "";
  await loadBusyPeriods();
  renderCalendar();
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let viewYear, viewMonth;
let busyPeriods = [];

function pad2(n) { return String(n).padStart(2, "0"); }
function toDateStr(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

function findPeriodForDate(dateStr) {
  return busyPeriods.find(p => dateStr >= p.start_date && dateStr <= p.end_date);
}

async function loadBusyPeriods() {
  const { data } = await supabaseClient
    .from("busy_periods")
    .select("*")
    .eq("business_id", BUSINESS_ID);
  busyPeriods = data || [];
}

function initCalendar() {
  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  renderCalendar();
  document.getElementById("prev-month").addEventListener("click", () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-label");
  label.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  grid.innerHTML = "";
  DAY_LABELS.forEach(d => {
    const el = document.createElement("div");
    el.className = "calendar-daylabel";
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement("div");
    el.className = "calendar-day day-other-month";
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    const period = findPeriodForDate(dateStr);
    const el = document.createElement("div");
    el.className = `calendar-day ${period ? "day-unavailable" : "day-available"}`;
    el.textContent = d;
    if (period) {
      el.addEventListener("click", () => showDayDetail(period));
    }
    grid.appendChild(el);
  }
}

function showDayDetail(period) {
  const detail = document.getElementById("day-detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <strong>${formatDate(period.start_date)} – ${formatDate(period.end_date)}</strong><br><br>
    <strong>Customer:</strong> ${period.customer_name || "Not given"}<br>
    <strong>Address:</strong> ${period.property_address || "Not given"}<br>
    <strong>Email:</strong> ${period.customer_email || "Not given"}<br>
    <strong>Phone:</strong> ${period.customer_phone || "Not given"}<br>
    <strong>Job details:</strong> ${period.reason || "Not given"}<br><br>
    <button class="btn" id="complete-current-btn" style="margin-bottom:8px">Mark as Completed &amp; Request Review</button><br>
    <button class="secondary-btn cancel-btn" id="unblock-current-btn">Unblock This Period (no review request)</button>
    <p id="complete-message" class="slot-message"></p>
  `;
  document.getElementById("unblock-current-btn").addEventListener("click", () => unblockPeriod(period.id));
  document.getElementById("complete-current-btn").addEventListener("click", () => markCompletedAndRequestReview(period));
}

async function markCompletedAndRequestReview(period) {
  const message = document.getElementById("complete-message");

  if (period.customer_email && window.emailjs) {
    message.textContent = "Sending review request...";
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: period.customer_email,
        to_name: period.customer_name || "there",
        business_name: BUSINESS_NAME,
        email_subject: `How did we do? — ${BUSINESS_NAME}`,
        email_body: `Hi ${period.customer_name || "there"},\n\nThanks for choosing ${BUSINESS_NAME} for your recent job${period.reason ? ` (${period.reason})` : ""}. We hope you're happy with the results!\n\nIf you have a moment, we'd really appreciate a quick Google review — it makes a huge difference for a small business like ours:\n${GOOGLE_REVIEW_LINK}\n\nThank you for your business!`,
      });
    } catch (err) {
      console.error("Review request email failed to send:", err);
    }
  }

  const { error } = await supabaseClient.from("busy_periods").delete().eq("id", period.id);
  if (error) {
    message.textContent = "Marked, but couldn't clear the calendar — please try again.";
    return;
  }

  document.getElementById("day-detail").classList.add("hidden");
  await loadBusyPeriods();
  renderCalendar();
}

async function unblockPeriod(id) {
  const { error } = await supabaseClient.from("busy_periods").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  document.getElementById("day-detail").classList.add("hidden");
  await loadBusyPeriods();
  renderCalendar();
}

document.getElementById("login-btn").addEventListener("click", handleLogin);
document.getElementById("sign-out-btn").addEventListener("click", handleSignOut);
document.getElementById("busy-btn").addEventListener("click", handleBlockPeriod);

checkSession();
