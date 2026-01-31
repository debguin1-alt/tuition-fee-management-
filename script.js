/* ================= CONFIG ================= */
const STORAGE_KEY = "deb_guin_data";
const YUVO_INDEX = 4;

/* ================= GLOBAL ================= */
let deb_guin = {
  name: "Deb Guin",
  total_paid: 0,
  teachers: []
};

let current_day, current_month, current_year;

/* ================= DATE ================= */
function updateSystemDate() {
  const d = new Date();
  current_day = d.getDate();
  current_month = d.getMonth() + 1;
  current_year = d.getFullYear();

  const el = document.getElementById("date-display");
  if (el) {
    el.innerText = `Today: ${d.toDateString()}`;
  }
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const getMonthName = m => MONTHS[m - 1] || "???";

/* ================= HELPERS ================= */
function normalizeData() {
  deb_guin.teachers.forEach(t => {
    t.last_paid_day = Number(t.last_paid_day) || 0;
    t.last_paid_month = Number(t.last_paid_month) || 0;
    t.last_paid_year = Number(t.last_paid_year) || 0;
    t.monthly_fee = Number(t.monthly_fee) || 0;
    t.late_fee_days = Number(t.late_fee_days) || 0;
    t.late_fee_amount = Number(t.late_fee_amount) || 0;
    t.payments = Array.isArray(t.payments) ? t.payments : [];
  });
}

function monthsDue(lastMonth, lastYear) {
  if (!lastMonth || !lastYear) return 0;

  let m = lastMonth + 1;
  let y = lastYear;

  if (m > 12) {
    m = 1;
    y++;
  }

  if (y > current_year || (y === current_year && m > current_month)) {
    return 0;
  }

  return (current_year - y) * 12 + (current_month - m) + 1;
}

function calculateYuvoLateFee() {
  const t = deb_guin.teachers[YUVO_INDEX];
  if (current_day < t.late_fee_days) return 0;
  return (current_day - t.late_fee_days) * t.late_fee_amount;
}

function calculateTotalDue(i) {
  const t = deb_guin.teachers[i];
  const dueMonths = monthsDue(t.last_paid_month, t.last_paid_year);
  let total = dueMonths * t.monthly_fee;

  if (i === YUVO_INDEX && dueMonths > 0) {
    total += calculateYuvoLateFee();
  }

  return total;
}

/* ================= STORAGE ================= */
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deb_guin));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    deb_guin = JSON.parse(data);
    normalizeData();
  }
}

/* ================= IMPORT / EXPORT ================= */
async function autoImportJSON() {
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) return;
    deb_guin = await res.json();
    normalizeData();
    saveData();
    console.log("✅ data.json imported");
  } catch (e) {
    console.log("ℹ️ No data.json found");
  }
}

function exportBackup() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return alert("No data to export");

  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function forceImport() {
  if (!confirm("Restore data from backup? This will overwrite current data.")) return;
  localStorage.removeItem(STORAGE_KEY);
  await autoImportJSON();
  loadData();
  displayMenu();
}

/* ================= UI ================= */
function displayMenu() {
  const list = document.getElementById("teachers-list");
  const totalEl = document.getElementById("grand-total");
  if (!list || !totalEl) return;

  let html = "";
  let grand = 0;

  deb_guin.teachers.forEach((t, i) => {
    const dueMonths = monthsDue(t.last_paid_month, t.last_paid_year);
    const total = calculateTotalDue(i);
    grand += total;

    html += `
      <div class="teacher">
        <b>${i + 1}. ${t.name}</b> (${t.subject})<br>
        Last Paid: ${
          t.last_paid_month
            ? getMonthName(t.last_paid_month) + " " + t.last_paid_year
            : "Never"
        }<br>
        Due: ${dueMonths} months = Rs.${total}
      </div><hr>`;
  });

  list.innerHTML = html;
  totalEl.innerText = `TOTAL DUE: Rs.${grand}`;
}

/* ================= ACTIONS ================= */
function markPayment() {
  const idx = parseInt(prompt("Enter teacher number:")) - 1;
  if (isNaN(idx) || idx < 0 || idx >= deb_guin.teachers.length) {
    return alert("Invalid teacher");
  }

  const months = parseInt(prompt("How many months to pay?"));
  if (isNaN(months) || months <= 0) {
    return alert("Invalid months");
  }

  const t = deb_guin.teachers[idx];
  let newMonth = t.last_paid_month + months;
  let newYear = t.last_paid_year;

  while (newMonth > 12) {
    newMonth -= 12;
    newYear++;
  }

  const amount = months * t.monthly_fee;

  t.payments.push({
    day: current_day,
    month: current_month,
    year: current_year,
    amount
  });

  t.last_paid_day = current_day;
  t.last_paid_month = newMonth;
  t.last_paid_year = newYear;
  deb_guin.total_paid += amount;

  saveData();
  displayMenu();
  alert(`Paid Rs.${amount}`);
}

function showStatus() {
  let html = "<b>Current Status</b><br><br>";
  deb_guin.teachers.forEach((t, i) => {
    html += `${t.name}: Rs.${calculateTotalDue(i)} due<br>`;
  });
  document.getElementById("output").innerHTML = html;
}

function showHistory() {
  let html = "<b>Payment History</b><br><br>";
  deb_guin.teachers.forEach(t => {
    html += `<b>${t.name}</b><br>`;
    if (!t.payments.length) {
      html += "No payments<br>";
    } else {
      t.payments.forEach(p => {
        html += `${p.day} ${getMonthName(p.month)} ${p.year} - Rs.${p.amount}<br>`;
      });
    }
    html += "<br>";
  });
  document.getElementById("output").innerHTML = html;
}

/* ================= INIT ================= */
(async function init() {
  updateSystemDate();

  if (!localStorage.getItem(STORAGE_KEY)) {
    await autoImportJSON(); // ✅ only first run
  }

  loadData();
  displayMenu();
    /* ================= SERVICE WORKER ================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("✅ Service Worker registered"))
      .catch(err => console.error("❌ SW registration failed", err));
  });
}
})();
