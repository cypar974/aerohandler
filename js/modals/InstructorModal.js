// ./js/modals/InstructorModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";

export class InstructorModal {
    constructor() {
        this.modal = null;
        this.onInstructorSaved = null;
        this.isEditMode = false;
        this.currentInstructorId = null;
    }

    show(instructorData = null, onInstructorSaved = null) {
        this.onInstructorSaved = onInstructorSaved;
        this.isEditMode = !!instructorData;
        this.currentInstructorId = instructorData?.id || null;

        if (!this.modal) {
            this.createModal();
        }

        if (instructorData) {
            this.populateData(instructorData);
        } else {
            this.resetForm();
        }

        this.modal.classList.remove('hidden');
        setTimeout(() => {
            const firstInput = document.getElementById('instructor-first-name');
            if (firstInput) firstInput.focus();
        }, 50);
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetForm();
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'instructor-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        this.modal.innerHTML = `
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 id="instructor-modal-title" class="text-xl font-bold">Add New Instructor</h2>
                    <button id="close-instructor-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <form id="instructor-form" class="space-y-6">
                    <fieldset class="border border-gray-700 p-4 rounded-lg bg-gray-800">
                        <legend class="font-semibold text-gray-100 px-2">Instructor Details</legend>
                        <div class="space-y-4 mt-2">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
                                    <input type="text" id="instructor-first-name" placeholder="Enter first name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
                                    <input type="text" id="instructor-last-name" placeholder="Enter last name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                                <input type="email" id="instructor-email" placeholder="Enter email address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Ratings / Certifications</label>
                                <input type="text" id="instructor-ratings" placeholder="e.g., CFI, CFII, MEI" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-1">Total Flight Hours</label>
                                <input type="number" id="instructor-total-hours" step="0.1" min="0" placeholder="0.0" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </fieldset>

                    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button type="button" id="cancel-instructor-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span id="instructor-submit-text">Save Instructor</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('close-instructor-modal').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('cancel-instructor-btn').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('instructor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveInstructor();
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

    populateData(data) {
        const titleEl = document.getElementById('instructor-modal-title');
        const submitTextEl = document.getElementById('instructor-submit-text');

        if (titleEl) titleEl.textContent = 'Edit Instructor';
        if (submitTextEl) submitTextEl.textContent = 'Update Instructor';

        document.getElementById('instructor-first-name').value = data.first_name || '';
        document.getElementById('instructor-last-name').value = data.last_name || '';
        document.getElementById('instructor-email').value = data.email || '';
        document.getElementById('instructor-ratings').value = data.ratings || '';
        document.getElementById('instructor-total-hours').value = data.total_hours || '';
    }

    resetForm() {

        const titleEl = document.getElementById('instructor-modal-title');
        if (titleEl) titleEl.textContent = 'Add New Instructor';

        const submitTextEl = document.getElementById('instructor-submit-text');
        if (submitTextEl) submitTextEl.textContent = 'Save Instructor';

        const form = document.getElementById('instructor-form');
        if (form) form.reset();

        this.isEditMode = false;
        this.currentInstructorId = null;
    }

    async saveInstructor() {
        const submitBtn = document.querySelector('#instructor-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                ${this.isEditMode ? 'Updating...' : 'Saving...'}
            `;

            const firstName = document.getElementById("instructor-first-name").value.trim();
            const lastName = document.getElementById("instructor-last-name").value.trim();
            const email = document.getElementById("instructor-email").value.trim();
            const ratings = document.getElementById("instructor-ratings").value.trim();
            const totalHours = document.getElementById("instructor-total-hours").value;

            if (!firstName || !lastName || !email) {
                showToast("Please fill in all required fields", "error");
                return;
            }

            const payload = {
                first_name: firstName,
                last_name: lastName,
                email: email,
                ratings: ratings,
                total_hours: totalHours ? parseFloat(totalHours) : 0
            };

            if (this.isEditMode) {
                const { error } = await supabase.schema('api').rpc('update_instructor', {
                    instructor_uuid: this.currentInstructorId,
                    payload: payload
                });
                if (error) throw error;
                showToast("Instructor updated successfully!", "success");

            } else {
                const { error } = await supabase.schema('api').rpc('insert_instructor', {
                    payload: payload
                });
                if (error) throw error;

                try {
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/update-password.html'
                    });

                    if (resetError) {
                        console.error("User created, but email failed:", resetError);
                        showToast("Instructor saved, but Invite Email failed.", "warning");
                    } else {
                        showToast("Instructor saved & Invite Email sent!", "success");
                    }
                } catch (emailErr) {
                    console.error("Email error:", emailErr);
                }
            }

            this.hide();

            if (this.onInstructorSaved) {
                this.onInstructorSaved();
            }

        } catch (error) {
            console.error('Error saving instructor:', error);
            showToast(`Error ${this.isEditMode ? 'updating' : 'adding'} instructor: ${error.message}`, "error");
        } finally {

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}