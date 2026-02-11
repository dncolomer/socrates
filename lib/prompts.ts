// ============================================
// USER PROMPT OVERRIDES
// Loads per-user prompt customizations from Supabase
// ============================================

import { createClient } from "@/lib/supabase/server";
import type { UserPrompts } from "./openrouter";

/**
 * Load user's custom prompt overrides from their Supabase profile.
 * Returns an empty object if user is not authenticated or has no overrides.
 * Call this from server-side API routes.
 */
export async function getUserPrompts(): Promise<UserPrompts> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return {};

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    if (!profile?.metadata?.prompts) return {};

    return profile.metadata.prompts as UserPrompts;
  } catch {
    return {};
  }
}

/**
 * Load user's preferred Ask model from their Supabase profile.
 * Returns undefined if not set (will use default model).
 */
export async function getUserAskModel(): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return undefined;

    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", user.id)
      .single();

    if (!profile?.metadata?.ask_model) return undefined;

    return profile.metadata.ask_model as string;
  } catch {
    return undefined;
  }
}
