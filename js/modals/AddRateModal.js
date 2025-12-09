// ./modals/AddRateModal.js
import { supabase } from "../../supabase.js";
import { showToast } from "../utils/showToast.js";

export class AddRateModal {
    constructor() {
        this.modal = null;
        this.onRateSaved = null;
        this.planesData = [];
    }

    show(onRateSaved = null, preSelectedAircraft = null, preSelectedType = null) {
        this.onRateSaved = onRateSaved;

        // Create modal if it doesn't exist
        if (!this.modal) {
            this.createModal();
        }

        // Reset form
        this.resetForm();

        // Pre-select values if provided
        if (preSelectedAircraft) {
            document.getElementById('add-rate-aircraft-model').value = preSelectedAircraft;
        }
        if (preSelectedType) {
            document.getElementById('add-rate-type').value = preSelectedType;
            // Trigger change event to show/hide name field
            document.getElementById('add-rate-type').dispatchEvent(new Event('change'));
        }

        this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetForm();
        }
    }

    async createModal() {
        await this.loadPlanes();

        this.modal = document.createElement('div');
        this.modal.id = 'add-rate-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        this.modal.innerHTML = `
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Add New Rate</h2>
                    <button id="close-add-rate-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form id="add-rate-form" class="space-y-4">
                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Aircraft Model</label>
                        <select id="add-rate-aircraft-model" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                            <option value="">Select Aircraft Model</option>
                            ${this.planesData.map(plane => `
                                <option value="${plane.model}">${plane.model}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Rate Type</label>
                        <select id="add-rate-type" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                            <option value="">Select Rate Type</option>
                            <option value="student_hourly">Student Hourly Rate</option>
                            <option value="instructor_hourly">Instructor Hourly Rate</option>
                            <option value="ground_instruction">Ground Instruction</option>
                            <option value="checkride_prep">Checkride Preparation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div id="add-rate-name-container" class="hidden">
                        <label class="block mb-1 text-sm font-medium text-gray-300">Rate Name</label>
                        <input type="text" id="add-rate-name" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Enter rate name" required>
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Amount ($)</label>
                        <input type="number" step="0.01" id="add-rate-amount" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Description</label>
                        <textarea id="add-rate-description" rows="3" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Optional description"></textarea>
                    </div>

                    <div class="flex items-center">
                        <input type="checkbox" id="add-rate-is-active" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" checked>
                        <label for="add-rate-is-active" class="ml-2 text-sm text-gray-300">Active Rate</label>
                    </div>

                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" id="cancel-add-rate" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors">
                            Create Rate
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    async loadPlanes() {
        try {
            const { data, error } = await supabase.from("planes").select("*");
            if (!error) {
                this.planesData = data || [];
            }
        } catch (error) {
            console.error('Error loading planes:', error);
        }
    }

    setupEventListeners() {
        // Close modal events
        document.getElementById('close-add-rate-modal').addEventListener('click', () => this.hide());
        document.getElementById('cancel-add-rate').addEventListener('click', () => this.hide());

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Rate type change handler
        document.getElementById('add-rate-type').addEventListener('change', (e) => {
            const showNameField = e.target.value === 'other';
            document.getElementById('add-rate-name-container').classList.toggle('hidden', !showNameField);

            // Make rate name required if type is 'other'
            const nameField = document.getElementById('add-rate-name');
            if (e.target.value === 'other') {
                nameField.required = true;
            } else {
                nameField.required = false;
            }
        });

        // Form submission
        document.getElementById('add-rate-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveRate();
        });
    }

    resetForm() {
        if (this.modal) {
            document.getElementById('add-rate-form').reset();
            document.getElementById('add-rate-name-container').classList.add('hidden');
            document.getElementById('add-rate-is-active').checked = true; // Default to active
        }
    }

    async saveRate() {
        try {
            const formData = {
                aircraft_type: document.getElementById('add-rate-aircraft-model').value,
                rate_type: document.getElementById('add-rate-type').value,
                amount: parseFloat(document.getElementById('add-rate-amount').value),
                description: document.getElementById('add-rate-description').value,
                is_active: document.getElementById('add-rate-is-active').checked
            };

            // Add rate name if type is 'other'
            if (formData.rate_type === 'other') {
                formData.rate_name = document.getElementById('add-rate-name').value;
            }

            const { error } = await supabase
                .from('billing_rates')
                .insert([formData]);

            if (error) {
                throw error;
            }

            showToast('Rate created successfully', 'success');
            this.hide();

            if (this.onRateSaved) {
                this.onRateSaved();
            }

        } catch (error) {
            console.error('Error creating rate:', error);
            showToast('Error creating rate: ' + error.message, 'error');
        }
    }
}
