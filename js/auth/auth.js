// =========================================================
// Auth — real Supabase Auth (email + password)
// =========================================================
import { supabase } from "../supabaseClient.js";
import { clearSessionCache } from "./session.js";

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (error) return { success: false, error: error.message };
  return { success: true, session: data.session };
}

export async function logout() {
  await supabase.auth.signOut();
  clearSessionCache();
}
