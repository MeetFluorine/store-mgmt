// =========================================================
// Auth context — turns a raw Supabase session into what the
// app actually needs to render: role, employee record, their
// active store assignment, and their enrolled face descriptors.
// =========================================================
import { supabase } from "../supabaseClient.js";

/**
 * Call after login (or on app boot, if a session already exists).
 * Returns one of:
 *   { role: "admin" }
 *   { role: "employee", status: "pending" }
 *   { role: "employee", status: "inactive" }
 *   { role: "employee", status: "active", employee, store, faceDescriptors }
 *   null  — no session
 */
export async function resolveCurrentContext() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) return null;

  const user = session.user;
  if (user.app_metadata?.role === "admin") {
    return { role: "admin", email: user.email };
  }

  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_code, name, mobile, designation, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (empErr || !employee) {
    return { role: "employee", status: "not-found" };
  }

  if (employee.status !== "active") {
    return { role: "employee", status: employee.status, employee };
  }

  const { data: mapping } = await supabase
    .from("employee_store_mapping")
    .select("store_id, stores ( id, store_code, store_name, latitude, longitude, allowed_radius )")
    .eq("employee_id", employee.id)
    .eq("status", "active")
    .maybeSingle();

  const store = mapping?.stores
    ? {
        id: mapping.stores.id,
        code: mapping.stores.store_code,
        name: mapping.stores.store_name,
        lat: mapping.stores.latitude,
        lng: mapping.stores.longitude,
        radius: mapping.stores.allowed_radius
      }
    : null;

  const { data: profiles } = await supabase
    .from("face_profiles")
    .select("embedding")
    .eq("employee_id", employee.id)
    .eq("status", "active");

  const faceDescriptors = (profiles || []).flatMap((p) => p.embedding);

  return { role: "employee", status: "active", employee, store, faceDescriptors };
}
