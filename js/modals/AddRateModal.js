import { supabase } from "../supabase.js";
import { showToast } from "../components/showToast.js";
import { Autocomplete } from "../components/autocomplete.js";

export class AddRateModal {
    constructor() {
        this.modal = null;
        this.onRateSaved = null;
        this.planesData = [];
        this.aircraftAutocomplete = null;
        this.editingRateId = null;
    }
    async show(onRateSaved = null, preSelectedAircraftId = null, preSelectedType = null, rateToEdit = null) {
        this.onRateSaved = onRateSaved;

        if (!this.modal) {
            await this.createModal();
        }


        this.resetForm();


        this.editingRateId = rateToEdit ? rateToEdit.id : null;


        if (rateToEdit) {
            this.setModalTitle('Edit Rate');
            this.populateForm(rateToEdit);
        }

        else {
            this.setModalTitle('Add New Rate');
            this.handleAddModePreselections(preSelectedAircraftId, preSelectedType);
        }

        this.modal.classList.remove('hidden');
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.resetForm();
            if (this.aircraftAutocomplete) {
                this.aircraftAutocomplete.hideSuggestions();
            }
        }
    }

    setModalTitle(title) {
        const titleEl = this.modal.querySelector('h2');
        if (titleEl) titleEl.textContent = title;


        const submitBtn = document.getElementById('submit-rate-btn');
        if (submitBtn) submitBtn.textContent = this.editingRateId ? 'Save Changes' : 'Create Rate';
    }

    async createModal() {
        await this.loadPlanes();

        this.modal = document.createElement('div');
        this.modal.id = 'add-rate-modal';
        this.modal.className = 'hidden fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300';

        this.modal.innerHTML = `
            <style>
                .no-spinner::-webkit-outer-spin-button,
                .no-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spinner {
                    -moz-appearance: textfield;
                }
            </style>

            <div class="bg-gray-800 border border-gray-700 text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
                
                <div class="flex justify-between items-center px-6 py-5 border-b border-gray-700 bg-gray-800/50 sticky top-0 z-10">
                    <div>
                        <h2 class="text-xl font-bold text-white tracking-wide">Manage Rate</h2>
                        <p class="text-xs text-gray-400 mt-1">Configure billing rates for aircraft usage</p>
                    </div>
                    <button id="close-add-rate-modal" class="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-full transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <form id="add-rate-form" class="p-6 space-y-6">
                    
                    <div class="relative">
                        <label class="block mb-1.5 text-sm font-medium text-gray-300">Aircraft Model</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </div>
                            <input type="text" 
                                   id="add-rate-aircraft-model-input" 
                                   class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors" 
                                   placeholder="Search aircraft model..." 
                                   autocomplete="off"
                                   required>
                            <input type="hidden" id="add-rate-aircraft-model-id" name="model_id">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div>
                            <label class="block mb-1.5 text-sm font-medium text-gray-300">Rate Type</label>
                            <div class="relative">
                                <select id="add-rate-type" class="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" required>
                                    <option value="" disabled selected>Select rate type</option>
                                    <option value="student_hourly">Student Hourly Rate</option>
                                    <option value="instructor_hourly">Instructor Hourly Rate</option>
                                    <option value="standard_hourly">Standard Member Rate</option>
                                    <option value="checkride_prep">Flight Examinator (FE)</option>
                                    <option value="other">Other / Custom</option>
                                </select>
                                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block mb-1.5 text-sm font-medium text-gray-300">Hourly Rate</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span class="text-gray-500 font-bold">€</span>
                                </div>
                                <input type="number" step="0.01" min="0" id="add-rate-amount" 
                                    class="no-spinner w-full pl-8 pr-12 py-2.5 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-colors" 
                                    placeholder="0.00"
                                    required>
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span class="text-gray-500 text-xs uppercase">EUR</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="add-rate-name-container" class="hidden bg-gray-700/30 p-4 rounded-lg border border-gray-600/50 border-dashed">
                        <label class="block mb-1.5 text-sm font-medium text-blue-300">Custom Rate Name</label>
                        <input type="text" id="add-rate-name" class="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:border-blue-500 focus:outline-none" placeholder="E.g., Special Event Rate">
                    </div>

                    <div>
                        <label class="block mb-1.5 text-sm font-medium text-gray-300">Description <span class="text-gray-500 font-normal text-xs">(Optional)</span></label>
                        <textarea id="add-rate-description" rows="3" class="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none" placeholder="Add notes about this rate..."></textarea>
                    </div>

                    <div class="pt-4 flex items-center justify-between border-t border-gray-700 mt-6">
                        <div class="flex space-x-3">
                            <button type="button" id="cancel-add-rate" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 border border-transparent hover:border-gray-600 transition-all">
                                Cancel
                            </button>
                            <button type="submit" id="submit-rate-btn" class="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all transform active:scale-95">
                                Create Rate
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupAutocomplete();
        this.setupEventListeners();
        this.modal.classList.remove('hidden');
    }

    async loadPlanes() {
        try {
            const { data, error } = await supabase.schema('api').rpc('get_plane_models');
            if (!error) {
                this.planesData = data || [];
                if (this.aircraftAutocomplete) {
                    this.aircraftAutocomplete.updateData(this.planesData);
                }
            }
        } catch (error) {
            console.error('Error loading plane models:', error);
        }
    }

    setupAutocomplete() {
        const inputElement = document.getElementById('add-rate-aircraft-model-input');
        const hiddenElement = document.getElementById('add-rate-aircraft-model-id');

        if (inputElement && hiddenElement) {
            this.aircraftAutocomplete = new Autocomplete({
                inputElement: inputElement,
                dataSource: this.planesData,
                displayField: 'model_name',
                valueField: 'id',
                placeholder: 'Search for Aircraft Model...',
                onSelect: (selected) => {
                    hiddenElement.value = selected.id;
                },
                onInput: (query) => {
                    if (!query.trim()) hiddenElement.value = "";
                }
            });
        }
    }

    setupEventListeners() {
        document.getElementById('close-add-rate-modal').addEventListener('click', () => this.hide());
        document.getElementById('cancel-add-rate').addEventListener('click', () => this.hide());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        document.getElementById('add-rate-type').addEventListener('change', (e) => {
            this.toggleRateNameField(e.target.value);
        });

        document.getElementById('add-rate-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveRate();
        });
    }

    toggleRateNameField(typeValue) {
        const showNameField = typeValue === 'other';
        const container = document.getElementById('add-rate-name-container');
        const nameField = document.getElementById('add-rate-name');

        container.classList.toggle('hidden', !showNameField);
        nameField.required = showNameField;
    }

    handleAddModePreselections(preSelectedAircraftId, preSelectedType) {

        if (preSelectedAircraftId) {
            const selectedPlane = this.planesData.find(p => p.id === preSelectedAircraftId);
            if (selectedPlane) {
                this.setAircraftSelection(selectedPlane.id, selectedPlane.model_name);
            }
        }


        if (preSelectedType) {
            const typeSelect = document.getElementById('add-rate-type');
            if (typeSelect) {
                typeSelect.value = preSelectedType;
                typeSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    populateForm(rate) {


        const modelId = rate.model_id;


        const model = this.planesData.find(m => m.id === modelId);
        const modelName = model ? model.model_name : (rate.model_name || '');

        if (modelId) {
            this.setAircraftSelection(modelId, modelName);
        }


        document.getElementById('add-rate-type').value = rate.rate_type;
        document.getElementById('add-rate-amount').value = rate.amount;
        document.getElementById('add-rate-description').value = rate.description || '';


        const typeSelect = document.getElementById('add-rate-type');


        const isStandardType = ['student_hourly', 'instructor_hourly', 'standard_hourly', 'checkride_prep'].includes(rate.rate_type);

        if (rate.rate_type === 'other' || (!isStandardType && rate.rate_name)) {
            typeSelect.value = 'other';
            document.getElementById('add-rate-name').value = rate.rate_name;
        } else {
            typeSelect.value = rate.rate_type;
            document.getElementById('add-rate-name').value = '';
        }


        this.toggleRateNameField(typeSelect.value);
    }

    setAircraftSelection(id, name) {
        document.getElementById('add-rate-aircraft-model-id').value = id;
        document.getElementById('add-rate-aircraft-model-input').value = name;
        if (this.aircraftAutocomplete) {
            this.aircraftAutocomplete.selectedItem = { id: id, value: name };
        }
    }

    resetForm() {
        if (this.modal) {
            document.getElementById('add-rate-form').reset();
            document.getElementById('add-rate-aircraft-model-id').value = '';
            document.getElementById('add-rate-name-container').classList.add('hidden');
            this.editingRateId = null;

            if (this.aircraftAutocomplete) {
                this.aircraftAutocomplete.selectedItem = null;
            }
        }
    }

    async saveRate() {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const modelId = document.getElementById('add-rate-aircraft-model-id').value;

            if (!modelId) {
                showToast('Please select a valid Aircraft Model', 'error');
                return;
            }

            const amountVal = parseFloat(document.getElementById('add-rate-amount').value);
            if (amountVal < 0) {
                showToast('Amount cannot be negative', 'error');
                return;
            }

            const typeSelect = document.getElementById('add-rate-type');
            const rateType = typeSelect.value;
            const rateNameInput = document.getElementById('add-rate-name').value;


            let finalRateName;
            if (rateType === 'other') {
                finalRateName = rateNameInput;
            } else {

                finalRateName = typeSelect.options[typeSelect.selectedIndex].text;
            }

            const payload = {
                model_id: modelId,
                rate_type: rateType,
                rate_name: finalRateName,
                amount: parseFloat(document.getElementById('add-rate-amount').value),
                description: document.getElementById('add-rate-description').value,
            };


            if (!this.editingRateId) {
                payload.created_by = user?.id || null;
            }

            let error;

            if (this.editingRateId) {

                const response = await supabase.schema('api').rpc('update_billing_rate', {
                    rate_uuid: this.editingRateId,
                    payload: payload
                });
                error = response.error;
            } else {

                const response = await supabase.schema('api').rpc('insert_billing_rate', { payload });
                error = response.error;
            }

            if (error) throw error;

            showToast(this.editingRateId ? 'Rate updated' : 'Rate created', 'success');
            this.hide();

            if (this.onRateSaved) {
                this.onRateSaved();
            }

        } catch (error) {
            console.error('Error saving rate:', error);
            showToast('Error saving rate: ' + error.message, 'error');
        }
    }
}
