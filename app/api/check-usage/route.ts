import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canStartSession, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, is_admin, extra_lessons, subscription_status, current_period_end")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Count sessions in the current billing period
    let sessionCount = 0;

    if (profile.plan === "free" || !profile.current_period_end) {
      // Free plan: count ALL sessions ever
      const { count } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      sessionCount = count ?? 0;
    } else {
      // Paid plan: count sessions since current_period_end minus ~30 days
      // We approximate billing period start as current_period_end minus 30 days
      const periodEnd = new Date(profile.current_period_end);
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 30);

      const { count } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", periodStart.toISOString());
      sessionCount = count ?? 0;
    }

    // Also count localStorage-based sessions if no DB sessions found
    // (handled client-side — the server only knows about DB sessions)

    const result = canStartSession(
      {
        plan: (profile.plan || "free") as PlanId,
        is_admin: profile.is_admin ?? false,
        extra_lessons: profile.extra_lessons ?? 0,
        subscription_status: profile.subscription_status ?? "inactive",
        current_period_end: profile.current_period_end,
      },
      sessionCount
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check usage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
