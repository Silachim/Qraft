// src/Stripe.js
import { loadStripe } from "@stripe/stripe-js";
import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// ── Stripe instance ───────────────────────────────────────────────────────────
let stripePromise = null;
const getStripe = () => {
  const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error("Stripe publishable key missing. Add REACT_APP_STRIPE_PUBLISHABLE_KEY to Vercel env vars.");
    return null;
  }
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
};

// ── Check Pro status ──────────────────────────────────────────────────────────
export async function checkProStatus(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() && snap.data().isPro === true;
  } catch(e) {
    console.error("Pro check failed:", e);
    return false;
  }
}

// ── Grant Pro access ──────────────────────────────────────────────────────────
export async function grantProAccess(uid, sessionId) {
  if (!uid) return;
  await setDoc(doc(db, "users", uid), {
    isPro:         true,
    proGrantedAt:  serverTimestamp(),
    stripeSession: sessionId || "manual",
    plan:          "lifetime",
  }, { merge: true });
}

// ── Start Stripe Checkout (new API) ──────────────────────────────────────────
export async function startCheckout() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before purchasing.");

  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured. Add your publishable key to Vercel environment variables.");

  const priceId = process.env.REACT_APP_STRIPE_PRICE_ID;
  if (!priceId) throw new Error("Stripe Price ID missing. Add REACT_APP_STRIPE_PRICE_ID to Vercel environment variables.");

  // Save pending payment record
  try {
    await setDoc(doc(db, "pendingPayments", user.uid), {
      uid:       user.uid,
      email:     user.email,
      priceId,
      createdAt: serverTimestamp(),
      status:    "pending",
    });
  } catch(e) {
    console.warn("Could not save pending payment:", e.message);
  }

  // Use new Stripe Checkout API
  const { error } = await stripe.initEmbeddedCheckout
    ? await handleNewCheckout(stripe, priceId, user)
    : await handleLegacyCheckout(stripe, priceId, user);

  if (error) throw new Error(error.message);
}

// ── New Stripe Checkout (Payment Links approach) ──────────────────────────────
async function handleNewCheckout(stripe, priceId, user) {
  // Create a checkout session via Stripe Payment Links
  // Since we don't have a backend, we redirect to a Stripe-hosted payment link
  // The payment link must be created in the Stripe dashboard
  const paymentLinkUrl = process.env.REACT_APP_STRIPE_PAYMENT_LINK;

  if (paymentLinkUrl) {
    // Append success/cancel params to payment link
    const url = new URL(paymentLinkUrl);
    url.searchParams.set("client_reference_id", user.uid);
    url.searchParams.set("prefilled_email", user.email || "");
    window.location.href = url.toString();
    return { error: null };
  }

  // Fallback: use checkout sessions with redirect
  return await handleLegacyCheckout(stripe, priceId, user);
}

// ── Legacy / Fallback Checkout ────────────────────────────────────────────────
async function handleLegacyCheckout(stripe, priceId, user) {
  try {
    const result = await stripe.redirectToCheckout({
      lineItems:     [{ price: priceId, quantity: 1 }],
      mode:          "payment",
      successUrl:    `${window.location.origin}/?payment=success&uid=${user.uid}`,
      cancelUrl:     `${window.location.origin}/?payment=cancelled`,
      customerEmail: user.email,
    });
    return result;
  } catch {
    // redirectToCheckout not available — use payment link fallback
    throw new Error("Please set up a Stripe Payment Link. See setup instructions.");
  }
}

// ── Handle payment return ─────────────────────────────────────────────────────
export async function handlePaymentReturn() {
  const params  = new URLSearchParams(window.location.search);
  const payment = params.get("payment");
  const uid     = params.get("uid");
  // Also check for Stripe Payment Link return
  const clientRef = params.get("client_reference_id");

  const effectiveUid = uid || clientRef || auth.currentUser?.uid;

  if ((payment === "success" || params.get("checkout") === "success") && effectiveUid) {
    window.history.replaceState({}, "", window.location.pathname);
    try {
      await grantProAccess(effectiveUid, "stripe_checkout");
    } catch(e) {
      console.error("Failed to grant Pro:", e);
    }
    return "success";
  }
  if (payment === "cancelled") {
    window.history.replaceState({}, "", window.location.pathname);
    return "cancelled";
  }
  return null;
}

export { getStripe };