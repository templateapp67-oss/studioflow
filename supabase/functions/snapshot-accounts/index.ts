import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  try {
    // 1. Snapshot the data
    const { data, error } = await supabase.from("studioflow_accounts").select("*");
    if (error) throw error;

    // 2. Insert into a backup table (assumes studioflow_accounts_backup exists)
    const backupData = data.map(record => ({
      ...record,
      snapshot_date: new Date().toISOString()
    }));

    const { error: insertError } = await supabase.from("studioflow_accounts_backup").insert(backupData);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Snapshot created successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
})
