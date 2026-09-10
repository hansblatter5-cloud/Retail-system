import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

import { validateEnv } from "./utils/validateEnv";
import { generalLimiter, loginLimiter, signupLimiter } from "./middleware/rateLimiters";

// Fail fast on boot if secrets are missing, weak, or misconfigured for the
// current environment — better to crash at startup than run insecurely.
validateEnv();

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import customerRoutes from "./routes/customerRoutes";
import orderRoutes from "./routes/orderRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import qnaRoutes from "./routes/qnaRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import shippingRoutes from "./routes/shippingRoutes";

const app = express();

// Required when deployed behind Render/Vercel's proxy so express-rate-limit
// and req.ip read the real client IP instead of the proxy's.
app.set("trust proxy", 1);

// Sets a solid baseline of security headers (X-Content-Type-Options,
// X-Frame-Options, HSTS in production, etc.).
app.use(helmet());

// CORS is locked to a single explicit origin — no wildcard. In production
// this is enforced by validateEnv() above; in dev it falls back to the
// standard Next.js dev server URL rather than "*".
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));

// Caps request body size — prevents oversized payloads from being used as a
// crude denial-of-service vector.
app.use(express.json({ limit: "1mb" }));

// Baseline rate limit across the whole API, with tighter limits layered on
// top for the specific endpoints most attractive to abuse (below).
app.use("/api", generalLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/signup", signupLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/questions", qnaRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/shipping-zones", shippingRoutes);

// Central error handler — catches anything that slips past controller try/catches.
// Deliberately returns a generic message: internal error details (stack traces,
// SQL fragments, etc.) never reach the client, only the server log.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
