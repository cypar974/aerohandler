// js/supabase.js
// We switch to esm.sh which handles the module exports for Supabase much better in the browser
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://iqeifflmubyvlygremnr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlmZmxtdWJ5dmx5Z3JlbW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTQ0MzAsImV4cCI6MjA4MDk3MDQzMH0.eYNi0AnnJOCoV80KwenF7HIxy6OlwesbhLIcLhzkVnE";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);