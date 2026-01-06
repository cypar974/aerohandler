// ./modals/EditRateModal.js
import { supabase } from "../supabase.js";
import { showToast } from "../utils/showToast.js";
import { Autocomplete } from "../js/components/autocomplete.js";

export class EditRateModal {
    constructor() {
        this.modal = null;
        this.onRateSaved = null;
        this.currentRateId = null;
        this.planesData = [];
        this.modelAutocomplete = null;
    }

    show(rateData, onRateSaved = null) {
        this.onRateSaved = onRateSaved;
        this.currentRateId = rateData?.id || null;


        if (!this.modal) {
            this.createModal().then(() => {
                if (rateData) {
                    this.populateData(rateData);
                }
                this.modal.classList.remove('hidden');
            });
        } else {

            this.loadPlaneModels().then(() => {
                if (this.modelAutocomplete) {
                    this.modelAutocomplete.updateData(this.planesData);
                }
                if (rateData) {
                    this.populateData(rateData);
                }
                this.modal.classList.remove('hidden');
            });
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetForm();
        }
    }

    async createModal() {

        await this.loadPlaneModels();

        this.modal = document.createElement('div');
        this.modal.id = 'edit-rate-modal';
        this.modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        const canEdit = true;

        this.modal.innerHTML = `
            <div class="bg-gray-900 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold">Edit Rate</h2>
                    <button id="close-edit-rate-modal" class="text-gray-400 hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form id="edit-rate-form" class="space-y-4">
                    <input type="hidden" id="edit-rate-id">
                    
                    <div class="relative">
                        <label class="block mb-1 text-sm font-medium text-gray-300">Aircraft Model</label>
                        <input type="text" 
                               id="edit-rate-aircraft-model-input" 
                               class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" 
                               placeholder="Search Aircraft Model..." 
                               autocomplete="off">
                        <input type="hidden" id="edit-rate-aircraft-model" required>
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Rate Type</label>
                        <select id="edit-rate-type" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                            <option value="">Select Rate Type</option>
                            <option value="student_hourly">Student Hourly Rate</option>
                            <option value="instructor_hourly">Instructor Hourly Rate</option>
                            <option value="ground_instruction">Ground Instruction</option>
                            <option value="checkride_prep">Checkride Preparation</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div id="edit-rate-name-container" class="hidden">
                        <label class="block mb-1 text-sm font-medium text-gray-300">Rate Name</label>
                        <input type="text" id="edit-rate-name" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Enter rate name">
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Amount ($)</label>
                        <input type="number" step="0.01" id="edit-rate-amount" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" required>
                    </div>

                    <div>
                        <label class="block mb-1 text-sm font-medium text-gray-300">Description</label>
                        <textarea id="edit-rate-description" rows="3" class="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Optional description"></textarea>
                    </div>

                    <div class="flex items-center">
                        <input type="checkbox" id="edit-rate-is-active" class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500">
                        <label for="edit-rate-is-active" class="ml-2 text-sm text-gray-300">Active Rate</label>
                    </div>

                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" id="cancel-edit-rate" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors">
                            Cancel
                        </button>
                        ${canEdit ? `
                        <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                            Update Rate
                        </button>
                        ` : ''}
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);


        this.setupAutocomplete();
        this.setupEventListeners();
    }

    async loadPlaneModels() {
        try {
            const { data, error } = await supabase.schema('api').rpc('get_plane_models');
            if (!error) {
                this.planesData = data || [];
            } else {
                console.error('Error loading plane models:', error);
            }
        } catch (error) {
            console.error('Error loading plane models:', error);
        }
    }

    setupAutocomplete() {
        const inputElement = document.getElementById('edit-rate-aircraft-model-input');
        const hiddenElement = document.getElementById('edit-rate-aircraft-model');

        if (!inputElement) return;

        this.modelAutocomplete = new Autocomplete({
            inputElement: inputElement,
            dataSource: this.planesData,
            allowedTypes: null,
            displayField: 'model_name',
            valueField: 'id',
            additionalFields: [],
            placeholder: 'Search Aircraft Model...',
            onSelect: (selected) => {
                if (hiddenElement) {
                    hiddenElement.value = selected.id;
                }
            },
            onInput: (query) => {

                if (!query.trim() && hiddenElement) {
                    hiddenElement.value = "";
                }
            }
        });
    }

    setupEventListeners() {
        document.getElementById('close-edit-rate-modal').addEventListener('click', () => this.hide());
        document.getElementById('cancel-edit-rate').addEventListener('click', () => this.hide());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        document.getElementById('edit-rate-type').addEventListener('change', (e) => {
            const showNameField = e.target.value === 'other';
            document.getElementById('edit-rate-name-container').classList.toggle('hidden', !showNameField);
        });

        document.getElementById('edit-rate-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveRate();
        });
    }

    populateData(rateData) {
        document.getElementById('edit-rate-id').value = rateData.id || '';


        const modelId = rateData.model_id || '';
        document.getElementById('edit-rate-aircraft-model').value = modelId;


        if (modelId && this.planesData.length > 0) {
            const selectedModel = this.planesData.find(p => p.id === modelId);
            if (selectedModel) {
                document.getElementById('edit-rate-aircraft-model-input').value = selectedModel.model_name;
            } else {
                document.getElementById('edit-rate-aircraft-model-input').value = 'Unknown Model';
            }
        } else {
            document.getElementById('edit-rate-aircraft-model-input').value = '';
        }

        document.getElementById('edit-rate-type').value = rateData.rate_type || '';
        document.getElementById('edit-rate-amount').value = rateData.amount || '';
        document.getElementById('edit-rate-description').value = rateData.description || '';
        document.getElementById('edit-rate-is-active').checked = rateData.is_active !== false;

        if (rateData.rate_type === 'other') {
            document.getElementById('edit-rate-name').value = rateData.rate_name || '';
            document.getElementById('edit-rate-name-container').classList.remove('hidden');
        }

        document.getElementById('edit-rate-type').dispatchEvent(new Event('change'));
    }

    resetForm() {
        if (this.modal) {
            document.getElementById('edit-rate-form').reset();
            document.getElementById('edit-rate-name-container').classList.add('hidden');

            document.getElementById('edit-rate-aircraft-model').value = '';
        }
    }

    async saveRate() {
        try {

            const modelId = document.getElementById('edit-rate-aircraft-model').value;

            const payload = {
                model_id: modelId || null,
                rate_type: document.getElementById('edit-rate-type').value,
                amount: parseFloat(document.getElementById('edit-rate-amount').value),
                description: document.getElementById('edit-rate-description').value,
                is_active: document.getElementById('edit-rate-is-active').checked,
                rate_name: document.getElementById('edit-rate-name').value
            };

            if (payload.rate_type !== 'other') {
                const typeSelect = document.getElementById('edit-rate-type');
                const selectedText = typeSelect.options[typeSelect.selectedIndex].text;
                payload.rate_name = selectedText;
            }


            if (!payload.model_id) {
                showToast('Please select a valid Aircraft Model from the list', 'error');
                return;
            }

            const { error } = await supabase.schema('api').rpc('update_billing_rate', {
                rate_uuid: this.currentRateId,
                payload: payload
            });

            if (error) {
                throw error;
            }

            showToast('Rate updated successfully', 'success');
            this.hide();

            if (this.onRateSaved) {
                this.onRateSaved();
            }

        } catch (error) {
            console.error('Error updating rate:', error);
            showToast('Error updating rate: ' + error.message, 'error');
        }
    }
}