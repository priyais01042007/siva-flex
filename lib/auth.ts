import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { extractClientMeta, logAudit } from "@/lib/audit";

export const SESSION_COOKIE_NAME = "siva_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours (1 day) hard limit for admin
export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 3 * 60 * 60; // 3 hours limit for customer
export const SESSION_MAX_AGE_SECONDS = CUSTOMER_SESSION_MAX_AGE_SECONDS;

export interface AuthUser {
  id: string; // UUID from users table
  email: string;
  role: "admin" | "dealer";
  dealerId: number | null; // legacy customer_id if role === 'dealer'
  status: "active" | "suspended" | "pending";
  mustChangePassword: boolean;
  name?: string;
  mobile?: string;
  gst?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Hash raw token with SHA-256 for secure database lookup
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Hash a plain password using bcrypt (cost factor 12 for admin, 10 for dealers)
 */
export async function hashPassword(password: string, costFactor: number = 10): Promise<string> {
  return bcrypt.hash(password, costFactor);
}

/**
 * Verify a plain password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Create a new cryptographically secure session in the database
 */
export async function createSession(
  userId: string,
  req?: Request | null,
  role: "admin" | "dealer" = "dealer"
): Promise<{ rawToken: string; session: AuthSession }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const maxAge = role === "admin" ? ADMIN_SESSION_MAX_AGE_SECONDS : CUSTOMER_SESSION_MAX_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const meta = extractClientMeta(req);

  const rows = await sql`
    INSERT INTO public.sessions (
      user_id,
      session_token_hash,
      expires_at,
      ip_address,
      user_agent
    ) VALUES (
      ${userId},
      ${tokenHash},
      ${expiresAt.toISOString()},
      ${meta.ipAddress},
      ${meta.userAgent}
    )
    RETURNING id, user_id, session_token_hash, expires_at, created_at, ip_address, user_agent;
  `;

  // Update last_login on users
  await sql`
    UPDATE public.users 
    SET last_login = NOW(), updated_at = NOW() 
    WHERE id = ${userId};
  `;

  const s = rows[0];
  const session: AuthSession = {
    id: s.id,
    userId: s.user_id,
    expiresAt: new Date(s.expires_at),
    createdAt: new Date(s.created_at),
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
  };

  return { rawToken, session };
}

/**
 * Validate a raw session token against the database
 */
export async function validateSession(rawToken: string): Promise<{ user: AuthUser; session: AuthSession } | null> {
  if (!rawToken || typeof rawToken !== "string") return null;

  try {
    const tokenHash = hashSessionToken(rawToken);

    const rows = await sql`
      SELECT 
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        s.created_at AS session_created_at,
        s.ip_address,
        s.user_agent,
        u.id AS user_id,
        u.email,
        u.role,
        u.dealer_id,
        u.status,
        u.must_change_password,
        c.customer_name,
        c.customer_mobile_number,
        c.customer_gst_number
      FROM public.sessions s
      JOIN public.users u ON s.user_id = u.id
      LEFT JOIN public.customer c ON u.dealer_id = c.customer_id
      WHERE s.session_token_hash = ${tokenHash}
        AND s.expires_at > NOW()
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Check if user is suspended
    if (row.status !== "active") {
      return null;
    }

    const user: AuthUser = {
      id: row.user_id,
      email: row.email,
      role: row.role as "admin" | "dealer",
      dealerId: row.dealer_id ? Number(row.dealer_id) : null,
      status: row.status as "active" | "suspended" | "pending",
      mustChangePassword: Boolean(row.must_change_password),
      name: row.customer_name || (row.role === "admin" ? "SIVA FLEX ADMIN" : "DEALER"),
      mobile: row.customer_mobile_number ? String(row.customer_mobile_number) : undefined,
      gst: row.customer_gst_number || undefined,
    };

    const session: AuthSession = {
      id: row.session_id,
      userId: row.user_id,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.session_created_at),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };

    return { user, session };
  } catch (err) {
    console.error("[VALIDATE SESSION ERROR]:", err);
    return null;
  }
}

/**
 * Invalidate a session (Logout)
 */
export async function invalidateSession(rawToken: string, userId?: string, req?: Request): Promise<void> {
  if (!rawToken) return;
  try {
    const tokenHash = hashSessionToken(rawToken);
    await sql`
      DELETE FROM public.sessions
      WHERE session_token_hash = ${tokenHash};
    `;

    if (userId) {
      await logAudit({
        userId,
        action: "LOGOUT",
        description: "User successfully signed out and session invalidated.",
        req,
      });
    }
  } catch (err) {
    console.error("[INVALIDATE SESSION ERROR]:", err);
  }
}

/**
 * Invalidate all sessions for a user, optionally preserving a specific active session.
 */
export async function invalidateUserSessions(userId: string, exceptRawToken?: string): Promise<void> {
  if (!userId) return;
  try {
    if (exceptRawToken) {
      const exceptHash = hashSessionToken(exceptRawToken);
      await sql`
        DELETE FROM public.sessions
        WHERE user_id = ${userId} AND session_token_hash != ${exceptHash};
      `;
    } else {
      await sql`
        DELETE FROM public.sessions
        WHERE user_id = ${userId};
      `;
    }
  } catch (err) {
    console.error("[INVALIDATE USER SESSIONS ERROR]:", err);
  }
}

/**
 * Get currently authenticated user in Server Components and Route Handlers via Cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const result = await validateSession(token);
    return result ? result.user : null;
  } catch {
    return null;
  }
}

/**
 * Set the secure session cookie on a Next.js Server Response or Route Handler
 */
export function getSessionCookieAttributes(token: string, role: "admin" | "dealer" = "dealer") {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = role === "admin" ? ADMIN_SESSION_MAX_AGE_SECONDS : CUSTOMER_SESSION_MAX_AGE_SECONDS;
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Role-Based Access Control (RBAC) & IDOR Prevention
 */
export function checkPermission(
  user: AuthUser | null,
  action:
    | "admin:access"
    | "admin:manage_dealers"
    | "admin:view_all_orders"
    | "dealer:access"
    | "dealer:view_order"
    | "dealer:upload_file"
    | "dealer:delete_file"
    | "dealer:view_report"
    | "dealer:view_invoice",
  targetDealerId?: number | string | null
): boolean {
  if (!user) return false;

  // 1. Admins have superuser privileges across all operations
  if (user.role === "admin") {
    return true;
  }

  // 2. Dealers can NEVER access administrative actions
  if (action.startsWith("admin:")) {
    return false;
  }

  // 3. IDOR Prevention: Dealers can ONLY access their own resources
  if (targetDealerId !== undefined && targetDealerId !== null) {
    const target = Number(targetDealerId);
    const userDealer = Number(user.dealerId);
    if (!target || !userDealer || target !== userDealer) {
      return false; // IDOR attempt blocked
    }
  }

  return true;
}
