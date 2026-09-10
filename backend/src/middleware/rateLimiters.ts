import rateLimit from "express-rate-limit";

// Login: the classic brute-force target. Tight limit per IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a few minutes and try again." },
});

// Signup: prevents scripted account-creation spam clogging the approval queue.
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts from this network. Please try again later." },
});

// Public order creation (storefront checkout has no auth): limits fake-order
// spam that could otherwise be used to drain stock or flood the orders list.
export const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders placed in a short time. Please wait a moment and try again." },
});

// Forgot-password: prevents using this endpoint to spam someone's inbox or
// to brute-force probe which emails have accounts (combined with the
// generic response in the controller, which doesn't reveal that either).
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});
// Public review/question submission: no auth, so this is the main spam
// defense alongside staff moderation (reviews/questions start PENDING).
export const reviewSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this network. Please try again later." },
});

// Public attachment upload (review photos/videos) — tighter than the
// staff-only product upload since it's reachable without login.
export const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads from this network. Please try again later." },
});

// General API-wide limiter as a baseline safety net against scripted abuse.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
