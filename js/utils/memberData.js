import { supabase } from '../supabase.js';
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