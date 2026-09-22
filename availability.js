const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "azuline-roofing";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let viewYear, viewMonth; // 0-indexed month
let busyPeriods = [];

function pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function isDateBusy(dateStr) {
  return busyPeriods.some(p => dateStr >= p.start_date && dateStr <= p.end_date);
}

async function loadBusyPeriods() {
  const { data } = await supabaseClient
    .from("busy_periods")
    .select("start_date, end_date")
    .eq("business_id", BUSINESS_ID);
  busyPeriods = data || [];
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

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    const el = document.createElement("div");
    const busy = isDateBusy(dateStr);
    const isPast = dateStr < todayStr;
    el.className = `calendar-day ${busy ? "day-unavailable" : "day-available"}`;
    if (isPast) el.style.opacity = "0.4";
    el.textContent = d;
    grid.appendChild(el);
  }
}

document.getElementById("prev-month").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});

(async function init() {
  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  await loadBusyPeriods();
  renderCalendar();
})();
