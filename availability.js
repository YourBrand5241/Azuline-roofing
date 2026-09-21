const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "azuline-roofing";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function loadBusyPeriods() {
  const listEl = document.getElementById("busy-list");
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
    listEl.innerHTML = `
      <div class="busy-row">
        <div>
          <div class="busy-dates status-open">✓ Currently taking on new work</div>
          <div class="busy-reason">No booked-out periods right now — get in touch to discuss timing.</div>
        </div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = "";
  data.forEach(row => {
    const el = document.createElement("div");
    el.className = "busy-row";
    el.innerHTML = `
      <div>
        <div class="busy-dates status-busy">Booked: ${formatDate(row.start_date)} – ${formatDate(row.end_date)}</div>
        <div class="busy-reason">${row.reason || "Existing job in progress"}</div>
      </div>
    `;
    listEl.appendChild(el);
  });
}

loadBusyPeriods();
