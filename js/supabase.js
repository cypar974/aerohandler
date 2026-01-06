import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nqmogyxuuufbtnklwyvz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbW9neXh1dXVmYnRua2x3eXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjA0NjAsImV4cCI6MjA4MzI5NjQ2MH0.zmOueqKj4ctLklAbLFGOsReYUSBB2IeaE8p91iK6Hcw";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);