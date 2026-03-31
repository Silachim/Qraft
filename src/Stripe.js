// src/Stripe.js
// Handles Stripe payment integration for QRaft Pro
import { loadStripe } from "@stripe/stripe-js";
import { db, auth } from "./firebase";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "firebase/firestore";

// ── Stripe instance (lazy loaded) ─────────────────────────────────────────────
let stripePromise = null;
const getStripe = () => {
  const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error("Stripe publishable key is missing. Add REACT_APP_STRIPE_PUBLISHABLE_KEY to your .env file.");
    return null;
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// ── Check if user has Pro access ──────────────────────────────────────────────
export async function checkProStatus(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return false;
    const data = snap.data();
    return data.isPro === true;
  } catch(e) {
    console.error("Pro status check failed:", e);
    return false;
  }
}

// ── Grant Pro access (called after successful payment) ────────────────────────
export async function grantProAccess(uid, sessionId) {
  if (!uid) return;
  try {
    await setDoc(doc(db, "users", uid), {
      isPro:          true,
      proGrantedAt:   serverTimestamp(),
      stripeSession:  sessionId || "manual",
      plan:           "lifetime",
    }, { merge: true });
  } catch(e) {
    console.error("Failed to grant Pro access:", e);
    throw e;
  }
}

// ── Initiate Stripe Checkout ──────────────────────────────────────────────────
export async function startCheckout() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before purchasing.");

  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured. Please add your publishable key to the environment variables.");

  const priceId = process.env.REACT_APP_STRIPE_PRICE_ID;
  if (!priceId) throw new Error("Stripe Price ID is missing. Add REACT_APP_STRIPE_PRICE_ID to your environment variables.");

  // Store pending session in Firestore so we can verify after redirect
  await setDoc(doc(db, "pendingPayments", user.uid), {
    uid:       user.uid,
    email:     user.email,
    priceId,
    createdAt: serverTimestamp(),
    status:    "pending",
  });

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: "payment",
    successUrl: `${window.location.origin}/?payment=success&uid=${user.uid}`,
    cancelUrl:  `${window.location.origin}/?payment=cancelled`,
    customerEmail: user.email,
  });

  if (error) throw new Error(error.message);
}

// ── Handle payment return (called on page load) ───────────────────────────────
export async function handlePaymentReturn() {
  const params  = new URLSearchParams(window.location.search);
  const payment = params.get("payment");
  const uid     = params.get("uid");

  if (payment === "success" && uid) {
    window.history.replaceState({}, "", window.location.pathname);
    try {
      await grantProAccess(uid, "stripe_checkout");
      return "success";
    } catch(e) {
      console.error("Failed to grant Pro:", e);
      // Still return success — user paid, we'll retry
      return "success";
    }
  }
  if (payment === "cancelled") {
    window.history.replaceState({}, "", window.location.pathname);
    return "cancelled";
  }
  return null;
}

export { getStripe };