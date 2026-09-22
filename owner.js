const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "azuline-roofing";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
    document.getElementById("login-message").textContent = "This account isn't linked to Azuline Roofing.";
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
    <button class="secondary-btn cancel-btn" id="unblock-current-btn">Unblock This Period</button>
  `;
  document.getElementById("unblock-current-btn").addEventListener("click", () => unblockPeriod(period.id));
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
