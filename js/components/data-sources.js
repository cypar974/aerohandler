// ./js/components/components/data-sources.js
import { supabase } from "../supabase.js";

export class DataSources {
    static async loadStudents() {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, first_name, last_name, email')
                .order('first_name', { ascending: true });

            if (error) throw error;

            return (data || []).map(student => ({
                id: student.id,
                name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                email: student.email || '',
                type: 'student'
            }));
        } catch (error) {
            console.error('Error loading students:', error);
            return [];
        }
    }

    static async loadInstructors() {
        try {
            // CHANGED: Select first_name and last_name instead of full_name
            const { data, error } = await supabase
                .from('instructors')
                .select('id, first_name, last_name, email')
                .order('first_name', { ascending: true });

            if (error) throw error;

            return (data || []).map(instructor => ({
                id: instructor.id,
                // CHANGED: Construct name from first_name + last_name
                name: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
                first_name: instructor.first_name || '',
                last_name: instructor.last_name || '',
                email: instructor.email || '',
                type: 'instructor'
            }));
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