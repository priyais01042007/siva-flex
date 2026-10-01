import { sql } from "@/lib/db";

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  req?: Request | null;
}

export function extractClientMeta(req?: Request | null): { ipAddress: string; userAgent: string } {
  if (!req) {
    return { ipAddress: "unknown", userAgent: "unknown" };
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : (realIp || "127.0.0.1");
  const userAgent = req.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    let ip = options.ipAddress;
    let ua = options.userAgent;

    if (options.req && (!ip || !ua)) {
      const meta = extractClientMeta(options.req);
      if (!ip) ip = meta.ipAddress;
      if (!ua) ua = meta.userAgent;
    }

    await sql`
      INSERT INTO public.audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      ) VALUES (
        ${options.userId || null},
        ${options.action},
        ${options.description || null},
        ${ip || "unknown"},
        ${ua || "unknown"}
      );
    `;
  } catch (err) {
    // Fail-safe: Audit logging error should not crash the primary operational transaction,
    // but should be logged to server stderr.
    console.error("[AUDIT LOG ERROR]:", err);
  }
}
