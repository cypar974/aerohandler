import { supabase } from "../supabase.js";

export class DataSources {
    static async loadStudents() {
        try {


            const { data, error } = await supabase.schema('api').rpc('get_members');

            if (error) throw error;


            const students = (data || []).filter(p => p.type === 'student');

            return students.map(student => ({
                id: student.id,

                name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                email: student.email || '',
                type: 'student'
            })).sort((a, b) => a.first_name.localeCompare(b.first_name));
        } catch (error) {
            console.error('Error loading students:', error);
            return [];
        }
    }

    static async loadInstructors() {
        try {


            const { data, error } = await supabase.schema('api').rpc('get_members');

            if (error) throw error;


            const instructors = (data || []).filter(p => p.type === 'instructor');

            return instructors.map(instructor => ({
                id: instructor.id,

                name: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
                first_name: instructor.first_name || '',
                last_name: instructor.last_name || '',
                email: instructor.email || '',
                type: 'instructor'
            })).sort((a, b) => a.first_name.localeCompare(b.first_name));
        } catch (error) {
            console.error('Error loading instructors:', error);
            return [];
        }
    }

    static async loadCombined() {


        const [students, instructors] = await Promise.all([
            this.loadStudents(),
            this.loadInstructors()
        ]);

        return [...students, ...instructors];
    }

    static async loadByType(type) {
        switch (type) {
            case 'students':
                return await this.loadStudents();
            case 'instructors':
                return await this.loadInstructors();
            case 'both':
                return await this.loadCombined();
            default:
                return [];
        }
    }
}