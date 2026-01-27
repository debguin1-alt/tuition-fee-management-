const NUM_TEACHERS = 7;
const YUVO_INDEX = 4;
const MAX_PAYMENTS = 100;

let deb_guin = {
    name: "Deb Guin",
    total_paid: 0,
    teachers: []
};

let current_day, current_month, current_year;

// IndexedDB setup
const DB_NAME = 'FeeManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'data';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initialize default data
function initDefaultData() {
    deb_guin.teachers = [
        { name: "Snigdhadeep Chakraborty", subject: "Math", monthly_fee: 500, last_paid_day: 0, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 },
        { name: "Prasun Banerjee", subject: "Chemistry", monthly_fee: 500, last_paid_day: 0, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 },
        { name: "Sumit Sir", subject: "English", monthly_fee: 400, last_paid_day: 0, last_paid_month: 7, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 },
        { name: "Debabrata Sir", subject: "Bengali", monthly_fee: 300, last_paid_day: 0, last_paid_month: 6, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 },
        { name: "Yuvo Comp. Centre", subject: "DDTA", monthly_fee: 700, last_paid_day: 0, last_paid_month: 12, last_paid_year: 2025, late_fee_days: 20, late_fee_amount: 2, payments: [], num_payments: 0 },
        { name: "Mridul Seal", subject: "COMA", monthly_fee: 500, last_paid_day: 0, last_paid_month: 8, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 },
        { name: "Arpan Sir", subject: "Physics", monthly_fee: 500, last_paid_day: 0, last_paid_month: 8, last_paid_year: 2025, late_fee_days: 0, late_fee_amount: 0, payments: [], num_payments: 0 }
    ];
}

// Update system date
function updateSystemDate() {
    const now = new Date();
    current_day = now.getDate();
    current_month = now.getMonth() + 1;
    current_year = now.getFullYear();
    document.getElementById('date-display').innerHTML = `📅 TODAY: ${getMonthName(current_month)} ${current_year}, Day ${current_day}`;
}

// Get month name
function getMonthName(month) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[month - 1] || "???";
}

// Calculate months due
function monthsDue(last_paid_month, last_paid_year) {
    if (last_paid_year === 0 && last_paid_month === 0) return 0;
    if (last_paid_year < current_year) {
        return (12 - last_paid_month) + 12 * (current_year - last_paid_year - 1) + current_month;
    } else if (last_paid_year === current_year) {
        return current_month - last_paid_month;
    }
    return 0;
}

// Calculate Yuvo late fee
function calculateYuvoLateFee(due_months) {
    if (current_day < deb_guin.teachers[YUVO_INDEX].late_fee_days) return 0;
    const late_days = current_day - deb_guin.teachers[YUVO_INDEX].late_fee_days;
    return late_days * deb_guin.teachers[YUVO_INDEX].late_fee_amount;
}

// Calculate total due
function calculateTotalDue(teacher_idx) {
    const due_months = monthsDue(deb_guin.teachers[teacher_idx].last_paid_month, deb_guin.teachers[teacher_idx].last_paid_year);
    let total_due = due_months * deb_guin.teachers[teacher_idx].monthly_fee;
    if (teacher_idx === YUVO_INDEX && due_months > 0 && current_day >= deb_guin.teachers[teacher_idx].late_fee_days) {
        total_due += calculateYuvoLateFee(due_months);
    }
    return total_due;
}

// Display menu
function displayMenu() {
    let html = "";
    let grand_total = 0;
    for (let i = 0; i < NUM_TEACHERS; i++) {
        const due_months = monthsDue(deb_guin.teachers[i].last_paid_month, deb_guin.teachers[i].last_paid_year);
        const total_due = calculateTotalDue(i);
        html += `${i+1}. <strong>${deb_guin.teachers[i].name}</strong> (${deb_guin.teachers[i].subject}) Rs.${deb_guin.teachers[i].monthly_fee}/month<br>`;
        if (deb_guin.teachers[i].last_paid_month > 0) {
            const dayStr = deb_guin.teachers[i].last_paid_day > 0 ? `${deb_guin.teachers[i].last_paid_day} ` : "";
            html += `   Last Paid: ${dayStr}${getMonthName(deb_guin.teachers[i].last_paid_month)} ${deb_guin.teachers[i].last_paid_year} | Due: ${due_months} months Rs.${total_due}<br>`;
        } else {
            html += `   Not yet paid | Due: ${due_months} months Rs.${total_due}<br>`;
        }
        grand_total += total_due;
    }
    document.getElementById('teachers-list').innerHTML = html;
    document.getElementById('grand-total').innerHTML = `💰 GRAND TOTAL DUE TODAY: Rs.${grand_total}`;
    document.getElementById('total-paid').innerHTML = `💳 TOTAL PAID SO FAR: Rs.${deb_guin.total_paid}`;
}

