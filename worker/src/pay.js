// ═══════════════════════════════════════════════════════════════════
// Razorpay — server-side order creation + payment signature verification.
// key_secret NEVER reaches the client; only the Worker holds it.
// ═══════════════════════════════════════════════════════════════════

export async function createOrder(env, amountPaise) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("razorpay not configured");
  }
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", payment_capture: 1 }),
  });
  if (!res.ok) throw new Error("razorpay order " + res.status);
  return res.json();
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verify Razorpay's HMAC-SHA256 signature over "order_id|payment_id".
export async function verifyPayment(env, orderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET || !orderId || !paymentId || !signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${orderId}|${paymentId}`));
    return timingSafeEqual(toHex(sig), String(signature));
  } catch (_) { return false; }
}
