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
  loadBlockedPeriods();
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
  reasonInput.value = "";
  loadBlockedPeriods();
}

async function loadBlockedPeriods() {
  const listEl = document.getElementById("blocked-list");
  listEl.innerHTML = "<p class=\"page-note\">Loading…</p>";

  const today = new Date();
  const pad = n => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data, error } = await supabaseClient
    .from("busy_periods")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .gte("end_date", todayStr)
    .order("start_date", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"page-note\">Nothing currently blocked.</p>";
    return;
  }

  listEl.innerHTML = "";
  data.forEach(row => {
    const el = document.createElement("div");
    el.className = "appointment-row";
    el.innerHTML = `
      <div>
        <strong>${formatDate(row.start_date)} – ${formatDate(row.end_date)}</strong><br>
        ${row.reason || "No reason given"}
      </div>
      <button class="secondary-btn cancel-btn" data-id="${row.id}">Unblock</button>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => unblockPeriod(btn.dataset.id));
  });
}

async function unblockPeriod(id) {
  const { error } = await supabaseClient.from("busy_periods").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  loadBlockedPeriods();
}

document.getElementById("login-btn").addEventListener("click", handleLogin);
document.getElementById("sign-out-btn").addEventListener("click", handleSignOut);
document.getElementById("busy-btn").addEventListener("click", handleBlockPeriod);

checkSession();
