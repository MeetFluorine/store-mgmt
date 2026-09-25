// =========================================================
// Edge Function: delete-account
//
// Deleting a Supabase Auth login requires the service-role key —
// something that must NEVER be shipped to the browser. This
// function runs server-side, reads the service role key from its
// own environment (auto-injected by Supabase, never stored in any
// file in this repo), and is the only place that key is used.
//
// Rules enforced here:
//   - A regular employee may only delete their OWN account.
//   - An admin (app_metadata.role === "admin") may delete ANY
//     account by employeeId or authUserId.
//   - Deleting the employees row cascades (via existing FKs) to
//     employee_store_mapping, face_profiles, attendance, and
//     attendance_events. The Auth user is then deleted separately,
//     which removes their ability to log in at all.
//
// Deploy via the Supabase Dashboard: Edge Functions → Create a new
// function → name it "delete-account" → paste this file's content.
// No CLI required.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Client scoped to the CALLER's own JWT — used only to find out
    // who is calling and whether they're an admin. Never used to
    // bypass RLS.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: "Invalid session" }, 401);
    }

    const isAdmin = caller.app_metadata?.role === "admin";
    const body = await req.json().catch(() => ({}));

    // Service-role client — bypasses RLS entirely. Only ever used
    // here, server-side, never exposed to any browser.
    const adminClient = createClient(supabaseUrl, serviceKey);

    let employeeRow;
    if (isAdmin) {
      const { employeeId, authUserId } = body;
      if (!employeeId && !authUserId) {
        return json({ error: "employeeId or authUserId required" }, 400);
      }
      const query = adminClient.from("employees").select("id, auth_user_id, name");
      const { data } = employeeId
        ? await query.eq("id", employeeId).maybeSingle()
        : await query.eq("auth_user_id", authUserId).maybeSingle();
      employeeRow = data;
    } else {
      // Self-delete: always resolved from the caller's own identity,
      // never from anything the client sent — an employee cannot
      // pass someone else's id to delete their account.
      const { data } = await adminClient
        .from("employees")
        .select("id, auth_user_id, name")
        .eq("auth_user_id", caller.id)
        .maybeSingle();
      employeeRow = data;
    }

    if (!employeeRow) {
      return json({ error: "Employee record not found" }, 404);
    }

    const { error: deleteEmpErr } = await adminClient.from("employees").delete().eq("id", employeeRow.id);
    if (deleteEmpErr) {
      return json({ error: deleteEmpErr.message }, 500);
    }

    if (employeeRow.auth_user_id) {
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(employeeRow.auth_user_id);
      if (deleteAuthErr) {
        return json({ error: `Employee data deleted, but login removal failed: ${deleteAuthErr.message}` }, 500);
      }
    }

    return json({ success: true, deletedEmployee: employeeRow.name });
  } catch (err) {
    return json({ error: err.message || "Unknown error" }, 500);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
