// js/supabase.js
// We switch to esm.sh which handles the module exports for Supabase much better in the browser
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mvtaweywmemerwnkanco.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dGF3ZXl3bWVtZXJ3bmthbmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTI0MTYsImV4cCI6MjA4MDU2ODQxNn0.x0VZ7_s9yk915XLpdkz4r4L2wtcSEfFHg4jEMAioFHE"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);