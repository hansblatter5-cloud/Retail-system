import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/auth";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    const token = header.split(" ")[1];
    const payload = verifyToken(token);

    // Re-check user still exists and is approved on every request.
    // This ensures a rejected/deactivated staff member loses access immediately,
    // not just after their token expires.
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status !== "APPROVED") {
      return res.status(403).json({ error: "Account not found or not approved" });
    }

    req.user = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Array<"OWNER" | "MANAGER" | "STAFF">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    next();
  };
}
