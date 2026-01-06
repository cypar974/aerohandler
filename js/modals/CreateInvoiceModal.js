// ./modals/CreateInvoiceModal.js
import { supabase } from "../supabase.js";
import { CustomDatePicker } from "../components/customDatePicker.js";
import { setupPersonAutocomplete } from "../components/autocomplete.js";
import { showToast } from "../components/showToast.js";

export class CreateInvoiceModal {
    constructor() {
        this.modalId = 'invoice-modal';
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
            console.error('Error loading people from view:', error);
            this.peopleData = [];
        }
    }

    render() {
        if (document.getElementById(this.modalId)) return;

        const canCreateInvoice = true;


        const iconUser = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
        const iconDollar = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        const iconDesc = `<svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
        const iconClose = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

        const modalHTML = `
        <div id="${this.modalId}" class="hidden fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
            <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all max-h-[90vh] flex flex-col">
                
                <div class="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl">
                    <div>
                        <h2 class="text-2xl font-bold text-white tracking-tight">Create Invoice</h2>
                        <p class="text-sm text-gray-400 mt-1">Generate a new invoice for a member.</p>
                    </div>
                    <button type="button" class="text-gray-400 hover:text-white transition-colors focus:outline-none" onclick="document.getElementById('${this.modalId}').classList.add('hidden')">
                        ${iconClose}
                    </button>
                </div>

                <div class="p-6 overflow-y-auto custom-scrollbar">
                    <form id="invoice-form" class="space-y-6">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">Member</label>
                                <div class="relative">
                                    ${iconUser}
                                    <input type="text" id="invoice-person" 
                                        class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                                        placeholder="Search by name..." autocomplete="off">
                                    <input type="hidden" id="invoice-person-id">
                                    <input type="hidden" id="invoice-person-type">
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">Due Date</label>
                                <div class="relative">
                                    <input type="date" id="invoice-due-date" 
                                        class="w-full pl-4 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                                        required>
                                </div>
                            </div>
                        </div>
                        
                        <div id="person-details" class="hidden animate-fade-in-down">
                            <div class="flex items-center p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                                <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                                </div>
                                <div class="ml-4 grid grid-cols-2 gap-x-8 w-full">
                                    <div>
                                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</p>
                                        <p id="person-type" class="text-sm font-semibold text-white mt-0.5">Unknown</p>
                                    </div>
                                    <div>
                                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                                        <p id="person-email" class="text-sm text-gray-300 mt-0.5 truncate">Loading...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-300">Description</label>
                            <div class="relative">
                                ${iconDesc}
                                <input type="text" id="invoice-description" 
                                    class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                                    placeholder="e.g. Flight Instruction - 2 Hours" required>
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-300">Amount</label>
                            <div class="relative">
                                ${iconDollar}
                                <input type="number" id="invoice-amount" 
                                    class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                                    placeholder="0.00" step="0.01" min="0" required>
                            </div>
                        </div>

                    </form>
                </div>

                <div class="p-6 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total Amount</span>
                        <div class="text-2xl font-bold text-white font-mono tracking-tight">$<span id="invoice-total">0.00</span></div>
                    </div>
                    <div class="flex space-x-3">
                        <button type="button" id="cancel-invoice" class="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium transition-all duration-200 focus:ring-2 focus:ring-gray-600">
                            Cancel
                        </button>
                        ${canCreateInvoice ? `
                        <button type="submit" form="invoice-form" class="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium shadow-lg shadow-green-900/30 transition-all duration-200 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900">
                            Create Invoice
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
            document.getElementById('cancel-invoice')?.addEventListener('click', () => this.hide());
            document.getElementById('invoice-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
            document.getElementById('invoice-amount')?.addEventListener('input', () => this.updateInvoiceTotal());

            document.getElementById('invoice-person')?.addEventListener('input', (e) => {
                if (!e.target.value.trim()) {
                    this.hidePersonDetails();
                    document.getElementById('invoice-person-type').value = '';
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
            const dueDateInput = document.getElementById('invoice-due-date');
            if (dueDateInput) {
                this.datePicker = new CustomDatePicker(dueDateInput);
            }
        }
    }

    initializeAutocomplete() {
        if (!this.autocompleteInstance) {
            this.autocompleteInstance = setupPersonAutocomplete({
                inputId: 'invoice-person',
                hiddenId: 'invoice-person-id',
                peopleData: this.peopleData,
                roleFilter: 'all',
                onSelect: async (selected) => {


                    const fullPerson = this.peopleData.find(p => p.id === selected.id) || selected;


                    const type = fullPerson.type || 'other_person';
                    document.getElementById('invoice-person-type').value = type;


                    this.showPersonDetails(fullPerson, 'Loading email...');



                    const email = await this.fetchPersonEmail(fullPerson.id, type);


                    this.showPersonDetails(fullPerson, email);
                }
            });
        }
    }

    /**
     * Since 'get_members' view in SQL does NOT include email, we must fetch it 
     * using the specific secure RPCs for each table.
     */
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
        const detailsContainer = document.getElementById('person-details');
        const typeElement = document.getElementById('person-type');
        const emailElement = document.getElementById('person-email');

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
        document.getElementById('person-details')?.classList.add('hidden');
    }

    updateInvoiceTotal() {
        const amount = parseFloat(document.getElementById('invoice-amount').value) || 0;
        document.getElementById('invoice-total').textContent = amount.toFixed(2);
    }

    async show(params = {}) {
        if (!this.initialized) {
            await this.init();
        }

        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        document.getElementById('invoice-form').reset();
        this.hidePersonDetails();
        document.getElementById('invoice-person-id').value = '';
        document.getElementById('invoice-person-type').value = '';

        if (params.personId && params.personType) {
            this.prefillPerson(params.personId);
        } else if (params.studentId) {
            this.prefillPerson(params.studentId);
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('invoice-due-date').value = dueDate.toISOString().split('T')[0];
        document.getElementById('invoice-total').textContent = '0.00';
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
                document.getElementById('invoice-person').value = name;
                document.getElementById('invoice-person-id').value = person.id;
                document.getElementById('invoice-person-type').value = person.type;


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
        const personId = document.getElementById('invoice-person-id').value;
        const personType = document.getElementById('invoice-person-type').value;
        const dueDate = document.getElementById('invoice-due-date').value;
        const description = document.getElementById('invoice-description').value;
        const amount = parseFloat(document.getElementById('invoice-amount').value);

        if (!personId || !personType) {
            showToast('Please select a student or instructor', 'error');
            return;
        }
        if (!description.trim()) {
            showToast('Please enter an invoice description', 'error');
            return;
        }
        if (amount <= 0) {
            showToast('Please enter a valid amount greater than 0', 'error');
            return;
        }

        const invoiceNumber = 'INV-' + Date.now();
        const finalDescription = description || `Invoice ${invoiceNumber}`;

        try {
            await this.createFinancialTransaction(personId, personType, dueDate, finalDescription, amount);
            this.hide();
            document.dispatchEvent(new CustomEvent('invoiceCreated', {
                detail: {
                    invoice: { invoice_number: invoiceNumber, total_amount: amount },
                    personId,
                    personType
                }
            }));
            showToast('Invoice created successfully!', 'success');
        } catch (error) {
            console.error('Error creating invoice:', error);
            showToast('Error creating invoice: ' + error.message, 'error');
        }
    }

    async createFinancialTransaction(personId, personType, dueDate, description, amount) {
        let direction;
        let type;

        if (personType === 'student') {
            direction = 'receivable';
            type = 'other';
        } else if (personType === 'instructor') {
            direction = 'payable';
            type = 'instructor';
        } else {
            direction = 'payable';
            type = 'other';
        }

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