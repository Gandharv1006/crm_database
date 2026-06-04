// ============================================================
// Auth service — query crm_users table, manage localStorage
// ============================================================
import { supabase } from "./supabase";

const AUTH_KEY = "acadex_crm_auth";

export interface CrmAuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: "SUPER_ADMIN" | "SALES_MANAGER";
  salespersonId?: number;
  ts: number;
}

/**
 * Log in a CRM user by checking email + password_hash (plain-text for dev).
 * Returns the user object on success, or throws on failure.
 */
export async function login(
  email: string,
  password: string
): Promise<CrmAuthUser> {
  const { data, error } = await supabase
    .from("crm_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .eq("password_hash", password)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Invalid credentials");
  }

  // If SALES_MANAGER, also look up the salesperson record
  let salespersonId: number | undefined;
  if (data.role === "SALES_MANAGER") {
    const { data: sp } = await supabase
      .from("salespeople")
      .select("salesperson_id")
      .eq("crm_user_id", data.crm_user_id)
      .maybeSingle();
    salespersonId = sp?.salesperson_id;
  }

  const authUser: CrmAuthUser = {
    userId: data.crm_user_id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    salespersonId,
    ts: Date.now(),
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  return authUser;
}

/**
 * Clear session and redirect to login.
 */
export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = "/login";
}

/**
 * Read current user from localStorage. Returns null if not logged in.
 */
export function getUser(): CrmAuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrmAuthUser;
  } catch {
    return null;
  }
}

/**
 * Check if user is SUPER_ADMIN.
 */
export function isSuperAdmin(): boolean {
  const user = getUser();
  return user?.role === "SUPER_ADMIN";
}
