import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class StudentModal {
    constructor() {
        this.modal = null;
        this.onStudentSaved = null;
        this.isEditMode = false;
        this.currentStudentId = null;
    }

    show(studentData = null, onStudentSaved = null) {
        this.onStudentSaved = onStudentSaved;
        this.isEditMode = !!studentData;
        this.currentStudentId = studentData?.id || null;


        if (!this.modal) {
            this.createModal();
        }


        if (studentData) {
            this.populateData(studentData);
        } else {
            this.resetForm();
        }

        this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetForm();
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'student-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        this.modal.innerHTML = `
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 id="student-modal-title" class="text-xl font-bold">Add New Student</h2>
                    <button id="close-student-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <form id="student-form" class="space-y-6">
                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Mandatory Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
                                <input type="text" id="student-first-name" placeholder="Enter first name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
                                <input type="text" id="student-last-name" placeholder="Enter last name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                                <input type="email" id="student-email" placeholder="Enter email address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-300 mb-2">Date of Birth *</label>
                                <div class="flex space-x-2">
                                    <div class="flex-1">
                                        <input type="number" id="dob-day" placeholder="DD" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="31" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="dob-month" placeholder="MM" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1" max="12" required>
                                    </div>
                                    <div class="flex-1">
                                        <input type="number" id="dob-year" placeholder="YYYY" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" min="1900" max="2100" required>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Additional Information</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                                <input type="text" id="student-phone" placeholder="Enter phone number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">License Number</label>
                                <input type="text" id="license-number" placeholder="Enter license number" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </fieldset>

                    <div id="edit-mode-fields" class="hidden">
                        <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                            <legend class="font-semibold text-gray-100 px-2">Contact & Emergency</legend>
                            <div class="grid grid-cols-1 gap-4 mt-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Address</label>
                                    <textarea id="student-address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" rows="2" placeholder="Enter full address"></textarea>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-300 mb-1">Emergency Contact Name</label>
                                        <input type="text" id="emergency-contact" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Emergency contact name">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-300 mb-1">Emergency Contact Phone</label>
                                        <input type="text" id="emergency-phone" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Emergency contact phone">
                                    </div>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                            <legend class="font-semibold text-gray-100 px-2">License & Medical</legend>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Membership Status</label>
                                    <select id="membership-status" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">License Type</label>
                                    <input type="text" id="license-type" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="License type">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">License Expiry</label>
                                    <input type="date" id="license-expiry" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Medical Expiry</label>
                                    <input type="date" id="medical-expiry" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button type="button" id="cancel-student-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span id="submit-button-text">Save Student</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('close-student-modal').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('cancel-student-btn').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('student-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveStudent();
        });


        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });


        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    populateData(studentData) {
        document.getElementById('student-modal-title').textContent = 'Edit Student';
        document.getElementById('submit-button-text').textContent = 'Update Student';


        document.getElementById('edit-mode-fields').classList.remove('hidden');


        document.getElementById('student-first-name').value = studentData.first_name || '';
        document.getElementById('student-last-name').value = studentData.last_name || '';
        document.getElementById('student-email').value = studentData.email || '';
        document.getElementById('student-phone').value = studentData.phone || '';
        document.getElementById('license-number').value = studentData.license_number || '';


        if (studentData.date_of_birth) {
            const [year, month, day] = studentData.date_of_birth.split('-');
            document.getElementById('dob-day').value = parseInt(day);
            document.getElementById('dob-month').value = parseInt(month);
            document.getElementById('dob-year').value = parseInt(year);
        }


        document.getElementById('student-address').value = studentData.address || '';
        document.getElementById('emergency-contact').value = studentData.emergency_contact_name || '';
        document.getElementById('emergency-phone').value = studentData.emergency_contact_phone || '';

        document.getElementById('membership-status').value = studentData.membership_status || 'active';
        document.getElementById('license-type').value = studentData.license_type || '';

        if (studentData.license_expiry) {
            document.getElementById('license-expiry').value = studentData.license_expiry;
        }
        if (studentData.medical_expiry) {
            document.getElementById('medical-expiry').value = studentData.medical_expiry;
        }
    }

    resetForm() {
        document.getElementById('student-modal-title').textContent = 'Add New Student';
        document.getElementById('submit-button-text').textContent = 'Save Student';
        document.getElementById('student-form').reset();


        document.getElementById('edit-mode-fields').classList.add('hidden');


        const today = new Date();
        document.getElementById('dob-day').value = '';
        document.getElementById('dob-month').value = '';
        document.getElementById('dob-year').value = '';

        this.isEditMode = false;
        this.currentStudentId = null;
    }

    async saveStudent() {
        const submitBtn = document.querySelector('#student-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                ${this.isEditMode ? 'Updating...' : 'Saving...'}
            `;


            const firstName = document.getElementById("student-first-name").value.trim();
            const lastName = document.getElementById("student-last-name").value.trim();
            const email = document.getElementById("student-email").value.trim();
            const day = document.getElementById("dob-day").value;
            const month = document.getElementById("dob-month").value;
            const year = document.getElementById("dob-year").value;


            if (!firstName || !lastName || !email) {
                showToast("Please fill in all required fields", "error");
                return;
            }


            const dob = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const dobDate = new Date(dob);
            if (isNaN(dobDate.getTime())) {
                showToast("Please enter a valid date of birth", "error");
                return;
            }

            const phone = document.getElementById("student-phone").value.trim();
            const license = document.getElementById("license-number").value.trim();

            if (this.isEditMode) {
                await this.updateStudent(firstName, lastName, email, dob, phone, license);
            } else {
                await this.addStudent(firstName, lastName, email, dob, phone, license);
            }

        } catch (error) {
            console.error('Error saving student:', error);
            showToast(`Error ${this.isEditMode ? 'updating' : 'adding'} student: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async addStudent(firstName, lastName, email, dob, phone, license) {

        const { data: allStudents, error: fetchError } = await supabase.schema('api').rpc('get_students');

        if (fetchError) throw fetchError;

        let nextStudentNumber = 1;
        if (allStudents && allStudents.length > 0) {
            const numbers = allStudents
                .map(s => parseInt(s.student_number))
                .filter(n => !isNaN(n));
            if (numbers.length > 0) {
                nextStudentNumber = Math.max(...numbers) + 1;
            }
        }
        const calculatedStudentNumber = nextStudentNumber.toString().padStart(4, '0');


        const payload = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            date_of_birth: dob,
            student_number: calculatedStudentNumber,
            phone: phone,
            license_number: license,
            address: document.getElementById("student-address")?.value.trim(),
            license_type: document.getElementById("license-type")?.value.trim()
        };


        const { data: newStudent, error: createError } = await supabase.schema('api').rpc('insert_student', {
            payload: payload
        });

        if (createError) throw createError;


        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password.html'
            });

            if (resetError) {
                console.error("User created, but email failed:", resetError);
                showToast("Student saved, but Invite Email failed: " + resetError.message, "warning");
            } else {
                showToast("Student saved & Invite Email sent!", "success");
            }
        } catch (emailErr) {
            console.error("Unexpected email error:", emailErr);
            showToast("Student saved, but Invite Email failed.", "warning");
        }

        this.hide();

        if (this.onStudentSaved) {
            this.onStudentSaved();
        }
    }

    async updateStudent(firstName, lastName, email, dob, phone, license) {

        const address = document.getElementById("student-address")?.value.trim();
        const emergencyContact = document.getElementById("emergency-contact")?.value.trim();
        const emergencyPhone = document.getElementById("emergency-phone")?.value.trim();
        const membershipStatus = document.getElementById("membership-status")?.value;
        const licenseType = document.getElementById("license-type")?.value.trim();
        const licenseExpiry = document.getElementById("license-expiry")?.value;
        const medicalExpiry = document.getElementById("medical-expiry")?.value;


        const updateData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            date_of_birth: dob,
            phone: phone,
            license_number: license,
            updated_at: new Date().toISOString()
        };


        if (address !== undefined) updateData.address = address;
        if (emergencyContact !== undefined) updateData.emergency_contact_name = emergencyContact;
        if (emergencyPhone !== undefined) updateData.emergency_contact_phone = emergencyPhone;
        if (membershipStatus) updateData.membership_status = membershipStatus;
        if (licenseType !== undefined) updateData.license_type = licenseType;
        if (licenseExpiry) updateData.license_expiry = licenseExpiry;
        if (medicalExpiry) updateData.medical_expiry = medicalExpiry;


        Object.keys(updateData).forEach(key => {
            if (updateData[key] === '' || updateData[key] === null) {
                delete updateData[key];
            }
        });


        const { error } = await supabase.schema('api').rpc('update_student', {
            student_uuid: this.currentStudentId,
            payload: updateData
        });

        if (error) throw error;

        this.hide();
        showToast("Student updated successfully!", "success");


        if (this.onStudentSaved) {
            this.onStudentSaved();
        }
    }
}