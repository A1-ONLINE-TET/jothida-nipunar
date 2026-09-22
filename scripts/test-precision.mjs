// ═══════════════════════════════════════════════════════════════════
// GOLDEN TESTS — precision.js தூய functions-க்கு. `npm test` ஆல் ஓடும்.
// Golden மதிப்புகள் BPHS சூத்திரத்தால் கையால் கணக்கிடப்பட்டவை + உண்மை
// ஜாதகத்தில் (29.01.1981 10:51 திருச்சி) சரிபார்க்கப்பட்டவை. இவற்றில்
// எதையும் "சரிசெய்ய" மாற்ற வேண்டாம் — code தவறானால் test தோல்வி காட்டும்.
// ═══════════════════════════════════════════════════════════════════
import { drishtiVirupa, virupaGrade, subLordOf, nakshatraLordName, NAK_SPAN } from "../src/precision.js";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; console.error(`✗ ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};
const near = (name, got, want, tol = 0.15) => {
  if (Math.abs(got - want) <= tol) { pass++; }
  else { fail++; console.error(`✗ ${name}: got ${got}, want ~${want} (±${tol})`); }
};

// ── ஸ்புட திருஷ்டி — உண்மை ஜாதக golden மதிப்புகள் (கையால் கணக்கிட்டவை) ──
// சூரியன் 285.630° → ராகு 107.426°: arc 181.796 → (300−181.796)/2 = 59.10
near("Sun→Rahu near-opposition", drishtiVirupa(285.630, 107.426, "சூரியன்"), 59.10);
// செவ்வாய் 299.501° → ராகு 107.426°: arc 167.925 → (167.925−150)×2 = 35.85
near("Mars→Rahu 150-180 band", drishtiVirupa(299.501, 107.426, "செவ்வாய்"), 35.85);
// குரு 166.765° → கேது 287.426°: arc 120.661 → குரு சிறப்பு 5ஆம் பார்வை = 60
eq("Jupiter special 5th aspect", drishtiVirupa(166.765, 287.426, "குரு"), 60);
// குரு 166.765° → சூரியன் 285.630°: arc 118.865 → 30+(120−118.865)/2 = 30.57
near("Jupiter 90-120 band", drishtiVirupa(166.765, 285.630, "குரு"), 30.57);

// ── ஸ்புட திருஷ்டி — சூத்திர எல்லைகள் ──
eq("arc<30 no aspect", drishtiVirupa(0, 20, "சூரியன்"), 0);
near("arc 45 → 7.5", drishtiVirupa(0, 45, "சூரியன்"), 7.5, 0.01);
near("arc 75 → 30", drishtiVirupa(0, 75, "சூரியன்"), 30, 0.01);
near("arc 90 → 45", drishtiVirupa(0, 90, "சூரியன்"), 45, 0.01);
near("arc 180 full → 60", drishtiVirupa(0, 180, "சூரியன்"), 60, 0.01);
near("arc 240 (Sun) → 30", drishtiVirupa(0, 240, "சூரியன்"), 30, 0.01);
eq("arc>300 no aspect", drishtiVirupa(0, 310, "சூரியன்"), 0);
eq("Saturn special 3rd (arc 70)", drishtiVirupa(0, 70, "சனி"), 60);
eq("Saturn special 10th (arc 280)", drishtiVirupa(0, 280, "சனி"), 60);
eq("Mars special 4th (arc 100)", drishtiVirupa(0, 100, "செவ்வாய்"), 60);
eq("Mars special 8th (arc 220)", drishtiVirupa(0, 220, "செவ்வாய்"), 60);
eq("Jupiter special 9th (arc 250)", drishtiVirupa(0, 250, "குரு"), 60);

// ── grade எல்லைகள் ──
eq("grade 60", virupaGrade(60), "முழு");
eq("grade 45", virupaGrade(45), "முழு");
eq("grade 44", virupaGrade(44), "முக்கால்");
eq("grade 30", virupaGrade(30), "முக்கால்");
eq("grade 29", virupaGrade(29), "அரை");
eq("grade 15", virupaGrade(15), "அரை");
eq("grade 14", virupaGrade(14), "கால்");

// ── நட்சத்திராதிபதி ──
eq("Ashwini lord", nakshatraLordName(0), "கேது");
eq("Visakha lord", nakshatraLordName(15), "குரு");
eq("Revathi lord", nakshatraLordName(26), "புதன்");

// ── KP உட்பிரிவு அதிபதி — கையால் கணக்கிட்ட goldens ──
// 0.0° அசுவினி தொடக்கம் → முதல் sub கேது (span 7/120×13°20' = 0.7778°)
eq("sub at 0.0", subLordOf(0.0), "கேது");
// 1.0° → கேது span தாண்டி → சுக்கிரன்
eq("sub at 1.0", subLordOf(1.0), "சுக்கிரன்");
// சந்திரன் 206.9886° (விசாகம்-3): pos 6.9886 — குரு1.778+சனி2.111+புதன்1.889+கேது0.778=6.556 தாண்டி → சுக்கிரன்
eq("Moon 206.9886 sub", subLordOf(206.9886), "சுக்கிரன்");
// லக்னம் 356.813° (ரேவதி-4): pos 10.147 — புதன்→...→ராகு (cum 9.444) தாண்டி → குரு
eq("Lagna 356.813 sub", subLordOf(356.813), "குரு");
// நட்சத்திர எல்லை: ஒவ்வொரு நட்சத்திரத் தொடக்கத்திலும் sub = அதன் அதிபதியே
for (let n = 0; n < 27; n++) {
  eq(`nak ${n} start sub = its lord`, subLordOf(n * NAK_SPAN + 1e-9), nakshatraLordName(n));
}

// ── wrap-around ──
eq("360 wraps to 0", subLordOf(360.0), "கேது");
eq("negative wraps", subLordOf(-353.0 + 360.0) === subLordOf(7.0), true);

if (fail === 0) console.log(`✓ ALL ${pass} PRECISION TESTS PASSED`);
else { console.error(`${fail} FAILED, ${pass} passed`); process.exit(1); }
