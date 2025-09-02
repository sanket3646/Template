/*******************************
 * script.js
 * Robust CSV fetch + parse + map -> JS objects
 *
 * Replace SHEET_CSV_URL with your published CSV export URL:
 * Example: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0
 * Or use opensheet.elk.sh: https://opensheet.elk.sh/YOUR_SHEET_ID/Sheet1
 *******************************/

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRL1T8KKvwJr32Zb49Uc2hDzCXgeXa4FfO6nVJfWwkmZJWGO0nrxA4OyKMP57m_ph_K4-rxdime5gWk/pub?output=csv"; // <-- put your CSV URL here

// Robust CSV parser (handles quoted fields, escaped quotes, CRLF)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {          // escaped quote ""
        cur += '"';
        i++; // skip next quote
      } else if (ch === '"') {                   // closing quote
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {                          // opening quote
        inQuotes = true;
      } else if (ch === ',') {                   // column separator
        row.push(cur);
        cur = '';
      } else if (ch === '\r') {
        // ignore, handle on \n
      } else if (ch === '\n') {                  // end of row
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else {
        cur += ch;
      }
    }
  }

  // push last cell/row (if file doesn't end with newline)
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

// Convert parsed CSV rows -> array of objects using the first row as headers
function csvRowsToObjects(rows) {
  if (!rows || rows.length === 0) return [];

  const rawHeaders = rows[0].map(h => (h ?? '').toString().trim());
  const headers = rawHeaders.map(h => h || '(empty-header)');

  const data = rows.slice(1)
    // remove completely-empty rows
    .filter(r => r && r.some(cell => (cell ?? '').toString().trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        // tolerate missing cells
        obj[h] = ((row[i] ?? '') + '').toString().trim();
      });
      return obj;
    });

  return data;
}

// Main fetch + parse function with error handling
async function fetchSheetCSV(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" }); // no-cache helps dev
    if (!res.ok) throw new Error(`Network response not OK (status ${res.status})`);

    const text = await res.text();

    // quick sanity check: CSV should have at least one comma or newline
    if (!text.includes(',') && !text.includes('\n')) {
      console.warn('Fetched content looks unexpected (no commas/newlines). Check the URL or publish settings.');
    }

    const rows = parseCSV(text);
    const data = csvRowsToObjects(rows);
    return data;

  } catch (err) {
    console.error('Error fetching or parsing sheet CSV:', err);
    return []; // return empty array so callers can still run safely
  }
}

/* -----------------------------
   Example usage: populate DOM
   ----------------------------- */
async function loadAndPopulate() {
  const data = await fetchSheetCSV(SHEET_CSV_URL);

  // If your sheet is a key-value sheet (key,value rows):
  // e.g. key,value
  // heroTitle,Welcome to our salon
  // heroSubtitle,Book your appointment today!
  if (data.length > 0 && 'key' in data[0] && 'value' in data[0]) {
    const kv = {};
    data.forEach(row => kv[row.key] = row.value);
    const titleEl = document.getElementById('hero-title');
    const subEl = document.getElementById('hero-subtitle');
    if (titleEl && kv.heroTitle) titleEl.textContent = kv.heroTitle;
    if (subEl && kv.heroSubtitle) subEl.textContent = kv.heroSubtitle;
  }

  // If your Services are in a table style (columns: Name, Description, Price, ImageURL),
  // then you can render cards:
  const servicesContainer = document.getElementById('services'); // example container
  if (servicesContainer && data.length > 0 && 'Name' in data[0]) {
    servicesContainer.innerHTML = ''; // clear
    data.forEach(row => {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-lg shadow bg-white mb-4';
      card.innerHTML = `
        <h3 class="text-lg font-semibold">${row.Name || ''}</h3>
        <p class="text-sm text-gray-600">${row.Description || ''}</p>
        <div class="mt-2 font-medium">₹ ${row.Price || ''}</div>
      `;
      servicesContainer.appendChild(card);
    });
  }

  // debug:
  console.log('Sheet data loaded:', data);
}

// run on page load (defer script or call after DOM ready)
// ---- Services Tabs Functionality ----
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  if (tabButtons.length === 0 || tabContents.length === 0) return;

  // Activate first tab by default
  tabButtons.forEach((btn, index) => {
    if (index === 0) {
      btn.classList.replace('bg-gray-200','bg-indigo-600');
      btn.classList.replace('text-gray-800','text-white');
    } else {
      btn.classList.replace('bg-indigo-600','bg-gray-200');
      btn.classList.replace('text-white','text-gray-800');
    }
  });
  tabContents.forEach((c, index) => {
    if (index === 0) {
      c.classList.remove('hidden');
    } else {
      c.classList.add('hidden');
    }
  });

  // Tab click event
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');

      // Toggle tab button styles
      tabButtons.forEach(b => {
        b.classList.replace('bg-indigo-600','bg-gray-200');
        b.classList.replace('text-white','text-gray-800');
      });
      btn.classList.replace('bg-gray-200','bg-indigo-600');
      btn.classList.replace('text-gray-800','text-white');

      // Toggle tab contents
      tabContents.forEach(c => c.classList.add('hidden'));
      const activeContent = document.querySelector(`[data-content="${target}"]`);
      if (activeContent) activeContent.classList.remove('hidden');
    });
  });
  // Update footer year
document.addEventListener('DOMContentLoaded', () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

});





