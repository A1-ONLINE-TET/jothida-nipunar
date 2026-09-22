// ═══════════════════════════════════════════════════════════════════
// DATE HELPERS — dd-mm-yyyy format input
// ═══════════════════════════════════════════════════════════════════
// Auto-format as user types: "2" → "2", "25" → "25-", "25-1" → "25-1", "25-12" → "25-12-", etc.
export function formatDateInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += ".";
    out += digits[i];
  }
  return out; // e.g. "25.12.1990"
}

// Auto-format as user types: "0" → "0", "06" → "06", "063" → "06:3", "0630" → "06:30"
// Clamps hour to 1-12 and minute to 0-59 once both digits of that segment are entered.
export function formatTimeInput(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 4); // max 4 digits: hhmm
  let hh = digits.slice(0, 2), mm = digits.slice(2, 4);
  if (hh.length === 2) {
    let hNum = parseInt(hh, 10);
    if (hNum > 12) hh = "12";
    else if (hNum === 0) hh = "01";
  }
  if (mm.length === 2) {
    let mNum = parseInt(mm, 10);
    if (mNum > 59) mm = "59";
  }
  let out = hh;
  for (let i = 0; i < mm.length; i++) {
    if (i === 0) out += ":";
    out += mm[i];
  }
  return out; // e.g. "06:30"
}

// Convert dd-mm-yyyy or dd.mm.yyyy → YYYY-MM-DD (ISO) for engine calculations
export function parseDDMMYYYY(str) {
  if (!str) return "";
  const parts = str.split(/[-./]/);
  if (parts.length !== 3 || parts[2].length !== 4) return "";
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
}

// Validate: is it a complete dd-mm-yyyy with reasonable values?
export function isValidDDMMYYYY(str) {
  if (!str || str.length !== 10) return false;
  const iso = parseDDMMYYYY(str);
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100;
}
