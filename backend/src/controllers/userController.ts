import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { logAudit } from "../utils/audit";
import { AccountStatus } from "@prisma/client";
import { queryString } from "../utils/queryString";

// List all users — Owner/Manager only. Useful for the "manage staff" screen.
export async function listUsers(req: Request, res: Response) {
  const status = queryString(req.query.status);
  const users = await prisma.user.findMany({
    where: status ? { status: status as AccountStatus } : undefined,
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(users);
}

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]).optional(),
});

// Approve or reject a pending signup. Only Owner can promote to MANAGER/OWNER;
// Managers can approve as STAFF only.
export async function decideUser(req: Request, res: Response) {
  const id = String(req.params.id);
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { status, role } = parsed.data;

  if (role && role !== "STAFF" && req.user!.role !== "OWNER") {
    return res.status(403).json({ error: "Only the Owner can assign Manager or Owner roles" });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  // A user can only be actioned once from PENDING — prevents replaying this
  // endpoint against an already-decided account to quietly change its role.
  if (target.status !== "PENDING") {
    return res.status(409).json({ error: "This account has already been decided. Use the role endpoint to change roles." });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status, ...(role ? { role } : {}) },
  });

  await logAudit({
    action: status === "APPROVED" ? "USER_APPROVED" : "USER_REJECTED",
    actorId: req.user!.userId,
    targetType: "User",
    targetId: updated.id,
    metadata: { assignedRole: role || updated.role, targetEmail: updated.email },
  });

  return res.json({
    message: `User ${status === "APPROVED" ? "approved" : "rejected"}`,
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status },
  });
}

// Owner-only: change an existing approved user's role.
export async function updateUserRole(req: Request, res: Response) {
  if (req.user!.role !== "OWNER") {
    return res.status(403).json({ error: "Only the Owner can change staff roles" });
  }
  const id = String(req.params.id);

  // An Owner can't demote/change their own role through this endpoint —
  // prevents accidentally locking the business out of its own Owner account.
  if (id === req.user!.userId) {
    return res.status(400).json({ error: "You cannot change your own role" });
  }

  const parsed = z.object({ role: z.enum(["OWNER", "MANAGER", "STAFF"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  const updated = await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });

  await logAudit({
    action: "USER_ROLE_CHANGED",
    actorId: req.user!.userId,
    targetType: "User",
    targetId: updated.id,
    metadata: { fromRole: target.role, toRole: updated.role, targetEmail: updated.email },
  });

  return res.json({ id: updated.id, role: updated.role });
}
