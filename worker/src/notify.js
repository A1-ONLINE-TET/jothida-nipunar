// ═══════════════════════════════════════════════════════════════════
// உரிமையாளருக்கு WhatsApp அறிவிப்பு — பயனர் அனுப்பும் கருத்து / புகார்.
// ═══════════════════════════════════════════════════════════════════
// பயனர் செயலியில் எழுதுகிறார் → இந்தச் சேவையகம் → உரிமையாளரின் WhatsApp. உரிமையாளரின் கைபேசி எண் Worker ரகசியத்தில்
// மட்டும் உள்ளது; உலாவிக்கு ஒருபோதும் போவதில்லை, எந்தப் பதிலிலும் வருவதில்லை.
//
// அனுப்பும் சேவை: CallMeBot (தனக்குத் தானே அறிவிப்பு அனுப்பும் இலவச WhatsApp API).
//   wrangler secret put WHATSAPP_PHONE      # நாட்டுக் குறியீட்டுடன், எ.கா. 919876543210
//   wrangler secret put CALLMEBOT_APIKEY    # CallMeBot உங்கள் WhatsApp-க்கு அனுப்பும் சாவி
// இரண்டும் இல்லையெனில் எதுவும் அனுப்பப்படாது (செயலி வழக்கம்போல் இயங்கும்).
//
// தனியுரிமை: பயனர் எழுதிய கருத்து உரையும் புகார் வகையும் மட்டும் செல்கின்றன. பிறப்பு விவரம், கேள்வி, AI பதில்,
// கணக்கு எண் எதுவும் அனுப்பப்படுவதில்லை — அவை Firestore `reports`-இல் மட்டும்.
// ═══════════════════════════════════════════════════════════════════
const REASONS = { wrong: "தவறான தகவல்", harmful: "அச்சுறுத்தும் / தீங்கான அறிவுரை", offensive: "புண்படுத்தும் சொற்கள்", other: "வேறு காரணம்" }; // ReportBox.jsx-இன் அதே பட்டியல்
const clip = (v, n) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

export function buildNotifyText(b) {
  const kind = b && b.kind === "feedback" ? "கருத்து" : "பதில் பற்றிய புகார்";
  const reason = clip(b && b.reason, 40);
  const comment = clip(b && b.comment, 600);
  const lines = [`ஜோதிட நிபுணர் — புதிய ${kind}`];
  if (reason) lines.push(`காரணம்: ${REASONS[reason] || reason}`);
  lines.push(comment || "(உரை இல்லை)");
  return lines.join("\n");
}

// true = அனுப்பப்பட்டது. ரகசியங்கள் இல்லை / சேவை தோல்வி = false (பயனருக்குப் பிழை காட்டப்படாது).
export async function notifyOwner(env, b) {
  const phone = String(env.WHATSAPP_PHONE || "").replace(/[^0-9]/g, "");
  const key = String(env.CALLMEBOT_APIKEY || "").trim();
  if (!phone || !key) return false;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(buildNotifyText(b))}&apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch (_) { return false; }
}
