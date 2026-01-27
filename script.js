const NUM_TEACHERS = 7;
const YUVO_INDEX = 4;
const DB_NAME = 'FeeManagerDB';
const STORE_NAME = 'data';

let deb_guin = { name: "Deb Guin", total_paid: 0, teachers: [] };
let current_day, current_month, current_year;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function initDefaultData() {
  deb_guin.teachers = [
    { name: "Snigdhadeep Chakraborty", subject: "Math", monthly_fee: 500, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] },
    { name: "Prasun Banerjee", subject: "Chemistry", monthly_fee: 500, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] },
    { name: "Sumit Sir", subject: "English", monthly_fee: 400, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] },
    { name: "Debabrata Sir", subject: "Bengali", monthly_fee: 300, last_paid_month: 6, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] },
    { name: "Yuvo Comp. Centre", subject: "DDTA", monthly_fee: 700, last_paid_month: 12, last_paid_year: 2025, late_fee_days: 20, late_fee_amount: 2, payments: [] },
    { name: "Mridul Seal", subject: "COMA", monthly_fee: 500, last_paid_month: 8, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] },
    { name: "Arpan Sir", subject: "Physics", monthly_fee: 500, last_paid_month: 8, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [] }
  ];
  deb_guin.total_paid = 0;
}

function updateSystemDate() {
  const now = new Date();
  current_day = now.getDate();
  current_month = now.getMonth() + 1;
  current_year = now.getFullYear();
  document.getElementById('date-display').textContent = `TODAY: ${getMonthName(current_month)} ${current_year}, Day ${current_day}`;
}

function getMonthName(m) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[m-1] || "???";
}

function monthsDue(lastM, lastY) {
  if (!lastM || !lastY) return 0;
  if (lastY < current_year) return (12 - lastM) + 12 * (current_year - lastY - 1) + current_month;
  if (lastY === current_year) return current_month - lastM;
  return 0;
}

function calculateYuvoLateFee(dueMonths) {
  if (current_day < deb_guin.teachers[YUVO_INDEX].late_fee_days) return 0;
  return (current_day - deb_guin.teachers[YUVO_INDEX].late_fee_days) * deb_guin.teachers[YUVO_INDEX].late_fee_amount;
}

function calculateTotalDue(idx) {
  const dueMonths = monthsDue(deb_guin.teachers[idx].last_paid_month, deb_guin.teachers[idx].last_paid_year);
  let due = dueMonths * deb_guin.teachers[idx].monthly_fee;
  if (idx === YUVO_INDEX && dueMonths > 0 && current_day >= deb_guin.teachers[idx].late_fee_days) {
    due += calculateYuvoLateFee(dueMonths);
  }
  return due;
}

function displayMenu() {
  let html = "", grand = 0;
  if (!deb_guin.teachers?.length) {
    html = "<strong style='color:red'>No data loaded. Using defaults.</strong><br><br>";
    initDefaultData();
  }
  deb_guin.teachers.forEach((t, i) => {
    const dueM = monthsDue(t.last_paid_month, t.last_paid_year);
    const due = calculateTotalDue(i);
    html += `<strong>${i+1}. ${t.name}</strong> (${t.subject}) Rs.${t.monthly_fee}/mo<br>`;
    html += t.last_paid_month ? `Last Paid: ${getMonthName(t.last_paid_month)} ${t.last_paid_year} | Due: ${dueM} mo Rs.${due}<br>` : `Not paid | Due: ${dueM} mo Rs.${due}<br>`;
    grand += due;
  });
  document.getElementById('teachers-list').innerHTML = html;
  document.getElementById('grand-total').innerHTML = `GRAND TOTAL DUE: Rs.${grand}`;
  document.getElementById('total-paid').innerHTML = `TOTAL PAID: Rs.${deb_guin.total_paid}`;
}

async function markPayment() {
  const idx = parseInt(prompt("Teacher (1-7):")) - 1;
  if (isNaN(idx) || idx < 0 || idx >= NUM_TEACHERS) return alert("Invalid");
  const months = parseInt(prompt(`Months for ${deb_guin.teachers[idx].name}:`));
  if (isNaN(months) || months <= 0) return alert("Invalid");

  const amount = months * deb_guin.teachers[idx].monthly_fee;
  let newM = (deb_guin.teachers[idx].last_paid_month || current_month) + months;
  let newY = deb_guin.teachers[idx].last_paid_year || current_year;
  while (newM > 12) { newM -= 12; newY++; }

  deb_guin.teachers[idx].last_paid_month = newM;
  deb_guin.teachers[idx].last_paid_year = newY;
  deb_guin.total_paid += amount;

  // Add to history
  deb_guin.teachers[idx].payments.push({
    day: current_day,
    month: current_month,
    year: current_year,
    amount
  });

  alert(`Paid ${months} mo = Rs.${amount}. Now paid until ${getMonthName(newM)} ${newY}`);
  await saveData();
  displayMenu();
}

function showDues() {
  let html = "<h3>Pending Dues</h3>", total = 0;
  deb_guin.teachers.forEach((t, i) => {
    const dm = monthsDue(t.last_paid_month, t.last_paid_year);
    if (dm > 0) {
      const due = calculateTotalDue(i);
      const late = (i === YUVO_INDEX) ? calculateYuvoLateFee(dm) : 0;
      html += `${t.name} (${t.subject}): ${dm} mo + Late Rs.${late} = Rs.${due}<br>`;
      total += due;
    }
  });
  html += total ? `<br><strong>TOTAL DUE: Rs.${total}</strong>` : "No dues!";
  document.getElementById('output').innerHTML = html;
}

function showStatus() {
  let html = "<h3>Status</h3>";
  deb_guin.teachers.forEach(t => {
    const dm = monthsDue(t.last_paid_month, t.last_paid_year);
    html += `<strong>${t.name} (${t.subject})</strong> Rs.${t.monthly_fee}/mo<br>`;
    html += t.last_paid_month ? `Last: ${getMonthName(t.last_paid_month)} ${t.last_paid_year}<br>` : "Never paid<br>";
    html += dm > 0 ? `Due: ${dm} mo Rs.${calculateTotalDue(deb_guin.teachers.indexOf(t))}<br>` : "Up to date<br><br>";
  });
  html += `Total Paid: Rs.${deb_guin.total_paid}`;
  document.getElementById('output').innerHTML = html;
}

function showHistory() {
  let html = "<h3>Payment History</h3>";
  deb_guin.teachers.forEach(t => {
    html += `<strong>${t.name}:</strong><br>`;
    if (!t.payments?.length) html += "No payments<br>";
    else t.payments.forEach(p => {
      html += `${p.day} ${getMonthName(p.month)} ${p.year}: Rs.${p.amount}<br>`;
    });
    html += "<br>";
  });
  document.getElementById('output').innerHTML = html;
}

async function saveData() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(deb_guin, 'data');
  // Export JSON backup
  const blob = new Blob([JSON.stringify(deb_guin, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `fees-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
}

async function loadData() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const data = await tx.objectStore(STORE_NAME).get('data');
    if (data) deb_guin = data;
    else initDefaultData();
  } catch (e) {
    initDefaultData();
  }
  displayMenu();
}

function exitApp() {
  if (confirm("Save & exit?")) saveData().then(() => alert("Goodbye!"));
}

// Init
(async () => {
  await loadData();
  updateSystemDate();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
