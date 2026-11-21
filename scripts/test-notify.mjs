// உரிமையாளர் WhatsApp அறிவிப்பு (worker/src/notify.js) — எண் வெளியே போகாததையும், ரகசியம் இல்லாதபோது எதுவும்
// அனுப்பப்படாததையும் சோதிக்கும். வெளிச் சேவை அழைக்கப்படுவதில்லை (fetch போலியாக்கப்படுகிறது).
//   node scripts/test-notify.mjs
import { notifyOwner, buildNotifyText } from "../worker/src/notify.js";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("  FAIL:", label); } };

const calls = [];
globalThis.fetch = async (url) => { calls.push(String(url)); return { ok: true }; };

// ரகசியம் இல்லை → அனுப்பப்படாது
ok((await notifyOwner({}, { kind: "feedback", comment: "நன்றி" })) === false && calls.length === 0, "no secrets → nothing sent");
ok((await notifyOwner({ WHATSAPP_PHONE: "919876543210" }, { comment: "x" })) === false && calls.length === 0, "phone without key → nothing sent");

// ரகசியம் உண்டு → ஒரே ஒரு அழைப்பு, சரியான முகவரி
const env = { WHATSAPP_PHONE: "+91 98765-43210", CALLMEBOT_APIKEY: " 123456 " };
ok((await notifyOwner(env, { kind: "answer", reason: "wrong", comment: "தேதி தவறு  என்று\nநினைக்கிறேன்", question: "என் பிறந்த தேதி 1.1.1990", answer: "ரகசியப் பதில்", owner: "uid123" })) === true, "sent with secrets");
ok(calls.length === 1 && calls[0].startsWith("https://api.callmebot.com/whatsapp.php?phone=919876543210&text="), "one call, digits-only phone");
const text = decodeURIComponent(calls[0].split("&text=")[1].split("&apikey=")[0]);
ok(text === "ஜோதிட நிபுணர் — புதிய பதில் பற்றிய புகார்\nகாரணம்: தவறான தகவல்\nதேதி தவறு என்று நினைக்கிறேன்", "message text: " + JSON.stringify(text));
ok(!/1990|ரகசியப் பதில்|uid123/.test(text), "question / answer / account id are NOT sent");
ok(calls[0].endsWith("&apikey=123456"), "api key trimmed");

// உரை நீளம், வகை
ok(buildNotifyText({ kind: "feedback", comment: "அ".repeat(2000) }).length < 680, "comment clipped to 600");
ok(buildNotifyText({ kind: "feedback", comment: "" }).endsWith("(உரை இல்லை)"), "empty comment placeholder");
ok(buildNotifyText({ kind: "feedback", comment: 42, reason: {} }).split("\n").length === 2, "non-string fields ignored");

// சேவை தோல்வி → false, பிழை எறியப்படாது
globalThis.fetch = async () => { throw new Error("network"); };
ok((await notifyOwner(env, { comment: "x" })) === false, "network failure → false, no throw");
globalThis.fetch = async () => ({ ok: false });
ok((await notifyOwner(env, { comment: "x" })) === false, "service error → false");

console.log(`\nஅறிவிப்புச் சோதனை: ${pass} தேர்ச்சி, ${fail} தோல்வி`);
if (fail) process.exit(1);