// Mark payment (with auto-save and cancel)
function markPayment() {
    const teacher_idx = parseInt(prompt("Select teacher (1-7):")) - 1;
    if (teacher_idx === null || teacher_idx === undefined) {
        alert("Payment canceled.");
        return;
    }
    if (teacher_idx < 0 || teacher_idx >= NUM_TEACHERS) {
        alert("Invalid teacher!");
        return;
    }
    const months_to_pay = parseInt(prompt(`How many months for ${deb_guin.teachers[teacher_idx].name}:`));
    if (months_to_pay === null || months_to_pay === undefined) {
        alert("Payment canceled.");
        return;
    }
    if (months_to_pay <= 0) {
        alert("Invalid number of months!");
        return;
    }
    const amount = months_to_pay * deb_guin.teachers[teacher_idx].monthly_fee;
    let new_month = deb_guin.teachers[teacher_idx].last_paid_month + months_to_pay;
    let new_year = deb_guin.teachers[teacher_idx].last_paid_year;
    while (new_month > 12) {
        new_month -= 12;
        new_year++;
    }
    // Record payment
    if (deb_guin.teachers[teacher_idx].num_payments < MAX_PAYMENTS) {
        deb_guin.teachers[teacher_idx].payments.push({
            day: current_day,
            month: current_month,
            year: current_year,
            amount: amount
        });
        deb_guin.teachers[teacher_idx].num_payments++;
    }
    deb_guin.teachers[teacher_idx].last_paid_day = current_day;
    deb_guin.teachers[teacher_idx].last_paid_month = new_month;
    deb_guin.teachers[teacher_idx].last_paid_year = new_year;
    deb_guin.total_paid += amount;
    alert(`Payment Recorded! Paid ${months_to_pay} months = Rs.${amount}. Now paid until ${getMonthName(new_month)} ${new_year}.`);
    saveData();  // Auto-save
    displayMenu();
}

// Show dues
function showDues() {
    let html = "<h3>Pending Payments:</h3>";
    let total_due = 0;
    for (let i = 0; i < NUM_TEACHERS; i++) {
        const due_months = monthsDue(deb_guin.teachers[i].last_paid_month, deb_guin.teachers[i].last_paid_year);
        if (due_months > 0) {
            const due_amount = calculateTotalDue(i);
            const late_fee = (i === YUVO_INDEX && current_day >= deb_guin.teachers[i].late_fee_days) ? calculateYuvoLateFee(due_months) : 0;
            html += `${deb_guin.teachers[i].name} (${deb_guin.teachers[i].subject}): ${due_months} months + Late Rs.${late_fee} = Rs.${due_amount}<br>`;
            total_due += due_amount;
        }
    }
    if (total_due === 0) html += "✅ No pending payments!<br>";
    html += `<br>💰 TOTAL DUE: Rs.${total_due}<br>💳 Total Paid so far: Rs.${deb_guin.total_paid}`;
    document.getElementById('output').innerHTML = html;
}

// Show status
function showStatus() {
    let html = "<h3>Current Status:</h3>";
    for (let i = 0; i < NUM_TEACHERS; i++) {
        const due_months = monthsDue(deb_guin.teachers[i].last_paid_month, deb_guin.teachers[i].last_paid_year);
        html += `${deb_guin.teachers[i].name} (${deb_guin.teachers[i].subject}) - Rs.${deb_guin.teachers[i].monthly_fee}/month:<br>`;
        if (deb_guin.teachers[i].last_paid_month > 0) {
            const dayStr = deb_guin.teachers[i].last_paid_day > 0 ? `${deb_guin.teachers[i].last_paid_day} ` : "";
            html += `   ✅ Last Paid: ${dayStr}${getMonthName(deb_guin.teachers[i].last_paid_month)} ${deb_guin.teachers[i].last_paid_year}<br>`;
        } else {
            html += "   ⚠️ Never paid<br>";
        }
        if (due_months > 0) {
            const total_due = calculateTotalDue(i);
            const late_fee = (i === YUVO_INDEX && current_day >= deb_guin.teachers[i].late_fee_days) ? calculateYuvoLateFee(due_months) : 0;
            html += `   ❌ Due: ${due_months} months + Late Rs.${late_fee} = Rs.${total_due}<br>`;
        } else {
            html += "   ✅ Up to date!<br>";
        }
        html += "<br>";
    }
    html += `💳 Total Amount Paid: Rs.${deb_guin.total_paid}`;
    document.getElementById('output').innerHTML = html;
}

// Show payment history
function showHistory() {
    let html = "<h3>Payment History:</h3>";
    for (let i = 0; i < NUM_TEACHERS; i++) {
        html += `<strong>${deb_guin.teachers[i].name}:</strong><br>`;
        if (deb_guin.teachers[i].num_payments === 0) {
            html += "   No payments recorded.<br>";
        } else {
            deb_guin.teachers[i].payments.forEach(p => {
                html += `   ${p.day} ${getMonthName(p.month)} ${p.year}: Rs.${p.amount}<br>`;
            });
        }
        html += "<br>";
    }
    document.getElementById('output').innerHTML = html;
}

// Export data to file
function exportData() {
  const dataStr = JSON.stringify(deb_guin, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-manager-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert("Data exported to file!");
}

// Import data from file
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          deb_guin = importedData;
          saveData();
          displayMenu();
          alert("Data imported!");
        } catch (err) {
          alert("Invalid file! " + err.message);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// Save data (with auto-export)
async function saveData() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(deb_guin, 'appData');
    exportData();  // Auto-export
    console.log("Data saved!");
  } catch (e) {
    alert("Save failed! " + e.message);
  }
}

// Load data
async function loadData() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('appData');
    request.onsuccess = () => {
      if (request.result) {
        deb_guin = request.result;
      } else {
        initDefaultData();
      }
      displayMenu();
    };
    request.onerror = () => {
      initDefaultData();
      displayMenu();
    };
  } catch (e) {
    initDefaultData();
    displayMenu();
  }
}

// Exit app
function exitApp() {
    if (confirm("Save and exit?")) {
        saveData();
        alert("Thank you!");
    }
}

// Initialize
(async () => {
  await loadData();
  updateSystemDate();
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((error) => console.log('Service Worker registration failed:', error));
  }
})();
