// Validates required environment variables at startup. A misconfigured
// deployment (missing JWT secret, wildcard CORS in production, etc.) should
// fail loudly here rather than silently running in an insecure state.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnv() {
  const jwtSecret = requireEnv("JWT_SECRET");
  if (jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET is too short. Use at least 32 random characters (e.g. `openssl rand -hex 32`)."
    );
  }
  if (/^(secret|changeme|password|jwt_secret)$/i.test(jwtSecret)) {
    throw new Error("JWT_SECRET looks like a placeholder value. Replace it with a real random secret.");
  }

  requireEnv("DATABASE_URL");

  if (process.env.NODE_ENV === "production") {
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin || corsOrigin === "*") {
      throw new Error(
        "CORS_ORIGIN must be set to your exact frontend URL in production — wildcard CORS is not allowed."
      );
    }
  }
}
