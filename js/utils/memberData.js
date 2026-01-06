// js/utils/memberData.js
import { supabase } from '../supabase.js'; // Adjust path to your supabase client

/**
 * SECURE MEMBER FETCHER
 * Replaces: supabase.from("").select("*")
 * * @param {string|null} roleFilter - Optional: 'student', 'instructor', etc.
 * @returns {Promise<{data: Array, error: Object}>}
 */
export async function getMembers(roleFilter = null) {
    // 1. Call the secure Database Function (RPC) instead of the View
    // Note: We use .schema('api') because your function is in the api schema
    let { data, error } = await supabase.schema('api').rpc('get_members');

    if (error) {
        console.error("Error fetching members:", error);
        return { data: [], error };
    }

    // 2. Client-side filtering to mimic .eq('type', '...')
    // This allows you to easily replace old queries that had filters
    if (roleFilter && data) {
        data = data.filter(person => person.type === roleFilter);
    }

    return { data, error: null };
}