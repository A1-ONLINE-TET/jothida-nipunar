import { apiOrder, apiAskPremium } from "../api.js";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Create an order, open Razorpay checkout, and — only after the Worker
// verifies the payment — return the premium AI answer.
// amountPaise defaults to ₹49.
export async function payThenAskPremium({ birth, question, name, amountPaise = 4900 }) {
  const order = await apiOrder(amountPaise); // { orderId, amount, keyId }
  if (!order?.orderId || !order?.keyId) throw new Error("payment not available");
  const ok = await loadRazorpay();
  if (!ok) throw new Error("checkout failed to load");

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: "INR",
      name: "TOPPER ASTRO",
      description: "ஜோதிட ஆலோசனை — ஆழமான பதில்",
      prefill: { name: name || "" },
      theme: { color: "#5b43c4" },
      handler: async (resp) => {
        try {
          const { answer } = await apiAskPremium(birth, question, {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve({ answer });
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error("cancelled")) },
    });
    rzp.open();
  });
}
