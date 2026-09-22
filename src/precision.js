// ═══════════════════════════════════════════════════════════════════
// PRECISION HELPERS — தூய (pure) கணித functions, App.jsx engine-இல்
// இருந்து பிரிக்கப்பட்டவை. காரணம்: இவற்றை node-இல் நேரடியாக golden-test
// செய்யலாம் (scripts/test-precision.mjs) — இனி எந்த மாற்றமும் இவற்றை
// உடைத்தால் `npm test` உடனே பிடிக்கும்.
// ═══════════════════════════════════════════════════════════════════

export const NAK_SPAN = 360 / 27; // 13°20'

// விம்சோத்தரி வரிசை + ஆண்டுகள் — canonical அட்டவணை (App.jsx DASHA_LORDS-உடன்
// ஒரே வரிசை: கேது→சுக்→சூரி→சந்→செவ்→ராகு→குரு→சனி→புதன்)
const VIM_ORDER = ["கேது", "சுக்கிரன்", "சூரியன்", "சந்திரன்", "செவ்வாய்", "ராகு", "குரு", "சனி", "புதன்"];
const VIM_YEARS = { "கேது": 7, "சுக்கிரன்": 20, "சூரியன்": 6, "சந்திரன்": 10, "செவ்வாய்": 7, "ராகு": 18, "குரு": 16, "சனி": 19, "புதன்": 17 };

// நட்சத்திராதிபதி — nakIdx (0=அசுவினி) → விம்சோத்தரி அதிபதி
export function nakshatraLordName(nakIdx) {
  return VIM_ORDER[((nakIdx % 9) + 9) % 9];
}

// ═══ KP உட்பிரிவு அதிபதி (Sub-lord) — நட்சத்திரத்துக்குள் விம்சோத்தரி
// விகிதப்படி 9 உட்பிரிவுகள்; தொடக்கம் நட்சத்திராதிபதியிலிருந்து ═══
export function subLordOf(fullLong) {
  const L = ((fullLong % 360) + 360) % 360;
  const nak = Math.floor(L / NAK_SPAN);
  let pos = L - nak * NAK_SPAN;
  const startIdx = nak % 9;
  for (let i = 0; i < 9; i++) {
    const lord = VIM_ORDER[(startIdx + i) % 9];
    const span = (VIM_YEARS[lord] / 120) * NAK_SPAN;
    if (pos < span) return lord;
    pos -= span;
  }
  return VIM_ORDER[startIdx];
}

// ═══ ஸ்புட திருஷ்டி (BPHS Ch.26) — பார்வையின் அளவு 0-60 விருபா.
// சிறப்புப் பார்வைகள் (சனி 3,10 • செவ்வாய் 4,8 • குரு 5,9) அந்த வீச்சில்
// முழு (60) — Parashari whole-house special drishti விதி. ═══
export function drishtiVirupa(fromLong, toLong, fromTa) {
  const a = (toLong - fromLong + 360) % 360;
  if (fromTa === "சனி" && ((a >= 60 && a < 90) || (a >= 270 && a < 300))) return 60;
  if (fromTa === "செவ்வாய்" && ((a >= 90 && a < 120) || (a >= 210 && a < 240))) return 60;
  if (fromTa === "குரு" && ((a >= 120 && a < 150) || (a >= 240 && a < 270))) return 60;
  if (a >= 30 && a < 60) return (a - 30) / 2;
  if (a >= 60 && a < 90) return (a - 60) + 15;
  if (a >= 90 && a < 120) return 30 + (120 - a) / 2;
  if (a >= 120 && a < 150) return 150 - a;
  if (a >= 150 && a < 180) return (a - 150) * 2;
  if (a >= 180 && a <= 300) return (300 - a) / 2;
  return 0;
}

export function virupaGrade(v) {
  return v >= 45 ? "முழு" : v >= 30 ? "முக்கால்" : v >= 15 ? "அரை" : "கால்";
}
