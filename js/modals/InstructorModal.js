// ./modals/InstructorModal.js
import { supabase } from "../../supabase.js";

export class InstructorModal {
    constructor() {
        this.modalId = 'instructor-modal';
        this.init();
    }

    init() {
        // Modal will be created when first opened
    }

    async open(instructor = null) {
        // Create modal if it doesn't exist
        if (!document.getElementById(this.modalId)) {
            this.createModal();
        }

        const modal = document.getElementById(this.modalId);
        const title = document.getElementById("modal-title");
        const form = document.getElementById("add-instructor-form");

        if (instructor) {
            title.textContent = "Edit Instructor";
            document.getElementById("instructor-id").value = instructor.id;
            document.getElementById("instructor-first-name").value = instructor.first_name || "";
            document.getElementById("instructor-last-name").value = instructor.last_name || "";
            document.getElementById("instructor-email").value = instructor.email || "";
            document.getElementById("instructor-ratings").value = instructor.ratings || "";
            document.getElementById("instructor-total-hours").value = instructor.total_hours || "";
        } else {
            title.textContent = "Add New Instructor";
            form.reset();
            document.getElementById("instructor-id").value = "";
        }

        modal.classList.remove("hidden");
        document.getElementById("instructor-first-name").focus();

        // Return promise that resolves when modal is closed
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add("hidden");
        }
        if (this.resolvePromise) {
            this.resolvePromise();
        }
    }

    createModal() {
        const modalHTML = `
            <div id="${this.modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50 p-4">
                <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold" id="modal-title">Add New Instructor</h2>
                        <button id="modal-close-btn" class="text-gray-400 hover:text-white transition-colors duration-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form id="add-instructor-form" class="space-y-4">
                        <input type="hidden" id="instructor-id">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                                <input type="text" id="instructor-first-name" placeholder="Enter first name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                                <input type="text" id="instructor-last-name" placeholder="Enter last name" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                            <input type="email" id="instructor-email" placeholder="Enter email address" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Ratings & Certifications</label>
                            <input type="text" id="instructor-ratings" placeholder="e.g., CFI, CFII, MEI, ATP" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                            <p class="text-xs text-gray-400 mt-1">Separate multiple ratings with commas</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Total Flight Hours</label>
                            <input type="number" id="instructor-total-hours" placeholder="Enter total hours" step="0.1" min="0" class="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                        </div>
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" id="cancel-btn" class="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium">Cancel</button>
                            <button type="submit" id="save-btn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors duration-200 font-medium flex items-center gap-2">
                                <span>Save Instructor</span>
                                <svg id="save-spinner" class="w-4 h-4 hidden animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById("modal-close-btn").addEventListener("click", () => this.close());
        document.getElementById("cancel-btn").addEventListener("click", () => this.close());

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });

        document.getElementById("add-instructor-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.saveInstructor();
        });

        // Close modal on backdrop click
        document.getElementById(this.modalId).addEventListener("click", (e) => {
            if (e.target.id === this.modalId) this.close();
        });
    }

    async saveInstructor() {
        const saveBtn = document.getElementById("save-btn");
        const spinner = document.getElementById("save-spinner");
        const instructorId = document.getElementById("instructor-id").value;

        const instructorData = {
            first_name: document.getElementById("instructor-first-name").value.trim(),
            last_name: document.getElementById("instructor-last-name").value.trim(),
            email: document.getElementById("instructor-email").value.trim(),
            ratings: document.getElementById("instructor-ratings").value.trim(),
            total_hours: parseFloat(document.getElementById("instructor-total-hours").value) || 0
        };

        if (!instructorData.first_name || !instructorData.last_name || !instructorData.email) {
            this.showToast("Please fill in all required fields", "error");
            return;
        }

        // Show loading state
        saveBtn.disabled = true;
        spinner.classList.remove("hidden");
        saveBtn.innerHTML = `<span>Saving...</span>${spinner.outerHTML}`;

        try {
            let error;
            if (instructorId) {
                // Update existing instructor
                const { error: updateError } = await supabase
                    .from("instructors")
                    .update(instructorData)
                    .eq("id", instructorId);
                error = updateError;
            } else {
                // Insert new instructor
                const { error: insertError } = await supabase
                    .from("instructors")
                    .insert([instructorData]);
                error = insertError;
            }

            if (!error) {
                this.showToast(`Instructor ${instructorId ? 'updated' : 'added'} successfully!`, "success");
                this.close();
                // Trigger custom event for page refresh
                document.dispatchEvent(new CustomEvent('instructorSaved'));
            } else {
                throw error;
            }
        } catch (error) {
            console.error('Error saving instructor:', error);
            this.showToast(`Error ${instructorId ? 'updating' : 'adding'} instructor: ${error.message}`, "error");
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            spinner.classList.add("hidden");
            saveBtn.innerHTML = `<span>Save Instructor</span>${spinner.outerHTML}`;
        }
    }

    showToast(message, type = "success") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "fixed top-4 right-4 z-50 space-y-2";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 transform transition-all duration-300 translate-x-full`;

        const icon = type === "success" ?
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` :
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="${type === "success" ? "text-green-400" : "text-red-400"}">${icon}</div>
                <div>${message}</div>
            </div>
        `;

        toast.style.backgroundColor = type === "success" ? "#059669" : "#dc2626";
        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove("translate-x-full");
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add("translate-x-full");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}