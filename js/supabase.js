// js/supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ijtavebvfjljlznicsvy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdGF2ZWJ2Zmpsamx6bmljc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MjA5MTYsImV4cCI6MjA4MDk5NjkxNn0.E0F-RraCqcqX88gwPkQGsH9o3Q0bEDGMvZ_ZKnNru8o";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);