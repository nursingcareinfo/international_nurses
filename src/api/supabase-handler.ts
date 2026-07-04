import { withSupabase } from "@supabase/server";

// 1. Public Endpoint - anyone can hit this
export const publicHandler = {
  fetch: withSupabase({ auth: "none" }, async (_req, ctx) => {
    return Response.json({
      status: "healthy",
      message: "Public endpoint connected successfully via @supabase/server",
      authMode: ctx.authMode,
    });
  }),
};

// 2. Secret-key Authenticated Endpoint - requires SUPABASE_SECRET_KEY as authorization or apikey header
export const secretHandler = {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    // ctx.supabaseAdmin bypasses RLS
    const { data, error } = await ctx.supabaseAdmin
      .from("nursing_applications")
      .select("id, full_name, email, license_number, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json({
      success: true,
      authMode: ctx.authMode,
      keyName: ctx.authKeyName,
      applications: data || [],
    });
  }),
};

// 3. User JWT Authenticated Endpoint - requires a valid user JWT
export const userHandler = {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    // ctx.supabase is RLS-scoped
    const { data, error } = await ctx.supabase
      .from("nursing_applications")
      .select("id, full_name, email, created_at")
      .limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json({
      success: true,
      authMode: ctx.authMode,
      userClaims: ctx.userClaims,
      applications: data || [],
    });
  }),
};
