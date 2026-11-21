// கருத்து / புகார் அனுப்புதல்: Firestore-இல் பதிவு (firebase.js) + உரிமையாளருக்கு அறிவிப்பு (api.js → சேவையகம் → WhatsApp).
import { submitReport } from "./firebase.js";
import { apiNotifyReport } from "./api.js";

export async function sendReport(report) {
  const ok = await submitReport(report);
  if (ok) apiNotifyReport(report); // காத்திருக்க வேண்டாம்; தோல்வி பயனரைப் பாதிக்காது
  return ok;
}
