// =========================================================
// Employee self-registration (open, pending admin approval)
// The employee picks their own Employee ID (checked for
// uniqueness by the DB's unique constraint) and their device's
// GPS location is captured at registration time and stored
// alongside the pending record — purely so an admin can visually
// sanity-check it before approving. It does NOT set their store
// assignment or geofence; admin still manually assigns the store,
// so "employee never picks their own store" still holds.
// =========================================================
import { supabase } from "../supabaseClient.js";

export async function signUpEmployee(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data; // { user, session }
}

/**
 * Active stores for the registration dropdown. Readable without
 * being signed in yet (see the "anyone can read active stores"
 * RLS policy) since a person picks their store before they have
 * an account.
 */
export async function fetchActiveStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, store_code, store_name")
    .eq("status", "active")
    .order("store_name");
  if (error) throw error;
  return data || [];
}

/**
 * Creates the employee's own pending row with their chosen
 * Employee ID and captured location. Throws a friendly error if
 * the Employee ID is already taken (Postgres unique violation).
 */
export async function createPendingEmployee({ authUserId, employeeCode, name, mobile, requestedStoreId, location }) {
  const { data, error } = await supabase
    .from("employees")
    .insert({
      auth_user_id: authUserId,
      employee_code: employeeCode.trim().toUpperCase(),
      name,
      mobile,
      requested_store_id: requestedStoreId || null,
      status: "pending",
      registration_latitude: location?.latitude ?? null,
      registration_longitude: location?.longitude ?? null,
      registration_accuracy: location?.accuracy ?? null
    })
    .select("id, employee_code")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Employee ID "${employeeCode.trim().toUpperCase()}" is already taken. Please choose another.`);
    }
    throw error;
  }
  return data; // { id, employee_code }
}
