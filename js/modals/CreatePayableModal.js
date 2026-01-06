import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { showToast } from "../components/showToast.js";

export class CreatePayableModal {
    constructor() {
        this.modalId = 'payable-modal';
        this.peopleData = [];
        this.onCloseCallback = null;
        this.datePicker = null;
        this.autocompleteInstance = null;
        this.listenersSetup = false;
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise(async (resolve) => {
            await this.loadPeople();
            this.render();
            this.setupEventListeners();
            this.initialized = true;
            resolve();
        });

        return this.initPromise;
    }


    async loadPeople() {
        try {
            const { data, error } = await supabase.schema('api').rpc('get_members');

            if (error) throw error;

            this.peopleData = data || [];

        } catch (error) {
            console.error('Error loading people for payables:', error);
            this.peopleData = [];
        }
    }

    render() {
        if (document.getElementById(this.modalId)) return;


        const canCreatePayable = true;



        const iconUser = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
        const iconDollar = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        const iconDesc = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
        const iconClose = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

        const modalHTML = `
        <div id="${this.modalId}" class="hidden fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
            <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all max-h-[90vh] flex flex-col">
                
                <div class="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl">
                    <div>
                        <h2 class="text-2xl font-bold text-white tracking-tight">Create Payable (Bill)</h2>
                        <p class="text-sm text-gray-400 mt-1">Record a payment owed to a vendor or instructor.</p>
                    </div>
                    <button type="button" class="text-gray-400 hover:text-white transition-colors focus:outline-none" onclick="document.getElementById('${this.modalId}').classList.add('hidden')">
                        ${iconClose}
                    </button>
                </div>

                <div class="p-6 overflow-y-auto custom-scrollbar">
                    <form id="payable-form" class="space-y-6">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">Payee</label>
                                <div class="relative">
                                    ${iconUser}
                                    <input type="text" id="payable-person" 
                                        class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none" 
                                        placeholder="Type name (e.g. Instructor)..." autocomplete="off">
                                    <input type="hidden" id="payable-person-id">
                                    <input type="hidden" id="payable-person-type">
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">Due Date</label>
                                <div class="relative">
                                    <input type="date" id="payable-due-date" 
                                        class="w-full pl-4 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none" 
                                        required>
                                </div>
                            </div>
                        </div>
                        
                        <div id="payable-person-details" class="hidden animate-fade-in-down">
                            <div class="flex items-center p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                                <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 border border-red-500/20">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                                </div>
                                <div class="ml-4 grid grid-cols-2 gap-x-8 w-full">
                                    <div>
                                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</p>
                                        <p id="payable-details-type" class="text-sm font-semibold text-white mt-0.5">Unknown</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                                        <p id="payable-details-email" class="text-sm text-gray-300 mt-0.5 truncate">Loading...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-300">Description</label>
                            <div class="relative">
                                ${iconDesc}
                                <input type="text" id="payable-description" 
                                    class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none" 
                                    placeholder="e.g. Flight Instruction Services" required>
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-300">Amount</label>
                            <div class="relative">
                                ${iconDollar}
                                <input type="number" id="payable-amount" 
                                    class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none" 
                                    placeholder="0.00" step="0.01" min="0" required>
                            </div>
                        </div>

                    </form>
                </div>

                <div class="p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total Payable</span>
                        <div class="text-2xl font-bold text-white font-mono tracking-tight">$<span id="payable-total">0.00</span></div>
                    </div>
                    <div class="flex space-x-3">
                        <button type="button" id="cancel-payable" class="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-600">
                            Cancel
                        </button>
                        ${canCreatePayable ? `
                        <button type="submit" form="payable-form" class="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg shadow-red-900/30 transition-all duration-200 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900">
                            Create Payable
                        </button>` : ''}
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-down {
                animation: fadeInDown 0.3s ease-out forwards;
            }
        </style>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        if (!this.listenersSetup) {
            document.getElementById('cancel-payable')?.addEventListener('click', () => this.hide());
            document.getElementById('payable-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

            document.getElementById('payable-amount')?.addEventListener('input', () => this.updateTotal());


            document.getElementById('payable-person')?.addEventListener('input', (e) => {
                if (!e.target.value.trim()) {
                    this.hidePersonDetails();
                    document.getElementById('payable-person-type').value = '';
                }
            });


            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hide();
            });

            document.getElementById(this.modalId)?.addEventListener('click', (e) => {
                if (e.target.id === this.modalId) this.hide();
            });

            this.listenersSetup = true;
        }

        this.initializeDatePicker();
        this.initializeAutocomplete();
    }

    initializeDatePicker() {
        if (!this.datePicker) {
            const dueDateInput = document.getElementById('payable-due-date');
            if (dueDateInput) {
                this.datePicker = new CustomDatePicker(dueDateInput);
            }
        }
    }

    initializeAutocomplete() {
        if (!this.autocompleteInstance) {
            this.autocompleteInstance = setupPersonAutocomplete({
                inputId: 'payable-person',
                hiddenId: 'payable-person-id',
                peopleData: this.peopleData,
                roleFilter: 'all',
                onSelect: async (selected) => {

                    const fullPerson = this.peopleData.find(p => p.id === selected.id) || selected;


                    const type = fullPerson.type || 'other_person';
                    document.getElementById('payable-person-type').value = type;


                    this.showPersonDetails(fullPerson, 'Loading email...');


                    const email = await this.fetchPersonEmail(fullPerson.id, type);


                    this.showPersonDetails(fullPerson, email);
                }
            });
        }
    }
    async fetchPersonEmail(id, type) {
        try {
            let rpcName = '';
            let paramName = '';

            switch (type) {
                case 'student':
                    rpcName = 'get_student_by_id'; paramName = 'student_uuid'; break;
                case 'instructor':
                    rpcName = 'get_instructor_by_id'; paramName = 'instructor_uuid'; break;
                case 'regular_pilot':
                    rpcName = 'get_regular_pilot_by_id'; paramName = 'pilot_uuid'; break;
                case 'maintenance_technician':
                    rpcName = 'get_maintenance_technician_by_id'; paramName = 'technician_uuid'; break;
                case 'other_person':
                    rpcName = 'get_other_person_by_id'; paramName = 'person_uuid'; break;
                default: return 'No email available';
            }

            const params = {};
            params[paramName] = id;

            const { data, error } = await supabase.schema('api').rpc(rpcName, params);

            if (error || !data || data.length === 0) return 'No email found';
            return data[0].email;

        } catch (e) {
            console.error("Error fetching email", e);
            return 'Error loading email';
        }
    }

    showPersonDetails(person, emailOverride = null) {
        const detailsContainer = document.getElementById('payable-person-details');
        const typeElement = document.getElementById('payable-details-type');
        const emailElement = document.getElementById('payable-details-email');

        if (detailsContainer && typeElement && emailElement) {
            const typeRaw = person.type || '';
            const typeDisplay = typeRaw ? typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).replace('_', ' ') : 'Unknown';

            typeElement.textContent = typeDisplay;

            if (emailOverride) {
                emailElement.textContent = emailOverride;
            } else {
                emailElement.textContent = person.email || 'No email loaded';
            }

            detailsContainer.classList.remove('hidden');
        }
    }

    hidePersonDetails() {
        document.getElementById('payable-person-details')?.classList.add('hidden');
    }

    updateTotal() {
        const amount = parseFloat(document.getElementById('payable-amount').value) || 0;
        document.getElementById('payable-total').textContent = amount.toFixed(2);
    }

    async show(params = {}) {
        if (!this.initialized) {
            await this.init();
        }

        const modal = document.getElementById(this.modalId);
        if (!modal) return;


        document.getElementById('payable-form').reset();
        this.hidePersonDetails();
        document.getElementById('payable-person-id').value = '';
        document.getElementById('payable-person-type').value = '';


        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('payable-due-date').value = dueDate.toISOString().split('T')[0];
        document.getElementById('payable-total').textContent = '0.00';


        if (params.personId) {
            this.prefillPerson(params.personId);
        }

        this.datePicker?.updateDisplay();
        modal.classList.remove('hidden');
    }

    async prefillPerson(personId) {
        try {
            let person = this.peopleData.find(p => p.id === personId);


            if (!person) {
                const { data, error } = await supabase.schema('api').rpc('get_members');
                if (!error && data) {
                    person = data.find(p => p.id === personId);
                    if (person) {
                        this.peopleData.push(person);
                        this.autocompleteInstance?.updateData(
                            this.peopleData.map(p => ({
                                id: p.id,
                                name: `${p.first_name} ${p.last_name}`,
                                type: p.type
                            }))
                        );
                    }
                }
            }

            if (person) {
                const name = `${person.first_name} ${person.last_name}`;
                document.getElementById('payable-person').value = name;
                document.getElementById('payable-person-id').value = person.id;
                document.getElementById('payable-person-type').value = person.type;


                this.showPersonDetails(person, 'Loading email...');
                const email = await this.fetchPersonEmail(person.id, person.type);
                this.showPersonDetails(person, email);
            }
        } catch (error) {
            console.error('Error pre-filling person:', error);
        }
    }

    hide() {
        document.getElementById(this.modalId)?.classList.add('hidden');
        this.onCloseCallback?.();
    }

    destroy() {
        this.datePicker?.destroy();
        this.autocompleteInstance?.destroy();
        document.getElementById(this.modalId)?.remove();
        this.peopleData = [];
        this.onCloseCallback = null;
        this.listenersSetup = false;
        this.datePicker = null;
        this.autocompleteInstance = null;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const personId = document.getElementById('payable-person-id').value;
        const personType = document.getElementById('payable-person-type').value;
        const dueDate = document.getElementById('payable-due-date').value;
        const description = document.getElementById('payable-description').value;
        const amount = parseFloat(document.getElementById('payable-amount').value);

        if (!personId) {
            showToast('Please select a payee', 'error');
            return;
        }

        if (!description.trim()) {
            showToast('Please enter a description', 'error');
            return;
        }

        if (amount <= 0) {
            showToast('Amount must be greater than 0', 'error');
            return;
        }

        try {
            await this.createFinancialTransaction(personId, personType, dueDate, description, amount);

            this.hide();


            document.dispatchEvent(new CustomEvent('payableCreated', {
                detail: {
                    amount: amount,
                    personId,
                    description
                }
            }));

            showToast('Payable created successfully!', 'success');

        } catch (error) {
            console.error('Error creating payable:', error);
            showToast('Error creating payable: ' + error.message, 'error');
        }
    }

    async createFinancialTransaction(personId, personType, dueDate, description, amount) {


        const direction = 'payable';


        let type = 'other';
        if (personType === 'instructor') type = 'instructor';
        if (personType === 'maintenance_technician') type = 'maintenance';

        const payload = {
            transaction_direction: direction,
            transaction_type: type,
            person_id: personId,
            amount: amount,
            due_date: dueDate,
            description: description,
            status: 'pending'
        };

        const { data, error } = await supabase.schema('api').rpc('insert_financial_transaction', { payload });

        if (error) throw error;
        return data;
    }
}