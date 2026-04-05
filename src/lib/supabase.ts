import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);