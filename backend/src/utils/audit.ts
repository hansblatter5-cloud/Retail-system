import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

interface AuditEntry {
  action: string;
  actorId?: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget audit logging. A failure here should never block the
// actual request — it's a record of what happened, not a gate on whether
// it's allowed to happen.
export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        targetType: entry.targetType,
        targetId: entry.targetId,
        // Prisma's Json field wants a recursively-verified InputJsonValue,
        // which TypeScript can't derive from an arbitrary Record<string, unknown>
        // on its own. The metadata we actually pass in (see call sites) is
        // always plain strings/numbers, so this cast is safe.
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
