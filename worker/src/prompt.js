// ═══════════════════════════════════════════════════════════════════
// SERVER-SIDE PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════
// The browser NEVER sends a prompt. It sends only birth details; the
// Worker computes the chart and assembles the prompt here, then calls
// Claude. This (a) closes the old open-proxy hole where anyone could
// send arbitrary prompts through /api/predict, and (b) keeps our prompt
// engineering — part of the product's value — off the client entirely.
// ═══════════════════════════════════════════════════════════════════

// Live current dasha chain, recomputed against "now" (ported from the
// client's getCurrentDashaInfo — never trusts a frozen .isCurrent flag).
export function currentDashaInfo(dashaData) {
  if (!dashaData || !dashaData.dashas) return "";
  const now = new Date();
  const md = dashaData.dashas.find((d) => now >= d.startDate && now < d.endDate);
  if (!md) return "";
  const ad = md.antardashas?.find((a) => now >= a.startDate && now < a.endDate);
  const pad = ad?.pratyantardashas?.find((p) => now >= p.startDate && now < p.endDate);
  const sd = pad?.sookshmaDashas?.find((s) => now >= s.startDate && now < s.endDate);
  const fmt = (d) => new Date(d).toLocaleDateString("ta-IN");
  let info = `நடப்பு மகா தசை: ${md.name} (${fmt(md.startDate)} — ${fmt(md.endDate)})`;
  if (ad) info += `\nநடப்பு புக்தி (அந்தர் தசை): ${md.name}-${ad.name} (${ad.duration})`;
  if (pad) info += `\nநடப்பு பிரத்யந்தர் தசை: ${md.name}-${ad.name}-${pad.name} (${pad.duration})`;
  if (sd) info += `\nநடப்பு சூட்சும தசை: ${md.name}-${ad.name}-${pad.name}-${sd.name} (${sd.duration})`;
  return info;
}

export function buildBirthPrompt({ person, horoscope, dashaInfo }) {
  return `You are a world-class Vedic astrologer. Based on these birth chart details, give a personalized prediction in Tamil (with some English terms).
Name: ${person.name}, DOB: ${person.dob}, TOB: ${person.tob ? `${person.tob} ${person.ampm || ""}` : "Unknown"}, POB: ${person.pob || "Unknown"}
Lagna: ${horoscope.lagnaName} (${horoscope.lagnaEn}), Moon: ${horoscope.moonRashi}, Nakshatra: ${horoscope.nakshatra}
Planets: ${horoscope.placements.map((p) => `${p.ta}:${p.rashi} H${p.house} ${p.degree}°`).join(", ")}
${dashaInfo ? `Dasha periods:\n${dashaInfo}` : ""}
Predict: பொது பலன், தொழில், திருமணம், ஆரோக்கியம், நிதி. Consider the current Mahadasha-Antardasha-Pratyantardasha lords and their combined effects on each life area. 200 words. Warm tone.`;
}

export function buildDailyPrompt({ person, horoscope, daily }) {
  const { today, gochara, remedy, sadeSati, guruPeyarchi, taraBala, currentDasha } = daily;
  const transitSummary = gochara.results
    .map(
      (p) =>
        `${p.ta}: ${p.rashi} (birth moon-க்கு ${p.houseFromMoon}ஆம் வீடு, ${p.effect === "good" ? "சுபம்" : p.effect === "bad" ? "அசுபம்" : "நடுநிலை"})`
    )
    .join(", ");
  const timeframe = today.isFuture
    ? `on the future date ${today.dateStr}`
    : today.isPast
      ? `on the past date ${today.dateStr}`
      : "today";
  const dashaLine = currentDasha
    ? `The full dasha chain running ${timeframe}: ${currentDasha.mahadasha.name} Mahadasha (main period) → ${currentDasha.bhukti?.name || currentDasha.mahadasha.name} Bhukti (sub-period)${currentDasha.pratyantar ? ` → ${currentDasha.pratyantar.name} Pratyantardasha (sub-sub-period)` : ""}${currentDasha.sookshma ? ` → ${currentDasha.sookshma.name} Sookshma Dasha (finest-grained period, ${currentDasha.daysLeftInSookshma} days left)` : ""}. This is the person's most important long-term astrological influence for that date — the Mahadasha and Bhukti set the broad theme, while the Pratyantardasha and Sookshma Dasha fine-tune what's emphasized right now. Consider what all these planets govern together.`
    : "Dasha data not available.";
  return `You are a Tamil Vedic astrologer giving a ${today.isOtherDate ? "specific-date" : "daily"} horoscope reading. Respond ONLY in Tamil.
Person: ${person.name}
Birth chart: Lagna ${horoscope.lagnaName}, Moon sign (Rashi) ${horoscope.moonRashi}, Nakshatra ${horoscope.nakshatra}
${today.isOtherDate ? "Target date" : "Today's date"}: ${today.dateStr} (${today.dayName}கிழமை)${today.isFuture ? " — this is a FUTURE date, not today. Phrase the reading as 'அன்று' (on that day) not 'இன்று' (today)." : today.isPast ? " — this is a PAST date. Phrase the reading in past tense as 'அன்று' (on that day)." : ""}
Panchangam for that date: திதி ${today.tithi} ${today.paksham}, யோகம் ${today.yogam}, கரணம் ${today.karanam}, நட்சத்திரம் ${today.nakshatra}
Planetary transits relative to birth moon sign, as of that date: ${transitSummary}
${dashaLine}
${gochara.isChandrashtama ? `${today.isOtherDate ? "அன்று" : "இன்று"} சந்திராஷ்டமம் — கவனமாக இருக்க வேண்டிய நாள்.` : ""}
${sadeSati?.active ? `Sade Sati status on that date: ${sadeSati.phase} — ${sadeSati.desc}` : "No Sade Sati on that date."}
Guru Peyarchi (Jupiter transit) effect on that date: ${guruPeyarchi?.desc || "N/A"}
Tara Bala on that date: ${taraBala?.name} (${taraBala?.mood === "good" ? "favorable" : "use caution"})
Recommended remedy for this rashi: worship ${remedy?.dayInfo?.deity}, ${remedy?.dayInfo?.remedy}
Give a short, warm, practical ${today.isFuture ? "prediction for that future date" : "daily prediction"} (170 words max) covering: general mood, favorable/unfavorable timing, one practical tip. The Dasha-Bhukti is the most important personalization factor — ground the reading in what the Mahadasha and Bhukti lords represent, then layer in the transits and panchangam on top. Do not repeat the raw planetary data back — synthesize it into natural guidance.`;
}
