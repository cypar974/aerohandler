// js/utils/memberData.js
import { supabase } from '../supabase.js';

/**
 * SECURE MEMBER FETCHER
 * Replaces: supabase.from("").select("*")
 * * @param {string|null} roleFilter - Optional: 'student', 'instructor', etc.
 * @returns {Promise<{data: Array, error: Object}>}
 */
export async function getMembers(roleFilter = null) {


    let { data, error } = await supabase.schema('api').rpc('get_members');

    if (error) {
        console.error("Error fetching members:", error);
        return { data: [], error };
    }



    if (roleFilter && data) {
        data = data.filter(person => person.type === roleFilter);
    }

    return { data, error: null };
}